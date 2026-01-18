import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bullmq'
import { BuildKnowledgeDB } from '../dtos/build-knowledge-db.dto'
import { CreateKnowledgeSourceProvider } from '../../knowledge-source/application/create-knowledge-source.provider'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { PuppeteerWebBaseLoader } from '@langchain/community/document_loaders/web/puppeteer'
import { GetEmbeddingProvider } from './get-embedding.provider'
import { CreateKnowledgeChunksProvider } from '../../knowledge-source/application/create-knowledge-chunks.provider'
import { SourceType } from '../../knowledge-source/enums/source_type.enum'
import { KnowledgeChunk } from '../../knowledge-source/schemas/knowledge-chunk.schema'
import { KnowledgeSource } from '../../knowledge-source/schemas/knowledge-source.schema'
import {
    SearchOptions,
    SearchSimilarDocumentsProvider
} from '../../knowledge-source/application/search-similar-documents.provider'
import { UploadManyFilesProvider } from '../../upload-files/providers/upload-many-files.provider'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { Canvas, createCanvas, Image } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as pdfPoppler from 'pdf-poppler'
import * as Tesseract from 'tesseract.js'
import { UploadFileTypes } from '../../upload-files/enum/upload-files.type.enum'
import { CreateKnowledgeChunkDto } from '../../knowledge-source/dto/create-knowledge-chunk.dto'
import { ChatbotGateway } from '../gateways/chatbot.gateway'
import { ProcessingStatus } from '../../knowledge-source/enums/processing-status.enum'

// NodeCanvasFactory để làm cầu nối giữa pdfjs và node-canvas

@Injectable()
export class RetrievalProvider {
    constructor(
        private readonly getEmbeddingProvider: GetEmbeddingProvider,
        private readonly knowledgeChunksProvider: CreateKnowledgeChunksProvider,
        private readonly knowledgeSourceProvider: CreateKnowledgeSourceProvider,
        private readonly searchSimilarDocumentsProvider: SearchSimilarDocumentsProvider,
        @InjectQueue('knowledge-processing') private readonly knowledgeQueue: Queue,
        private readonly uploadManyFilesProvider: UploadManyFilesProvider,
        private readonly chatbotGateway: ChatbotGateway
    ) {}

    /**
     * Phát hiện loại PDF: text-based hoặc scanned
     */
    private async detectPDFType(pdfBuffer: Buffer): Promise<'text' | 'scanned'> {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise
        const page = await pdf.getPage(1)
        const textContent = await page.getTextContent()

        // Nếu có ít hơn 25 ký tự trong trang đầu → PDF scanned
        return textContent.items.length < 10 ? 'scanned' : 'text'
    }

