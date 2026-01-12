import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bullmq'
import { RetrievalProvider } from '../../chatbot/providers/retrieval.provider'

@Processor('ocr-queue')
export class OCRProcessor {
    constructor(private readonly retrievalProvider: RetrievalProvider) {}

    @Process('process-pdf')
    async handlePDFProcessing(
        job: Job<{
            sourceId: string
            fileBuffer: Buffer
            pdfType: 'text' | 'scanned'
        }>
    ) {
        const { sourceId, fileBuffer, pdfType } = job.data

        try {
            let text = ''
            if (pdfType === 'text') {
                text = await this.retrievalProvider['extractTextFromPDF'](fileBuffer)
            } else {
                text = await this.retrievalProvider['extractTextFromScannedPDF'](fileBuffer)
            }

            // Tiếp tục xử lý chunking và embedding
            // ...

            return { success: true, sourceId }
        } catch (error) {
            console.error('OCR processing failed:', error)
            throw error
        }
    }
}
