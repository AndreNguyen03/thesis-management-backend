import { Inject, Injectable, BadRequestException, Logger } from '@nestjs/common'
import slugify from 'slugify'
import { ChatGroq } from '@langchain/groq'
import { ConfigType } from '@nestjs/config'
import groqConfig from '../../../config/groq.config'
import { FieldsService } from '../../fields/application/fields.service'
import { IRequirementsRepository } from '../../requirements/repository/requirements.repository.interface'
import { PaginationQueryDto } from '../../../common/pagination-an/dtos/pagination-query.dto'
import { GenerateTopicDto } from '../dtos/create-topic-generation.dto'
import { Requirement } from '../../requirements/schemas/requirement.schemas'
import { Field } from '../../fields/schemas/fields.schemas'

@Injectable()
export class TopicGenerationService {
    private readonly logger = new Logger(TopicGenerationService.name)
    constructor(
        private readonly fieldService: FieldsService,
        @Inject('IRequirementsRepository')
        private readonly requirementsRepository: IRequirementsRepository,
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>
    ) {}

    /* ===================== PUBLIC API ===================== */

    async generateTopics(params: GenerateTopicDto) {
        const { prompt, limit = 5 } = params

        if (!prompt?.trim()) {
            throw new BadRequestException('prompt is required')
        }

        // 1. Load catalog
        const { fields, requirements } = await this.loadCatalog()

        // 2. Build prompt
        const systemPrompt = this.buildSystemPrompt({
            prompt,
            limit,
            fields,
            requirements
        })

        // 3. Call LLM
        const rawOutput = await this.callLLM(systemPrompt)

        // 4. Parse JSON
        const aiResult = this.safeParseJSON(rawOutput)

        if (!Array.isArray(aiResult?.suggestions)) {
            throw new BadRequestException('Invalid AI response format')
        }

        // 5. Match keywords (NO CREATE)
        const suggestions = aiResult.suggestions.map((s) => {
            const fieldMatch = this.matchKeywords(s.keywords?.fields ?? [], fields)
            const requirementMatch = this.matchKeywords(s.keywords?.requirements ?? [], requirements)

            return {
                vn: s.titleVN,
                en: s.titleEN,
                description: s.description,
                keywords: s.keywords,
                candidateFields: fieldMatch.candidates,
                missingFields: fieldMatch.missing,
                candidateRequirements: requirementMatch.candidates,
                missingRequirements: requirementMatch.missing
            }
        })

        return { suggestions }
    }

    /* ===================== LOAD DATA ===================== */

    private async loadCatalog() {
        const fieldPage = await this.fieldService.getAllFields({
            page: 1,
            limit: 100
        } as PaginationQueryDto)

        const requirementPage = await this.requirementsRepository.getAllRequirements({
            page: 1,
            limit: 100
        } as PaginationQueryDto)

        return {
            fields: fieldPage.data.map((f) => ({
                id: f._id.toString(),
                name: f.name,
                slug: f.slug
            })),
            requirements: requirementPage.data.map((r) => ({
                id: r._id.toString(),
                name: r.name,
                slug: r.slug
            }))
        }
    }

    /* ===================== PROMPT ===================== */