    /**
     * Xử lý PDF text-based bằng PDFLoader
     */
    private async extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
        // Convert Node.js Buffer to Uint8Array for Blob compatibility
        const loader = new PDFLoader(new Blob([new Uint8Array(fileBuffer)]))
        const docs = await loader.load()
        return docs.map((doc) => doc.pageContent).join('\n\n')
    }

    /**
     * Xử lý PDF scanned bằng OCR (Tesseract)
     * Uses pdf-poppler to convert PDF to images and tesseract.js for OCR
     */
    async extractFromScannedPdf(buffer: Buffer): Promise<string> {
        // Sử dụng system temp directory để tránh vấn đề với Unicode trong đường dẫn
        const tempDir = path.join(os.tmpdir(), 'pdf-ocr', Date.now().toString())

        try {
            // Tạo thư mục tạm
            fs.mkdirSync(tempDir, { recursive: true })

            // Lưu PDF vào file tạm
            const pdfPath = path.join(tempDir, 'input.pdf')
            fs.writeFileSync(pdfPath, buffer)

            // Cấu hình pdf-poppler để convert PDF sang PNG
            const options = {
                format: 'png',
                out_dir: tempDir,
                out_prefix: 'page',
                page: null // Convert all pages
            }

            // Convert PDF thành images
            await pdfPoppler.convert(pdfPath, options)

            // Khởi tạo Tesseract worker với tiếng Việt và tiếng Anh
            const worker = await Tesseract.createWorker(['vie', 'eng'])
            let extractedText = ''

            // Đọc tất cả file PNG được tạo ra
            const imageFiles = fs
                .readdirSync(tempDir)
                .filter((file) => file.endsWith('.png'))
                .sort() // Sắp xếp theo thứ tự trang

            console.log(`Found ${imageFiles.length} pages to process`)

            // OCR từng ảnh
            for (const imageFile of imageFiles) {
                const imagePath = path.join(tempDir, imageFile)
                console.log(`Processing: ${imageFile}`)

                const { data } = await worker.recognize(imagePath)
                extractedText += data.text + '\n\n'
            }

            // Dọn dẹp
            await worker.terminate()

            return extractedText.trim()
        } catch (error) {
            console.error('Error in extractFromScannedPdf:', error)
            throw new BadRequestException(`Failed to extract text from scanned PDF: ${error.message}`)
        } finally {
            // Đảm bảo xóa thư mục tạm dù có lỗi hay không
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true })
            }
        }
    }

    /**
     * Trích xuất, phân mảnh, embedding và lưu trữ knowledge từ file upload
     */
    private async processFileToChunks(file: Express.Multer.File, knowledgeSourceIdLocal: string): Promise<void> {
        try {
            // Lấy knowledge source để biết source_type
            const knowledgeSource = await this.knowledgeSourceProvider.getKnowledgeSourceById(knowledgeSourceIdLocal)
            if (!knowledgeSource) {
                throw new BadRequestException('Knowledge source not found')
            }

            // Emit crawling progress
            this.chatbotGateway.emitCrawlProgress({
                resourceId: knowledgeSourceIdLocal,
                status: 'crawling',
                progress: 10,
                message: 'Đang trích xuất nội dung từ file...'
            })

            // Cập nhật processing status
            await this.knowledgeSourceProvider.updateKnowledgeSourceStatus(
                knowledgeSourceIdLocal,
                ProcessingStatus.PENDING
            )

            let extractedText = ''

            if (file.mimetype === 'application/pdf') {
                const pdfType = await this.detectPDFType(file.buffer)
                console.log('Detected PDF type:', pdfType)

                this.chatbotGateway.emitCrawlProgress({
                    resourceId: knowledgeSourceIdLocal,
                    status: 'crawling',
                    progress: 30,
                    message: `Đang xử lý PDF ${pdfType}...`
                })

                if (pdfType === 'text') {
                    extractedText = await this.extractTextFromPDF(file.buffer)
                } else {
                    extractedText = await this.extractFromScannedPdf(file.buffer)
                }
            } else if (file.mimetype.startsWith('image/')) {
                // Xử lý ảnh trực tiếp
                this.chatbotGateway.emitCrawlProgress({
                    resourceId: knowledgeSourceIdLocal,
                    status: 'crawling',
                    progress: 30,
                    message: 'Đang nhận dạng OCR cho ảnh...'
                })

                const worker = await Tesseract.createWorker('vie+eng')
                const { data } = await worker.recognize(file.buffer)
                await worker.terminate()
                extractedText = data.text
            }

            console.log('Extracted Text:', extractedText.slice(0, 500))
            const wordCount = extractedText.split(/\s+/).length

            this.chatbotGateway.emitCrawlProgress({
                resourceId: knowledgeSourceIdLocal,
                status: 'crawling',
                progress: 50,
                message: `Đã trích xuất ${wordCount} từ. Đang phân chia chunks...`
            })

            // 4. Split text thành chunks
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1024,
                chunkOverlap: 100,
                separators: ['\n\n', '\n', '. ']
            })
            const chunks = await splitter.splitText(extractedText)

            this.chatbotGateway.emitCrawlCompleted({
                resourceId: knowledgeSourceIdLocal,
                status: 'completed',
                progress: 60,
                message: `Đã tạo ${chunks.length} chunks. Bắt đầu embedding...`
            })

            // 5. Embedding và lưu chunks (batch processing)
            this.chatbotGateway.emitEmbeddingProgress({
                resourceId: knowledgeSourceIdLocal,
                status: 'embedding',
                progress: 60,
                message: `Đang tạo embedding cho ${chunks.length} chunks...`
            })

            const knowledgeChunks: CreateKnowledgeChunkDto[] = []
            let processedChunks = 0

            for (const chunk of chunks) {
                const vector = await this.getEmbeddingProvider.getEmbedding(chunk)
                knowledgeChunks.push({
                    source_id: knowledgeSourceIdLocal,
                    source_type: knowledgeSource.source_type, // Lưu source_type vào chunk
                    text: chunk,
                    plot_embedding_gemini_large: vector
                })

                processedChunks++
                const embeddingProgress = 60 + (processedChunks / chunks.length) * 30

                if (processedChunks % 5 === 0 || processedChunks === chunks.length) {
                    this.chatbotGateway.emitEmbeddingProgress({
                        resourceId: knowledgeSourceIdLocal,
                        status: 'embedding',
                        progress: Math.round(embeddingProgress),
                        message: `Đã embedding ${processedChunks}/${chunks.length} chunks...`
                    })
                }
            }

            // Lưu tất cả chunks cùng lúc
            await this.knowledgeChunksProvider.insertKnowledgeChunks(knowledgeChunks)

            // Cập nhật metadata
            await this.knowledgeSourceProvider.updateKnowledgeSourceMetadata(knowledgeSourceIdLocal, {
                wordCount,
                chunkCount: chunks.length,
                fileSize: file.size,
                mimeType: file.mimetype,
                progress: 100
            })

            await this.knowledgeSourceProvider.updateKnowledgeSourceStatus(
                knowledgeSourceIdLocal,
                ProcessingStatus.COMPLETED
            )

            this.chatbotGateway.emitEmbeddingCompleted({
                resourceId: knowledgeSourceIdLocal,
                status: 'completed',
                progress: 100,
                message: `Hoàn thành! Đã tạo ${chunks.length} chunks từ ${wordCount} từ.`
            })

            console.log(`Created ${chunks.length} chunks for knowledge source`)
        } catch (error) {
            console.error('Error processing file:', error)

            await this.knowledgeSourceProvider.updateKnowledgeSourceStatus(
                knowledgeSourceIdLocal,
                ProcessingStatus.FAILED
            )

            await this.knowledgeSourceProvider.updateKnowledgeSourceMetadata(knowledgeSourceIdLocal, {
                errorMessage: error.message
            })

            this.chatbotGateway.emitCrawlFailed({
                resourceId: knowledgeSourceIdLocal,
                status: 'failed',
                progress: 0,
                message: 'Xử lý file thất bại',
                error: error.message
            })

            throw error
        }
    }
    /**
     * Xử lý file upload để tạo knowledge source mới
     */
    public async processUploadedFileInNewKnowledge(
        userId: string,
        file: Express.Multer.File,
        sourceMetadata: { name: string; description?: string }
    ): Promise<KnowledgeSource> {
        // 1. Upload file lên MinIO
        const files = await this.uploadManyFilesProvider.uploadManyFiles(userId, [file], UploadFileTypes.AI_KNOWLEDGE)

        // 2. Tạo knowledge source với status PENDING
        const newKnowledgeSource = await this.knowledgeSourceProvider.createKnowledgeSource(userId, {
            name: sourceMetadata.name,
            description: sourceMetadata.description,
            source_type: SourceType.FILE,
            source_location: files[0].fileUrl
        })

        // 3. Xử lý file async (không chờ đợi để response nhanh cho client)
        this.processFileToChunks(file, newKnowledgeSource._id.toString()).catch((error) => {
            console.error('Error processing file asynchronously:', error)
        })

        return newKnowledgeSource
    }

    /**
     * Xử lý file upload cho knowledge source đã có sẵn
     * - Upload file lên MinIO
     * - Xử lý file để tạo chunks
     * - Lưu chunks vào knowledge source đã có
     */
    public async processUploadedFileInAvailableKnowledge(
        userId: string,
        file: Express.Multer.File,
        klid: string
    ): Promise<KnowledgeSource> {
        // 1. Kiểm tra knowledge source tồn tại
        const existingKnowledgeSource = await this.knowledgeSourceProvider.getKnowledgeSourceById(klid)
        if (!existingKnowledgeSource) {
            throw new BadRequestException('Knowledge source không tồn tại')
        }

        // 2. Upload file lên MinIO và cập nhật source_location
        const uploadedFiles = await this.uploadManyFilesProvider.uploadManyFiles(
            userId,
            [file],
            UploadFileTypes.AI_KNOWLEDGE
        )
        await this.knowledgeSourceProvider.updateKnowledgeSourceLocation(klid, uploadedFiles[0].fileUrl)

        // 3. Xử lý file async (không chờ đợi)
        this.processFileToChunks(file, klid).catch((error) => {
            console.error('Error processing file asynchronously:', error)
        })

        return existingKnowledgeSource
    }

    public async searchSimilarDocuments(vectorSearch: number[], options: SearchOptions): Promise<KnowledgeChunk[]> {
        // Search similar documents in the database
        return await this.searchSimilarDocumentsProvider.searchSimilarDocuments(vectorSearch, options)
    }

    public async buildKnowledgeDocuments(
        userId: string,
        buildKnowledgeDB: BuildKnowledgeDB
    ): Promise<KnowledgeSource[]> {
        const knowledgeSources: KnowledgeSource[] = []
        for (const doc of buildKnowledgeDB.knowledgeDocuments) {
            //Store knowledge source metadata into database incase of URL type
            if (doc.source_type === SourceType.URL) {
                // Add knowledge documents to database
                const storedKnowledgeDoc = await this.knowledgeSourceProvider.createKnowledgeSource(userId, doc)
                //Bắt đầu xử lý dữ liệu crawl-split-embed-store cho từng doc
                await this.loadSampleData(storedKnowledgeDoc._id.toString(), doc.source_location)
                // Gửi job vào BullMQ
                // await this.knowledgeQueue.add('processKnowledge', {
                //     sourceId: storedKnowledgeDoc._id.toString(),
                //     url: doc.source_location
                // })
                // knowledgeSources.push(storedKnowledgeDoc)
            }
        }
        console.log('Completed building basic knowledge documents.')
        return knowledgeSources
    }

    public async loadSampleData(sourceId: string, url: string) {
        //Declare splitter to split text into chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1024,
            chunkOverlap: 100,
            separators: ['\n\n', '\n', '. ']
        })
        //create vector search if not exists

        try {
            // Lấy knowledge source để biết source_type
            const knowledgeSource = await this.knowledgeSourceProvider.getKnowledgeSourceById(sourceId)
            if (!knowledgeSource) {
                throw new BadRequestException('Knowledge source not found')
            }

            console.log(url)
            const content = await this.scrapePage(url)
            console.log('Scraped content length:', content)
            const chunks = await splitter.splitText(content)

            // Batch processing: Thu thập tất cả embeddings trước
            const knowledgeChunks: CreateKnowledgeChunkDto[] = []
            for (const chunk of chunks) {
                // Create embedding using Google
                const vector = await this.getEmbeddingProvider.getEmbedding(chunk)
                console.log('Created embedding for chunk', vector.length)
                knowledgeChunks.push({
                    source_id: sourceId,
                    source_type: knowledgeSource.source_type, // Lưu source_type
                    text: chunk,
                    plot_embedding_gemini_large: vector
                })
            }

            // Lưu tất cả chunks cùng lúc
            const res = await this.knowledgeChunksProvider.createKnowledgeChunks(knowledgeChunks)
            console.log(`Successfully stored ${knowledgeChunks.length} chunks`)
            console.log('Batch insert result:', res)
        } catch (error) {
            throw new BadRequestException(error.message)
        }
    }

    /**
     * Crawl URL with progress tracking via WebSocket
     */
    public async loadSampleDataWithProgress(sourceId: string, url: string): Promise<void> {
        console.log(`🚀 Starting loadSampleDataWithProgress for sourceId: ${sourceId}, url: ${url}`)

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1024,
            chunkOverlap: 100,
            separators: ['\n\n', '\n', '. ']
        })

        try {
            // Lấy knowledge source để biết source_type
            const knowledgeSource = await this.knowledgeSourceProvider.getKnowledgeSourceById(sourceId)
            if (!knowledgeSource) {
                throw new BadRequestException('Knowledge source not found')
            }

            console.log('📡 Emitting crawl progress...')
            // Emit crawling started
            this.chatbotGateway.emitCrawlProgress({
                resourceId: sourceId,
                status: 'crawling',
                progress: 10,
                message: 'Đang crawl nội dung từ URL...'
            })

            console.log('🔄 Updating knowledge source status to PENDING...')
            // Update status to PENDING
            await this.knowledgeSourceProvider.updateKnowledgeSourceStatus(sourceId, ProcessingStatus.PENDING)

            console.log('🌐 Scraping page...')
            // Scrape page
            const content = await this.scrapePage(url)
            console.log(`✅ Scraped ${content.length} characters from URL`)
            const wordCount = content.split(/\s+/).length

            this.chatbotGateway.emitCrawlProgress({
                resourceId: sourceId,
                status: 'crawling',
                progress: 40,
                message: `Đã crawl ${wordCount} từ. Đang phân chia chunks...`
            })

            console.log('✂️ Splitting into chunks...')
            // Split into chunks
            const chunks = await splitter.splitText(content)
            console.log(`✅ Created ${chunks.length} chunks`)

            this.chatbotGateway.emitCrawlCompleted({
                resourceId: sourceId,
                status: 'completed',
                progress: 60,
                message: `Đã tạo ${chunks.length} chunks. Bắt đầu embedding...`
            })

            // Create embeddings
            console.log('🧠 Starting embedding process...')
            this.chatbotGateway.emitEmbeddingProgress({
                resourceId: sourceId,
                status: 'embedding',
                progress: 60,
                message: `Đang tạo embedding cho ${chunks.length} chunks...`
            })

            const knowledgeChunks: CreateKnowledgeChunkDto[] = []
            let processedChunks = 0

            for (const chunk of chunks) {
                const vector = await this.getEmbeddingProvider.getEmbedding(chunk)
                knowledgeChunks.push({
                    source_id: sourceId,
                    source_type: knowledgeSource.source_type, // Lưu source_type
                    text: chunk,
                    plot_embedding_gemini_large: vector
                })

                processedChunks++
                const embeddingProgress = 60 + (processedChunks / chunks.length) * 30

                if (processedChunks % 5 === 0 || processedChunks === chunks.length) {
                    console.log(`📊 Embedding progress: ${processedChunks}/${chunks.length}`)
                    this.chatbotGateway.emitEmbeddingProgress({
                        resourceId: sourceId,
                        status: 'embedding',
                        progress: Math.round(embeddingProgress),
                        message: `Đã embedding ${processedChunks}/${chunks.length} chunks...`
                    })
                }
            }

            console.log(`💾 Saving ${knowledgeChunks.length} chunks to database...`)
            console.log('📋 First chunk sample:', {
                source_id: knowledgeChunks[0]?.source_id,
                text_length: knowledgeChunks[0]?.text?.length,
                has_embedding: !!knowledgeChunks[0]?.plot_embedding_gemini_large,
                embedding_length: knowledgeChunks[0]?.plot_embedding_gemini_large?.length
            })

            // Save chunks
            const saveResult = await this.knowledgeChunksProvider.createKnowledgeChunks(knowledgeChunks)
            console.log('✅ Chunks save result:', saveResult)

            // Direct verification using mongoose model
            const KnowledgeChunkModel = this.knowledgeChunksProvider['knowledgeChunkRepository']['knowledgeChunkModel']
            const directCount = await KnowledgeChunkModel.countDocuments({ source_id: sourceId })
            console.log(`🔍 Direct count query: Found ${directCount} chunks with source_id: ${sourceId}`)

            if (directCount > 0) {
                const sampleChunks = await KnowledgeChunkModel.find({ source_id: sourceId }).limit(3).lean()
                console.log(
                    '📋 Sample chunk IDs:',
                    sampleChunks.map((c) => c._id.toString())
                )
                console.log(
                    '📋 Sample chunk texts:',
                    sampleChunks.map((c) => c.text.substring(0, 50) + '...')
                )
            } else {
                console.error('⚠️  WARNING: No chunks found in database after save!')
                console.error('⚠️  Check if sourceId matches:', sourceId)
            }

            console.log('📝 Updating metadata...')
            // Update metadata and status
            await this.knowledgeSourceProvider.updateKnowledgeSourceMetadata(sourceId, {
                wordCount,
                chunkCount: chunks.length,
                progress: 100
            })

            console.log('✅ Updating status to COMPLETED...')
            await this.knowledgeSourceProvider.updateKnowledgeSourceStatus(sourceId, ProcessingStatus.COMPLETED)

            console.log('🎉 Emitting completion event...')
            this.chatbotGateway.emitEmbeddingCompleted({
                resourceId: sourceId,
                status: 'completed',
                progress: 100,
                message: `Hoàn thành! Đã tạo ${chunks.length} chunks từ ${wordCount} từ.`
            })

            console.log(`✅ loadSampleDataWithProgress completed successfully for sourceId: ${sourceId}`)
        } catch (error) {
            console.error('❌ Error in loadSampleDataWithProgress:', error)
            console.error('Error stack:', error.stack)

            await this.knowledgeSourceProvider.updateKnowledgeSourceStatus(sourceId, ProcessingStatus.FAILED)
            await this.knowledgeSourceProvider.updateKnowledgeSourceMetadata(sourceId, {
                errorMessage: error.message
            })

            this.chatbotGateway.emitCrawlFailed({
                resourceId: sourceId,
                status: 'failed',
                progress: 0,
                message: 'Crawl thất bại',
                error: error.message
            })

            throw error
        }
    }

    scrapePage = async (url: string) => {
        const loader = new PuppeteerWebBaseLoader(url, {
            launchOptions: {
                headless: true
            },
            gotoOptions: {
                waitUntil: 'domcontentloaded'
            },
            evaluate: async (page, browser) => {
                const result = await page.evaluate(() => {
                    return document.body.innerText
                })
                await browser.close()
                return result
            }
        })
        return (await loader.scrape())?.replace(/<[^>]*>?/gm, '')
    }
}
