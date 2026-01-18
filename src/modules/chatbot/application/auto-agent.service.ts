import { Inject, Injectable } from '@nestjs/common'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
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
import { DynamicTool } from '@langchain/core/tools'
import { TopicInLibrarySearchTool } from '../tools/topic-in-library-search.tool'
import { ProfileMatchingTool } from '../tools/profile-matching.tool'
@Injectable()
export class AutoAgentService {
    private agent: AgentExecutor

    private currentUserId: string | null = null

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
            maxTokens: 2048,
            stop: ['Observation:', '\nObservation'] // Stop ngay khi LLM cố gắng tự tạo Observation
        })

        // Danh sách tools
        const structuredTools = [
            this.topicRegisteringTool.createTool(),
            this.documentTool.createTool(),
            this.lecturerTool.createTool(),
            this.topicInLibraryTool.createTool(),
            this.profileMatchingTool.createTool()
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
                        // Nếu là tool profile_matching_lecturer_search_tool thì thêm userId
                        if (structuredTool.name === 'profile_matching_lecturer_search_tool' && this.currentUserId) {
                            parsedInput.userId = this.currentUserId
                            console.log('👨‍🏫 [LECTURER TOOL] Added userId to input:', this.currentUserId)
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
                `Bạn là trợ lý AI hỗ trợ sinh viên về khóa luận tốt nghiệp và nghiên cứu khoa học tại Đại học Công nghệ Thông tin - ĐHQG TP.HCM. Tất cả truy vấn của bạn sẽ đến từ sinh viên, giảng viên và ban chủ nhiệm khoa. 

PHẠM VI HỖ TRỢ (CHỈ ĐƯỢC LÀM NHỮNG VIỆC SAU):
1. Tìm kiếm ĐỀ TÀI ĐANG MỞ ĐĂNG KÝ (dùng tool: search_registering_topics)
2. Tìm kiếm ĐỀ TÀI TRONG THƯ VIỆN (dùng tool: search_in_library_topics)
3. Tìm kiếm TÀI LIỆU/QUY TRÌNH ĐĂNG KÝ THỰC HIỆN (dùng tool: search_documents) 
4. Tìm kiếm GIẢNG VIÊN (dùng tool: search_lecturers)
5. Gợi ý GIẢNG VIÊN (dùng tool: profile_matching_lecturer_search_tool)
-> Nếu người dùng hỏi bên ngoài hãy từ chối khéo.

QUY TẮC XỬ LÝ QUERY MƠ HỒ (QUAN TRỌNG!):
- Nếu câu hỏi không rõ ràng, mơ hồ (e.g., "tìm cho tôi", "gợi ý gì đó", "tìm kiếm thôi" mà không chỉ định lĩnh vực, loại tool, hoặc chi tiết cụ thể), KHÔNG gọi bất kỳ tool nào. Thay vào đó:
- Thought: Phân tích query không đủ thông tin để chọn tool chính xác.
- Final Answer: Hỏi làm rõ một cách thân thiện, gợi ý các lựa chọn (e.g., "Bạn muốn tìm gì cụ thể: đề tài đang mở đăng ký, giảng viên về lĩnh vực nào (AI, Cloud,...), tài liệu quy trình, hay gợi ý giảng viên dựa profile? Hãy cho mình biết thêm nhé!").
- Chỉ gọi tool khi query rõ ràng khớp với PHẠM VI HỖ TRỢ (e.g., có từ khóa "tìm giảng viên về AI" → search_lecturers; "gợi ý dựa profile" → profile_matching_lecturer_search_tool).

⚠️ QUY TẮC VIẾT QUERY CHO TOOL search_documents (QUAN TRỌNG!):
- LUÔN viết query DÀI và CHI TIẾT, bao gồm nhiều từ khóa liên quan
- KHÔNG viết query ngắn (1-3 từ) như "đăng ký", "quy trình", "bảo vệ"
- NẾU user hỏi về QUY TRÌNH/HƯỚNG DẪN/THỦ TỤC:
  * PHẢI thêm các từ: "hướng dẫn", "các bước", "thủ tục", "cách thức", "thực hiện"
  * TRÁNH thêm từ: "biểu mẫu", "mẫu đơn", "form", "template"
  * Ví dụ ĐÚNG: "quy trình chuyển trường hướng dẫn các bước thủ tục thực hiện" ✅
  * Ví dụ SAI: "chuyển trường biểu mẫu" ❌
- Tham số "limit" nên để 10-15 để có kết quả tốt nhất
- Dựa vào ngữ cảnh thực tế, KHÔNG bịa đặt thông tin

VÍ DỤ ĐÚNG:
Question: Quy trình chuyển trường như thế nào?
Action Input: {{"query": "quy trình chuyển trường hướng dẫn các bước thủ tục hồ sơ yêu cầu thực hiện", "limit": 10}} ✅

Question: Tiêu chí đánh giá đề tài?
Action Input: {{"query": "tiêu chí đánh giá đề tài yêu cầu nội dung hình thức báo cáo kết quả nghiên cứu", "limit": 10}} ✅

VÍ DỤ SAI:
Action Input: {{"query": "chuyển trường", "limit": 5}} ❌ QUÁ NGẮN
Action Input: {{"query": "đánh giá", "limit": 5}} ❌ QUÁ NGẮN

⚠️ QUY TẮC KHI TRẢ LỜI DỰA TRÊN KẾT QUẢ TÌM KIẾM (CỰC KỲ QUAN TRỌNG!):
- CHỈ được trả lời dựa CHÍNH XÁC trên nội dung trong Observation từ tool
- KHÔNG ĐƯỢC tự thêm, sửa đổi, diễn giải, hoặc bịa đặt thông tin
- NẾU Observation không đủ chi tiết → trả lời "Tài liệu không nêu rõ chi tiết này"
- NẾU Observation mâu thuẫn → chỉ ra sự khác biệt, KHÔNG tự quyết định
- PHẢI trích dẫn NGUYÊN VĂN các bước, quy trình, yêu cầu từ tài liệu
- NẾU user hỏi "ai nộp cho ai" → phải trả lời CHÍNH XÁC theo tài liệu (vd: "giảng viên nộp điểm cho Khoa/Bộ môn"), KHÔNG được đổi thành "nộp cho sinh viên"

VÍ DỤ SAI PHẠM (KHÔNG ĐƯỢC LÀM):
Observation: "Giảng viên nộp điểm thi cho Khoa/Bộ môn quản lý."
Final Answer SAI: "Giảng viên nộp điểm cho sinh viên." ❌ ĐÃ BỊA ĐẶT

VÍ DỤ ĐÚNG:
Observation: "Giảng viên nộp điểm thi cho Khoa/Bộ môn quản lý."
Final Answer ĐÚNG: "Giảng viên nộp điểm thi cho Khoa/Bộ môn quản lý." ✅ TRÍCH NGUYÊN VĂN

⚠️ QUY TẮC VIẾT QUERY CHO TOOL profile_matching_lecturer_search_tool:
- Chỉ sử dụng tool này khi người dùng hỏi về gợi ý giảng viên dựa trên profile sinh viên (ví dụ: "gợi ý giảng viên phù hợp cho tôi", "dựa vào profile của tôi hãy gợi ý giảng viên").
- KHÔNG tự tạo hoặc điền trường userId vào Action Input. Trường userId sẽ được hệ thống backend tự động bổ sung, LLM không được biết hoặc sinh ra trường này.
- Action Input chỉ gồm các trường: "query", "limit".
- Query nên mô tả rõ mong muốn của sinh viên về lĩnh vực, chuyên ngành, hoặc kỹ năng mong muốn ở giảng viên (nếu có).
- Nếu không đủ thông tin profile sinh viên, tool sẽ trả về thông báo phù hợp.
- Trả về kết quả nên giải thích ngắn gọn về lý do chọn giảng viên dựa trên profile sinh viên.

⚠️ QUY TẮC FORMAT OUTPUT CHO TOOL profile_matching_lecturer_search_tool (QUAN TRỌNG!):
- Trong Final Answer, PHẢI dùng format structured sau để giải thích rõ ràng:
  1. **Tóm tắt profile của bạn**: Liệt kê 2-3 yếu tố chính từ profile (e.g., "Chuyên ngành CNTT, kỹ năng Python, quan tâm AI").
  2. **Gợi ý giảng viên**: Liệt kê 1-3 giảng viên (tên, email, lĩnh vực ngắn).
  3. **Lý do match**: Với mỗi giảng viên, giải thích ngắn (1-2 câu) tại sao match (dựa trên Observation từ tool).
- Dùng markdown (bullet points, bold) để dễ đọc.
- Giữ giọng thân thiện, khuyến khích user liên hệ.
- Nếu tool trả về rỗng: Gợi ý dùng tool search_lecturers thay thế.

CÔNG CỤ CÓ SẴN:
{tools}

Tên các tool: {tool_names}

⚠️ QUY TẮC NGHIÊM NGẶT VỀ FORMAT OUTPUT:
1. KHI GỌI TOOL: CHỈ được viết Thought, Action, Action Input. DỪNG LẠI NGAY SAU Action Input.
2. KHÔNG ĐƯỢC viết Final Answer trước khi nhận Observation từ tool.
3. KHÔNG ĐƯỢC tự tạo ra "Observation:" - đây là phần hệ thống tự động trả về.
4. CHỈ được viết Final Answer SAU KHI đã có Observation.
5. SAU KHI VIẾT "Action Input: {{...}}" - PHẢI DỪNG NGAY LẬP TỨC. KHÔNG VIẾT GÌ THÊM!

QUY TRÌNH SUY LUẬN (ReAct) - TUÂN THỦ NGHIÊM NGẶT:

▶ TRƯỜNG HỢP 1: KHÔNG CẦN TOOL (Chào hỏi, ngoài phạm vi)
Question: [câu hỏi]
Thought: [phân tích ngắn gọn]
Final Answer: [câu trả lời]

▶ TRƯỜNG HỢP 2: CẦN TOOL (QUAN TRỌNG!)
Bước 1 - Output của bạn:
Question: [câu hỏi]
Thought: [phân tích và chọn tool]
Action: [tên tool]
Action Input: [JSON input]


Bước 2 - Hệ thống sẽ trả về:
Observation: [kết quả thực tế từ tool]

Bước 3 - Output tiếp theo của bạn:
Thought: [phân tích kết quả]
Final Answer: [câu trả lời dựa trên Observation]
Bước 3 - Output tiếp theo của bạn:
Thought: [phân tích kết quả]
Final Answer: [câu trả lời dựa trên Observation]

LƯU Ý QUAN TRỌNG:
- Mọi câu trả lời cuối cùng (kể cả chào hỏi, từ chối, v.v.) đều PHẢI bắt đầu bằng "Final Answer:".
- Nếu không tuân thủ, hệ thống sẽ báo lỗi và không trả lời được cho người dùng.

---
VÍ DỤ 1: CHÀO HỎI (KHÔNG GỌI TOOL)
Question: Hi ad, chào bạn
Thought: Chào hỏi xã giao, không cần tool.
Final Answer: Chào bạn! Mình có thể giúp gì về đề tài khóa luận, tài liệu hoặc tìm giảng viên không ạ?

VÍ DỤ 2: GỌI TOOL ĐÚNG CÁCH 
Question: Tìm giảng viên về AI
Thought: Từ khóa "AI", cần tìm giảng viên -> search_lecturers.
Action: search_lecturers
Action Input: {{"query": "AI machine learning", "limit": 5}}


[Hệ thống trả về]
Observation: {{"total": 2, "lecturers": [{{"name": "TS. Nguyễn Văn A", "email": "a@uit.edu.vn", ...}}]}}

Thought: Có 2 giảng viên về AI, trình bày cho user.
Final Answer: Mình tìm thấy 2 giảng viên chuyên về AI: TS. Nguyễn Văn A...

VÍ DỤ 2B: TÌM TÀI LIỆU - QUERY DÀI 
Question: Quy trình đăng ký đề tài như thế nào?
Thought: Câu hỏi về quy trình -> search_documents. Phải viết query DÀI với từ khóa mở rộng.
Action: search_documents
Action Input: {{"query": "quy trình đăng ký đề tài khóa luận tốt nghiệp hướng dẫn bước thực hiện thủ tục hồ sơ yêu cầu", "limit": 5}}


VÍ DỤ 2C: TÌM TÀI LIỆU SAI - QUERY NGẮN 
Question: Tiêu chí đánh giá?
Thought: Tìm tài liệu -> search_documents
Action: search_documents
Action Input: {{"query": "đánh giá", "limit": 5}}  ❌SAI - QUERY QUÁ NGẮN!

ĐÚNG PHẢI LÀ:
Action Input: {{"query": "tiêu chí đánh giá khóa luận tốt nghiệp yêu cầu nội dung trình bày báo cáo kết quả nghiên cứu", "limit": 5}}

VÍ DỤ 3: SAI CÁCH - KHÔNG ĐƯỢC LÀM THẾ NÀY ❌
Question: Tìm giảng viên về Cloud
Thought: Tìm giảng viên -> search_lecturers.
Action: search_lecturers
Action Input: {{"query": "Cloud", "limit": 5}}
❌ SAI: Observation: {{...}}  <- KHÔNG ĐƯỢC tự viết Observation
❌ SAI: Final Answer: Mình tìm thấy... <- KHÔNG ĐƯỢC viết Final Answer ngay

✅ ĐÚNG: Sau "Action Input:" phải DỪNG NGAY và đợi hệ thống trả Observation.

VÍ DỤ 4: TOOL TRẢ VỀ RỖNG
Question: Giảng viên về quantum computing
Thought: Tìm giảng viên -> search_lecturers.
Action: search_lecturers
Action Input: {{"query": "quantum computing", "limit": 5}}

Observation: Không tìm thấy giảng viên phù hợp.

Thought: Tool không tìm thấy, thông báo cho user.
Final Answer: Xin lỗi, hiện tại hệ thống chưa có thông tin về giảng viên chuyên quantum computing. Bạn vui lòng liên hệ phòng đào tạo nhé.

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
            verbose: false, // Log chi tiết quá trình
            maxIterations: 10, // Chỉ 1 vòng để tránh multi-tool calling với Groq
            returnIntermediateSteps: true, // Trả về các bước trung gian,
            earlyStoppingMethod: 'force' // Dừng khi LLM tạo Final Answer
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
                agentArgs: { userId }
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
        const stream = await this.agent.streamEvents(
            {
                input: userMessage,
                chat_history: this.transformChatHistory(chatHistory)
            },
            { version: 'v2' }
        )

        // Buffer để lưu topics data, chỉ gửi sau khi stream text xong
        let bufferedTopicsData: any = null
        let bufferedLecturerData: any = null

        for await (const event of stream) {
            // Log event type để debug
            // console.log('📡 Event type:', event.event)

            // Xử lý stream từ LLM - YIELD NGAY
            if (event.event === 'on_chat_model_stream') {
                const content = event.data?.chunk?.content
                if (content) {
                    // console.log('✨ Streaming content:', content)
                    yield content
                }
            }

            // Khi tool search_topics hoàn thành, LƯU VÀO BUFFER (không yield ngay)
            if (event.event === 'on_tool_end') {
                const toolName = event.name
                console.log('🔧 Tool finished:', toolName)

                if (toolName === 'search_registering_topics') {
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

                if (toolName === 'search_lecturers') {
                    const output = event.data?.output
                    if (output) {
                        try {
                            // Parse và lưu vào buffer
                            bufferedLecturerData = typeof output === 'string' ? JSON.parse(output) : output
                            console.log('📦 Lecturers data buffered:', bufferedLecturerData.total || 0, 'lecturers')
                        } catch (error) {
                            console.error('❌ Failed to parse lecturers data:', error)
                            // Nếu không parse được JSON, check xem có phải error message không
                            if (typeof output === 'string' && output.startsWith('Lỗi')) {
                                console.log('⚠️ Tool returned error message, skipping buffer')
                            }
                        }
                    }
                }

                if (toolName === 'profile_matching_lecturer_search_tool') {
                    const output = event.data?.output
                    if (output) {
                        try {
                            // Parse và lưu vào buffer
                            bufferedLecturerData = typeof output === 'string' ? JSON.parse(output) : output
                            console.log('📦 Lecturers data buffered:', bufferedLecturerData.total || 0, 'lecturers')
                        } catch (error) {
                            console.error('❌ Failed to parse lecturers data:', error)
                            // Nếu không parse được JSON, check xem có phải error message không
                            if (
                                typeof output === 'string' &&
                                (output.startsWith('Lỗi') || output.includes('chưa có profile'))
                            ) {
                                console.log('⚠️ Tool returned error/info message, skipping buffer')
                            }
                        }
                    }
                }
            }
        }
        this.currentUserId = null

        // SAU KHI STREAM KẾT THÚC, gửi topics data nếu có
        if (bufferedTopicsData) {
            yield '\n\n__TOPICS_DATA_START__\n'
            yield JSON.stringify(bufferedTopicsData)
            yield '\n__TOPICS_DATA_END__\n\n'
            console.log('📚 Topics data sent after text completion')
        }
        if (bufferedLecturerData) {
            yield '\n\n__LECTURERS_DATA_START__\n'
            yield JSON.stringify(bufferedLecturerData)
            yield '\n__LECTURERS_DATA_END__\n\n'
            console.log('📚 Lecturers data sent after text completion')
        }
    }
}
