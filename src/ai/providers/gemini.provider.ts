import { Injectable } from '@nestjs/common'
import { AIProvider } from '../interfaces/ai-provider.interface'
import { BaseHttpException } from '../../common/exceptions'
import { GoogleGenerativeAI } from '@google/generative-ai'

@Injectable()
export class GeminiProvider implements AIProvider {
    private readonly model: any
    private readonly config: any = {
        expand: {
            temperature: 0.6,
            topP: 0.9,
            topK: 40,
            maxOutputTokens: 512
        },
        tags: {
            temperature: 0.35,
            topP: 0.8,
            topK: 20,
            maxOutputTokens: 400
        }
    }
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) throw new BaseHttpException('Gemini API key not found', 'API_KEY_NOT_FOUND', 500)

        const gemini = new GoogleGenerativeAI(apiKey)
        this.model = gemini.getGenerativeModel({ model: 'models/gemini-2.5-flash' })
    }

    async generateDescription(topicTitle: string, description?: string): Promise<string> {
        const prompt = `
                Bạn là trợ lý học thuật trong lĩnh vực Công nghệ Thông tin. Hãy mở rộng mô tả cho đề tài đồ án sau, tập trung vào tính khả thi và thực tế đối với một đồ án tốt nghiệp của sinh viên đại học.
                Hãy mở rộng mô tả cho đề tài đồ án sau:
                - Tên đề tài: "${topicTitle}"
                ${description ? `- Mô tả ban đầu từ giảng viên: "${description}"` : ''}

                Yêu cầu:
                - Viết bằng văn phong học thuật, rõ ràng, mạch lạc.
                - Nêu bật mục tiêu, nội dung chính, hướng tiếp cận kỹ thuật, công nghệ sử dụng và ứng dụng thực tế.
                - Không lặp lại nguyên văn mô tả cũ, chỉ mở rộng thêm.
                - Tránh viết quá chung chung, hãy tập trung vào **các thành phần kỹ thuật, giải pháp và phương pháp tiếp cận**.
                - Độ dài khoảng 150-250 từ.
                `

        const config = this.config.expand
        const result = await this.model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config
        })

        return (result?.response?.text() ?? '').trim()
    }

    async suggestRequirements(existingTags: string[], description: string): Promise<string[]> {
        const prompt = `
                Bạn là một trợ lý phân loại thẻ kỹ thuật.

                Nhiệm vụ của bạn là đọc mô tả dự án hoặc đề tài, sau đó gắn các tag phù hợp nhất từ danh sách dưới đây.  
                Tag thể hiện **lĩnh vực kỹ thuật chính**, không cần gắn tất cả tag phụ.  
                Chỉ chọn **3–8 tag quan trọng nhất**, phản ánh **nội dung cốt lõi** của dự án.

                Danh sách tag:
                ${existingTags}

                Trả về kết quả ở dạng JSON mảng các chuỗi (ví dụ: ["Web Application Development", "Machine Learning", "Recommender System"])

                ---

                Ví dụ 1:
                Đầu vào:
                "Một nền tảng web sử dụng học máy để gợi ý tài liệu học tập cá nhân hóa cho sinh viên."

                Kết quả:
                ["Web Application Development", "Machine Learning", "Recommender System", "Intelligent Tutoring Systems"]

                ---

                Ví dụ 2:
                Đầu vào:
                "Một ứng dụng di động cho phép người dùng điều khiển thiết bị nhà thông minh qua Wi-Fi và có nhận diện giọng nói."

                Kết quả:
                ["Cross-platform Mobile App Development", "Internet of Things (IoT)", "Speech Recognition"]

                ---

                Ví dụ 3:
                Đầu vào:
                "Đề tài nghiên cứu tối ưu chương trình điều khiển vi điều khiển cho robot tự hành."

                Kết quả:
                ["Embedded System Design", "Microcontroller Programming", "Robotics"]

                ---

                Bây giờ hãy phân loại dự án sau:
                "${description}"
                `
        const config = this.config.tags
        for (let attempt = 1; attempt <= 3; attempt++) {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: config
            })

            const text = result?.response?.text()?.trim() ?? ''

            try {
                const parsed = JSON.parse(text)
                if (Array.isArray(parsed)) {
                    return parsed.map((t) => String(t).trim()).filter((t) => t.length > 0)
                }
            } catch (err) {}
            console.warn(`Attempt ${attempt} failed to parse JSON. Retrying...`)
        }

        console.error('Failed to generate a valid JSON array of tags.')
        return []
    }
}
