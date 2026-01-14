import { Inject, Injectable } from '@nestjs/common'
import { AgentExecutor, createReactAgent, createToolCallingAgent } from 'langchain/agents'
import { TopicRegisteringSearchTool } from '../tools/topic-registering-search.tool'
import { DocumentSearchTool } from '../tools/document-search.tool'
import { LecturerSearchTool } from '../tools/lecturer-search.tool'
import { googleAIConfig } from '../../../config/googleai.config'
import { ConfigType } from '@nestjs/config'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages'
import { ChatGroq } from '@langchain/groq'
import groqConfig from '../../../config/groq.config'
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools'
import { TopicInLibrarySearchTool } from '../tools/topic-in-library-search.tool'
import { ProfileMatchingTool } from '../tools/profile-matching.tool'
@Injectable()
export class AutoAgentService {
    private agent: AgentExecutor
    private currentUserId: string | null = null
    private wrapTool(structuredTool: DynamicStructuredTool): DynamicTool {
        return new DynamicTool({
            name: structuredTool.name,
            description: structuredTool.description,
            func: async (input: string) => {
                const parsed = this.safeParse(input)

                if (structuredTool.name === 'profile_matching_lecturer_search_tool') {
                    return this.profileMatchingTool.execute(parsed, this.currentUserId!)
                }

                return structuredTool.func(parsed)
            }
        })
    }
    private safeParse(input: string): any {
        if (!input) return {}

        if (typeof input !== 'string') return input

        try {
            return JSON.parse(input)
        } catch {
            // fallback: LLM gửi plain text
            return { query: input, limit: 5 }
        }
    }
    constructor(
        private readonly topicRegisteringTool: TopicRegisteringSearchTool,
        private readonly documentTool: DocumentSearchTool,
        private readonly lecturerTool: LecturerSearchTool,
        private readonly topicInLibraryTool: TopicInLibrarySearchTool,
        private readonly profileMatchingTool: ProfileMatchingTool,
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
            temperature: 0, // Set 0 để giảm hallucination
            maxTokens: 2048
        })

        // Danh sách tools
        const structuredTools = [
            this.topicRegisteringTool.createTool(),
            this.documentTool.createTool(),
            this.lecturerTool.createTool(),
            this.topicInLibraryTool.createTool(),
            this.profileMatchingTool.createTool()
        ]

        const tools = structuredTools.map((t) => this.wrapTool(t))

        // System prompt cho ReactAgent
        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `
Bạn là trợ lý AI hỗ trợ sinh viên, giảng viên và ban chủ nhiệm khoa tại
Đại học Công nghệ Thông tin – ĐHQG TP.HCM trong các vấn đề liên quan đến:
- khóa luận tốt nghiệp
- nghiên cứu khoa học
- giảng viên và tài liệu học thuật

========================
PHẠM VI HỖ TRỢ (BẮT BUỘC TUÂN THỦ)
========================
Bạn CHỈ được thực hiện các tác vụ sau:

1. Tìm kiếm ĐỀ TÀI ĐANG MỞ ĐĂNG KÝ
   → tool: search_registering_topics

2. Tìm kiếm ĐỀ TÀI TRONG THƯ VIỆN
   → tool: search_in_library_topics

3. Tìm kiếm TÀI LIỆU / QUY TRÌNH / HƯỚNG DẪN
   → tool: search_documents

4. Tìm kiếm GIẢNG VIÊN theo lĩnh vực
   → tool: search_lecturers

5. Gợi ý GIẢNG VIÊN dựa trên profile sinh viên
   → tool: profile_matching_lecturer_search_tool

Nếu yêu cầu nằm ngoài phạm vi trên:
→ TỪ CHỐI LỊCH SỰ, ngắn gọn, rõ ràng.

========================
NGUYÊN TẮC XỬ LÝ CÂU HỎI
========================

1. KHÔNG mô tả quá trình suy luận, phân tích nội bộ, hoặc cách bạn chọn tool.
2. KHÔNG sử dụng các từ như: Thought, Action, Observation trong câu trả lời.
3. Chỉ gọi tool khi câu hỏi ĐỦ RÕ để xác định đúng loại dữ liệu cần tìm.
4. Nếu câu hỏi MƠ HỒ hoặc THIẾU THÔNG TIN:
   - KHÔNG gọi tool
   - Hỏi lại để làm rõ
   - Gợi ý các lựa chọn cụ thể cho người dùng

Ví dụ hỏi làm rõ hợp lệ:
- “Bạn muốn tìm đề tài đang mở đăng ký hay đề tài trong thư viện?”
- “Bạn muốn tìm giảng viên theo lĩnh vực nào (AI, Cloud, Data, …)?”
- “Bạn cần tài liệu về quy trình, biểu mẫu hay tiêu chí đánh giá?”

========================
QUY TẮC SỬ DỤNG TOOL
========================

▶ search_documents
- Nếu chưa chắc, dùng NGUYÊN VĂN câu hỏi của người dùng làm query.
- KHÔNG dùng query quá ngắn (1–3 từ).
- Query phải có ngữ cảnh đầy đủ, sát thực tế.
- limit khuyến nghị: 10–15.

▶ profile_matching_lecturer_search_tool
- CHỈ dùng khi người dùng yêu cầu gợi ý giảng viên dựa trên profile cá nhân.
- KHÔNG tự sinh hoặc suy đoán userId (backend tự xử lý).
- Action Input CHỈ gồm: query, limit.
- Query mô tả mong muốn học thuật của sinh viên (lĩnh vực, kỹ năng, định hướng).
- Nếu không đủ dữ liệu profile → trả lời phù hợp theo phản hồi của tool.

========================
FORMAT TRẢ LỜI (BẮT BUỘC)
========================

- Trả lời trực tiếp cho người dùng, KHÔNG kèm tiền tố kỹ thuật.
- Ngắn gọn, rõ ràng, đúng trọng tâm.
- Dùng markdown khi cần để dễ đọc.

Riêng với gợi ý giảng viên theo profile, trình bày theo cấu trúc:
1. **Tóm tắt profile sinh viên** (2–3 ý chính)
2. **Giảng viên được gợi ý** (1–3 người, tên + email + lĩnh vực)
3. **Lý do phù hợp** (1–2 câu mỗi giảng viên)

Nếu không có kết quả:
→ Thông báo rõ ràng và đề xuất hướng tìm kiếm thay thế.


Bạn phải tuân thủ nghiêm ngặt tất cả các quy tắc trên.
`
            ],
            ['placeholder', '{chat_history}'],
            ['human', '{input}'],
            ['placeholder', '{agent_scratchpad}']
        ])
        // Tạo ToolCallingAgent
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
            maxIterations: 3, // Chỉ 1 vòng để tránh multi-tool calling với Groq
            returnIntermediateSteps: true, // Trả về các bước trung gian,
            earlyStoppingMethod: 'force' // Dừng khi LLM tạo Final Answer
        })

        console.log('✅ Auto Agent initialized with', tools.length, 'tools')
    }

    private mapToolToLabel(toolName: string) {
        const TOOL_LABEL: Record<string, string> = {
            search_registering_topics: 'Đang tìm đề tài phù hợp',
            search_lecturers: 'Đang tìm giảng viên',
            profile_matching_lecturer_search_tool: 'Đang ghép giảng viên phù hợp',
            search_documents: 'Đang tìm tài liệu phù hợp'
        }

        return TOOL_LABEL[toolName] ?? 'Đang xử lý'
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
    async chat(userMessage: string, chatHistory: any[] = [], userId: string) {
        try {
            this.currentUserId = userId
            console.log('\n🤖 [AGENT] User:', userMessage)
            console.log('📝 [AGENT] Chat history length:', chatHistory.length)

            const transformedHistory = this.transformChatHistory(chatHistory)
            console.log('✅ [AGENT] Transformed history:', transformedHistory.length, 'messages')

            const result = await this.agent.invoke({
                input: userMessage,
                chat_history: transformedHistory,
                agent_scratchpad: []
            })
            this.currentUserId = null
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
    async *streamChat(userMessage: string, chatHistory: any[] = [], userId: string) {
        this.currentUserId = userId

        try {
            const stream = await this.agent.streamEvents(
                {
                    input: userMessage,
                    chat_history: this.transformChatHistory(chatHistory),
                    agent_scratchpad: []
                },
                { version: 'v2' }
            )

            // Buffer để lưu topics data, chỉ gửi sau khi stream text xong
            let bufferedTopicsData: any = null
            let bufferedLecturerData: any = null

            yield this.yieldEvent({
                type: 'step',
                step: 'receive_request',
                message: 'Đã nhận yêu cầu'
            })

            yield this.yieldEvent({ 
                type: 'step',
                step: 'thinking',
                message: 'Đang phân tích yêu cầu'
            })

            for await (const event of stream) {
                // Log event type để debug
                // console.log('📡 Event type:', event.event)

                // Xử lý stream từ LLM - YIELD NGAY
                if (event.event === 'on_chat_model_stream') {
                    const content = event.data?.chunk?.content
                    if (content) {
                        // console.log('✨ Streaming content:', content)
                        yield this.yieldEvent({
                            type: 'content',
                            delta: content
                        })
                    }
                }

                if (event.event === 'on_tool_start') {
                    yield this.yieldEvent({
                        type: 'step',
                        step: 'tool_running',
                        tool: event.name,
                        message: this.mapToolToLabel(event.name)
                    })
                }

                // Khi tool search_topics hoàn thành, LƯU VÀO BUFFER (không yield ngay)
                if (event.event === 'on_tool_end') {
                    const toolName = event.name
                    const output = event.data?.output || ''
                    console.log('🔧 Tool finished:', toolName)

                    yield this.yieldEvent({
                        type: 'step',
                        step: 'tool_done',
                        tool: toolName
                    })

                    if (!output) continue

                    try {
                        const parsed = typeof output === 'string' ? JSON.parse(output) : output

                        if (toolName === 'search_registering_topics') {
                            bufferedTopicsData = parsed
                        }

                        if (toolName === 'search_lecturers' || toolName === 'profile_matching_lecturer_search_tool') {
                            bufferedLecturerData = parsed
                        }
                    } catch (error) {
                        console.error('❌ Failed to parse tool output:', toolName, error)
                    }
                }
            }

            // SAU KHI STREAM KẾT THÚC, gửi topics data nếu có
            if (bufferedTopicsData) {
                yield this.yieldEvent({
                    type: 'result',
                    resultType: 'topics',
                    payload: bufferedTopicsData
                })
            }

            if (bufferedLecturerData) {
                yield this.yieldEvent({
                    type: 'result',
                    resultType: 'lecturers',
                    payload: bufferedLecturerData
                })
            }
        } catch (error) {
            console.error('❌ [AGENT] Streaming Error:', error)
            yield this.yieldEvent({ type: 'error', error: error.message })
        } finally {
            this.currentUserId = null
            yield this.yieldEvent({ type: 'done' })
        }
    }

    private yieldEvent(event: any) {
        return JSON.stringify(event) + '\n'
    }
}
