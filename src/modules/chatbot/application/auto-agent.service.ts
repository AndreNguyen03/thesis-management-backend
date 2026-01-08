import { Inject, Injectable } from '@nestjs/common'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { TopicSearchTool } from '../tools/topic-search.tool'
import { DocumentSearchTool } from '../tools/document-search.tool'
import { LecturerSearchTool } from '../tools/lecturer-search.tool'
import { googleAIConfig } from '../../../config/googleai.config'
import { ConfigType } from '@nestjs/config'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate } from '@langchain/core/prompts'

@Injectable()
export class AutoAgentService {
    private agent: AgentExecutor

    constructor(
        private readonly topicTool: TopicSearchTool,
        private readonly documentTool: DocumentSearchTool,
        private readonly lecturerTool: LecturerSearchTool,
        @Inject(googleAIConfig.KEY)
        private readonly googleConfig: ConfigType<typeof googleAIConfig>
    ) {
        this.initializeAgent()
    }
    private async initializeAgent() {
        // Khởi tạo LLM với function calling
        const llm = new ChatGoogleGenerativeAI({
            apiKey: this.googleConfig.apiKey,
            model: 'gemini-2.5-flash',
            temperature: 0.3, // Thấp = ổn định, cao = sáng tạo
            maxOutputTokens: 2048
        })

        // Danh sách tools
        const tools = [this.topicTool.createTool(), this.documentTool.createTool(), this.lecturerTool.createTool()]

        // System prompt cho Agent
        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `Bạn là trợ lý AI hỗ trợ sinh viên về khóa luận tốt nghiệp tại Đại học Công nghệ Thông tin - ĐHQG TP.HCM.

NHIỆM VỤ:
- Phân tích câu hỏi của sinh viên
- Chọn công cụ (tool) phù hợp để tìm kiếm thông tin
- Tổng hợp kết quả và trả lời bằng tiếng Việt tự nhiên, dễ hiểu

QUY TẮC:
1. Nếu hỏi về ĐỀ TÀI → Dùng tool "search_topics"
2. Nếu hỏi về QUY TRÌNH/TÀI LIỆU → Dùng tool "search_documents"
3. Nếu hỏi về GIẢNG VIÊN → Dùng tool "search_lecturers"
4. Có thể dùng NHIỀU tools trong 1 câu hỏi
5. Nếu không chắc → Hỏi lại người dùng để làm rõ

CÁCH TRẢ LỜI:
- Thân thiện, lịch sự
- Trình bày rõ ràng, có bullet points
- Đính kèm link/thông tin liên hệ nếu có
- Nếu không tìm thấy → Gợi ý cách hỏi khác

VÍ DỤ:
User: "Tìm đề tài về AI và tài liệu hướng dẫn"
→ Agent: Gọi search_topics("AI") + search_documents("hướng dẫn khóa luận")
→ Response: "Tìm thấy 5 đề tài về AI:... Và đây là tài liệu hướng dẫn:..."
                `.trim()
            ],
            ['placeholder', '{chat_history}'],
            ['human', '{input}'],
            ['placeholder', '{agent_scratchpad}']
        ])

        // Tạo agent với tool calling
        const agent = await createToolCallingAgent({
            llm,
            tools,
            prompt
        })

        // Executor để chạy agent
        this.agent = new AgentExecutor({
            agent,
            tools,
            verbose: true, // Log chi tiết quá trình
            maxIterations: 3, // Tối đa 3 vòng tool calling
            returnIntermediateSteps: true // Trả về các bước trung gian
        })

        console.log('✅ Auto Agent initialized with', tools.length, 'tools')
    }

    /**
     * Chat với agent - Tự động chọn tool và trả lời
     */
    async chat(userMessage: string, chatHistory: any[] = []) {
        try {
            console.log('\n🤖 [AGENT] User:', userMessage)

            const result = await this.agent.invoke({
                input: userMessage,
                chat_history: chatHistory
            })

            console.log('📊 [AGENT] Steps:', result.intermediateSteps?.length || 0)

            return {
                response: result.output,
                steps: result.intermediateSteps?.map((step) => ({
                    tool: step.action.tool,
                    input: step.action.toolInput,
                    output: step.observation
                })),
                success: true
            }
        } catch (error) {
            console.error('❌ [AGENT] Error:', error)
            return {
                response: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
                error: error.message,
                success: false
            }
        }
    }
    /**
     * Stream response (cho UI real-time)
     */
    async *streamChat(userMessage: string, chatHistory: any[] = []) {
        const stream = await this.agent.streamEvents(
            {
                input: userMessage,
                chat_history: chatHistory
            },
            { version: 'v1' }
        )

        for await (const event of stream) {
            if (event.event === 'on_chat_model_stream') {
                const content = event.data?.chunk?.content
                if (content) {
                    yield content
                }
            }
        }
    }
}