    private buildSystemPrompt(params: {
        prompt: string
        limit: number
        fields: Array<{ name: string; slug: string }>
        requirements: Array<{ name: string; slug: string }>
    }) {
        const { prompt, limit, fields, requirements } = params

        return `
Bạn là trợ lý AI hỗ trợ sinh viên và giảng viên xây dựng ĐỀ TÀI học thuật trong lĩnh vực Công nghệ Thông tin.

NGỮ CẢNH HỆ THỐNG:
Hệ thống đang sử dụng TIẾNG VIỆT làm ngôn ngữ chính.

DANH SÁCH LĨNH VỰC (Field) HIỆN CÓ:
${fields.map((f) => `- ${f.name}`).join('\n')}

DANH SÁCH YÊU CẦU / CÔNG NGHỆ (Requirement) HIỆN CÓ:
${requirements.map((r) => `- ${r.name}`).join('\n')}

NHIỆM VỤ:
Từ mô tả của người dùng, hãy sinh ra ${limit} đề tài phù hợp.

YÊU CẦU BẮT BUỘC:
- CHỈ trả về JSON thuần, KHÔNG kèm bất kỳ text giải thích nào.
- KHÔNG thêm markdown ngoài JSON.
- ƯU TIÊN sử dụng đúng tên Field / Requirement đã có trong danh sách trên.
- Chỉ đề xuất Field / Requirement mới nếu thực sự cần thiết.
- Keyword phải là tiếng Việt (trừ thuật ngữ chuẩn như: AI, Python, SQL, Java, …).

DESCRIPTION RULES:
- Mỗi description 3–4 câu
- Mỗi đề tài phải có góc tiếp cận khác nhau (hệ thống / mô hình / ứng dụng,...)
- Văn phong học thuật, không dùng cấu trúc lặp

ĐỊNH DẠNG OUTPUT (BẮT BUỘC CHÍNH XÁC):
{
  "suggestions": [
    {
      "titleVN": "Tiêu đề tiếng Việt",
      "titleEN": "English title",
      "description": "Mô tả ngắn gọn (HTML hoặc markdown)",
      "keywords": {
        "fields": ["tên lĩnh vực"],
        "requirements": ["tên công nghệ / yêu cầu"]
      }
    }
  ]
}

MÔ TẢ NGƯỜI DÙNG:
${prompt}
`.trim()
    }
    /* ===================== LLM ===================== */

    private async callLLM(systemPrompt: string): Promise<string> {
        const llm = new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            maxTokens: 2048
        })

        const res = await llm.invoke(systemPrompt)
        return typeof res.content === 'string' ? res.content : JSON.stringify(res.content)
    }

    private safeParseJSON(text: string): any {
        try {
            return JSON.parse(text)
        } catch {
            const match = text.match(/\{[\s\S]*\}/)
            if (!match) throw new Error('No JSON found')
            return JSON.parse(match[0])
        }
    }

    /* ===================== MATCHING ===================== */

    private normalize(input: string): string {
        return slugify(input, {
            lower: true,
            strict: true,
            locale: 'vi'
        })
    }

    private matchKeywords(keywords: string[], catalog: Array<{ id: string; name: string; slug: string }>) {
        const candidates: Array<{ id: string; name: string }> = []
        const missing: string[] = []

        for (const raw of keywords) {
            const norm = this.normalize(raw)

            const exact = catalog.find((c) => c.slug === norm || c.name.toLowerCase() === raw.toLowerCase())

            if (exact) {
                candidates.push({ id: exact.id, name: exact.name })
            } else {
                missing.push(raw)
            }
        }

        return { candidates, missing }
    }

    async applyMissingEntities(params: { missingFields: string[]; missingRequirements: string[] }) {
        const createdFields: Field[] = []
        const createdRequirements: Requirement[] = []

        // ===== Fields =====
        for (const name of params.missingFields ?? []) {
            const slug = this.toSlug(name)

            try {
                const field = await this.fieldService.createField({
                    name,
                    slug
                })
                createdFields.push(field)
            } catch (err) {
                this.logger.warn(`Failed to create field "${name}": ${err?.message ?? err}`)
            }
        }

        // ===== Requirements =====
        for (const name of params.missingRequirements ?? []) {
            const slug = this.toSlug(name)

            try {
                const requirement = await this.requirementsRepository.createRequirement({
                    name,
                    slug
                })
                createdRequirements.push(requirement)
            } catch (err) {
                this.logger.warn(`Failed to create requirement "${name}": ${err?.message ?? err}`)
            }
        }

        return {
            createdFields,
            createdRequirements
        }
    }

    private toSlug(value: string) {
        return slugify(value, {
            lower: true,
            strict: true,
            locale: 'vi'
        })
    }
}
