import { Inject, Injectable } from '@nestjs/common'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { TopicSearchTool } from '../tools/topic-search.tool'
import { DocumentSearchTool } from '../tools/document-search.tool'
import { LecturerSearchTool } from '../tools/lecturer-search.tool'
import { googleAIConfig } from '../../../config/googleai.config'
import { ConfigType } from '@nestjs/config'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { ChatGroq } from '@langchain/groq'
import groqConfig from '../../../config/groq.config'
import { DynamicTool } from '@langchain/core/tools'
@Injectable()
export class AutoAgentService {
    private agent: AgentExecutor

    constructor(
        private readonly topicTool: TopicSearchTool,
        private readonly documentTool: DocumentSearchTool,
        private readonly lecturerTool: LecturerSearchTool,
        @Inject(googleAIConfig.KEY)
        private readonly googleConfig: ConfigType<typeof googleAIConfig>,
        @Inject(groqConfig.KEY)
        private readonly groqConfiguration: ConfigType<typeof groqConfig>
    ) {
        this.initializeAgent()
    }
    private async initializeAgent() {
        // Khởi tạo LLM với function calling
        // const llm = new ChatGoogleGenerativeAI({
        //     apiKey: this.googleConfig.apiKey,
        //     model: 'gemini-2.5-flash',
        //     temperature: 0.3, // Thấp = ổn định, cao = sáng tạo
        //     maxOutputTokens: 2048
        // })
        const llm = new ChatGroq({
            apiKey: this.groqConfiguration.apiKey,
            model: 'llama-3.3-70b-versatile', // Model mạnh nhất của Groq
            temperature: 0.3,
            maxTokens: 2048
        })

        // Danh sách tools
        const structuredTools = [
            this.topicTool.createTool(),
            this.documentTool.createTool(),
            this.lecturerTool.createTool()
        ]

        // Wrap structured tools thành DynamicTool cho ReactAgent (chỉ nhận string input)
        const tools = structuredTools.map((structuredTool) => {
            return new DynamicTool({
                name: structuredTool.name,
                description: structuredTool.description,
                func: async (input: string) => {
                    try {
                        let parsedInput: any
                        try {
                            parsedInput = JSON.parse(input)
                        } catch {
                            parsedInput = { query: input, limit: 5 }
                        }
                        // Gọi func trực tiếp thay vì invoke để giữ context this
                        const result = await structuredTool.func(parsedInput)
                        return typeof result === 'string' ? result : JSON.stringify(result)
                    } catch (error) {
                        console.error(`❌ Error in tool ${structuredTool.name}:`, error)
                        return `Lỗi: ${error.message}`
                    }
                }
            })
        })

        // System prompt cho ReactAgent
        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `Bạn là trợ lý AI hỗ trợ sinh viên về khóa luận tốt nghiệp tại Đại học Công nghệ Thông tin - ĐHQG TP.HCM.

PHẠM VI HỖ TRỢ (CHỈ ĐƯỢC LÀM NHỮNG VIỆC SAU):
1. Tìm kiếm ĐỀ TÀI (dùng tool: search_topics)
2. Tìm kiếm TÀI LIỆU/QUY TRÌNH (dùng tool: search_documents)
3. Tìm kiếm GIẢNG VIÊN (dùng tool: search_lecturers)

NGUYÊN TẮC CỐT LÕI (QUAN TRỌNG):
- CHỈ gọi tool khi người dùng đã cung cấp từ khóa rõ ràng (Ví dụ: "đề tài AI", "quy trình bảo vệ", "giảng viên mobile").
- Chào hỏi hoặc không có ngữ cảnh rõ ràng thì không được gọi tool
- Mọi câu trả lời không dùng tool BẮT BUỘC phải bắt đầu bằng "Final Answer:".


NGOÀI PHẠM VI (TỪ CHỐI TRẢ LỜI):
- Tra cứu điểm số, xem điểm rèn luyện.
- Xem thời khóa biểu cá nhân, lịch thi cá nhân.
- Đăng ký tín chỉ, hủy học phần.
-> Với các yêu cầu này, hãy trả lời là tính năng đang được phát triển.

CÔNG CỤ CÓ SẴN:
{tools}

Tên các tool: {tool_names}

QUY TRÌNH SUY LUẬN (ReAct):
Question: Câu hỏi người dùng
Thought: Phân loại câu hỏi:
    1. Chào hỏi -> Final Answer.
    2. Ngoài phạm vi hỗ trợ -> Final Answer (Từ chối khéo).
    3. Trong phạm vi -> Chọn Tool (Action).
Action: Tên tool (nếu cần)
Action Input: Input JSON
Observation: Kết quả từ tool
Thought: Kiểm tra kết quả:
    - Nếu có dữ liệu -> Trả lời.
    - Nếu tool trả về rỗng/"Không tìm thấy" -> Final Answer (Xin lỗi).
Final Answer: Câu trả lời cuối cùng.

---
VÍ DỤ 1: CHÀO HỎI (KHÔNG GỌI TOOL)
Question: Hi ad
Thought: Chào hỏi xã giao.
Final Answer: Chào bạn! Mình có thể giúp gì về đề tài khóa luận, tài liệu hoặc tìm giảng viên không ạ?

VÍ DỤ 2: TÍNH NĂNG CHƯA CÓ (KHÔNG GỌI TOOL)
Question: Xem giúp mình điểm rèn luyện học kỳ này
Thought: Người dùng hỏi về điểm rèn luyện. Đây là tính năng tra cứu cá nhân, hiện tại chưa hỗ trợ (nằm ngoài phạm vi 3 tool search).
Final Answer: Xin lỗi bạn, hiện tại mình chỉ hỗ trợ tra cứu thông tin về Khóa luận (Đề tài, Tài liệu, Giảng viên). Tính năng tra cứu điểm rèn luyện đang được team phát triển và sẽ ra mắt sau ạ!

VÍ DỤ 3: GỌI TOOL THÀNH CÔNG
Question: Tìm đề tài về Blockchain
Thought: Từ khóa "Blockchain", cần tìm đề tài -> search_topics.
Action: search_topics
Action Input: {{"query": "Blockchain", "limit": 5}}
Observation: {{"total": 1, "topics": [...]}}
Thought: Có kết quả, trả lời user.
Final Answer: Mình tìm thấy 1 đề tài về Blockchain...

VÍ DỤ 4: GỌI TOOL NHƯNG KHÔNG CÓ DỮ LIỆU
Question: Quy trình đăng ký thực tập
Thought: Hỏi quy trình -> search_documents.
Action: search_documents
Action Input: {{"query": "quy trình đăng ký thực tập", "limit": 5}}
Observation: Không tìm thấy tài liệu phù hợp.
Thought: Tool trả về rỗng.
Final Answer: Xin lỗi, hiện tại hệ thống chưa cập nhật tài liệu về quy trình thực tập. Bạn vui lòng liên hệ phòng đào tạo để biết chi tiết nhé.

VÍ DỤ 5: CÂU HỎI KHÔNG ĐẦY ĐỦ NGỮ CẢNH (HỎI ĐỀ TÀI)
Question: Có đề tài nào không?
Thought: Câu hỏi chung chung, thiếu lĩnh vực cụ thể. Cần hỏi lại người dùng về lĩnh vực quan tâm.
Final Answer: Bạn vui lòng cho biết lĩnh vực hoặc chủ đề bạn quan tâm để mình tìm đề tài phù hợp nhé (ví dụ: Trí tuệ nhân tạo, Blockchain, An ninh mạng, ...).

VÍ DỤ 6: CÂU HỎI KHÔNG ĐẦY ĐỦ NGỮ CẢNH (HỎI GIẢNG VIÊN)
Question: Có giảng viên nào hướng dẫn không?
Thought: Câu hỏi chung chung, thiếu lĩnh vực nghiên cứu. Cần hỏi lại người dùng về lĩnh vực muốn tìm giảng viên.
Final Answer: Bạn muốn tìm giảng viên hướng dẫn về lĩnh vực nào? Vui lòng cung cấp lĩnh vực nghiên cứu hoặc chủ đề bạn quan tâm để mình hỗ trợ nhé.

---

Bắt đầu!`.trim()
            ],
            ['placeholder', '{chat_history}'],
            ['human', '{input}'],
            ['placeholder', '{agent_scratchpad}']
        ])
        // Tạo ReactAgent
        const agent = await createReactAgent({
            llm,
            tools,
            prompt
        })

        // Executor để chạy agent
        this.agent = new AgentExecutor({
            agent,
            tools,
            verbose: true, // Log chi tiết quá trình
            maxIterations: 3, // Chỉ 1 vòng để tránh multi-tool calling với Groq
            returnIntermediateSteps: true // Trả về các bước trung gian
        })

        console.log('✅ Auto Agent initialized with', tools.length, 'tools')
    }

    /**
     * Transform chat history sang BaseMessages format
     */
    private transformChatHistory(chatHistory: any[]): BaseMessage[] {
        if (!chatHistory || chatHistory.length === 0) {
            return []
        }

        return chatHistory
            .filter((msg) => msg && typeof msg === 'object' && msg.role && msg.content)
            .map((msg) => {
                if (msg.role === 'user' || msg.role === 'human') {
                    return new HumanMessage(msg.content)
                } else if (msg.role === 'assistant' || msg.role === 'ai') {
                    return new AIMessage(msg.content)
                }
                return null
            })
            .filter((msg): msg is HumanMessage | AIMessage => msg !== null)
    }

    /**
     * Chat với agent - Tự động chọn tool và trả lời
     */
    async chat(userMessage: string, chatHistory: any[] = []) {
        try {
            console.log('\n🤖 [AGENT] User:', userMessage)
            console.log('📝 [AGENT] Chat history length:', chatHistory.length)

            const transformedHistory = this.transformChatHistory(chatHistory)
            console.log('✅ [AGENT] Transformed history:', transformedHistory.length, 'messages')

            const result = await this.agent.invoke({
                input: userMessage,
                chat_history: transformedHistory
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
                chat_history: this.transformChatHistory(chatHistory)
            },
            { version: 'v2' }
        )

        // Buffer để lưu topics data, chỉ gửi sau khi stream text xong
        let bufferedTopicsData: any = null

        for await (const event of stream) {
            // Log event type để debug
            console.log('📡 Event type:', event.event)

            // Xử lý stream từ LLM - YIELD NGAY
            if (event.event === 'on_chat_model_stream') {
                const content = event.data?.chunk?.content
                if (content) {
                    console.log('✨ Streaming content:', content)
                    yield content
                }
            }

            // Khi tool search_topics hoàn thành, LƯU VÀO BUFFER (không yield ngay)
            if (event.event === 'on_tool_end') {
                const toolName = event.name
                console.log('🔧 Tool finished:', toolName)

                if (toolName === 'search_topics') {
                    const output = event.data?.output
                    if (output) {
                        try {
                            // Parse và lưu vào buffer
                            bufferedTopicsData = typeof output === 'string' ? JSON.parse(output) : output
                            console.log('📦 Topics data buffered:', bufferedTopicsData.total || 0, 'topics')
                        } catch (error) {
                            console.error('❌ Failed to parse topics data:', error)
                        }
                    }
                }
            }
        }

        // SAU KHI STREAM KẾT THÚC, gửi topics data nếu có
        if (bufferedTopicsData) {
            yield '\n\n__TOPICS_DATA_START__\n'
            yield JSON.stringify(bufferedTopicsData)
            yield '\n__TOPICS_DATA_END__\n\n'
            console.log('📚 Topics data sent after text completion')
        }
    }
}
