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
            stop: ['Observation:', '\nObservation', 'Final Answer:', 'Final Answer'] // Stop ngay khi có Final Answer hoặc Observation
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

                        if (structuredTool.name === 'search_registering_topics' && this.currentUserId) {
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
                `⚠️ **OUTPUT FORMAT RULES (TUÂN THỀ TUYỆT ĐỐI)**:
1️⃣ LUÔN bắt đầu với: "Thought: [your thinking]"
2️⃣ Nếu cần gọi tool → viết: "Action: [tool_name]\nAction Input: [json]" RỒI DỪNG
3️⃣ Nếu không cần tool → viết: "Final Answer: [trả lời]" RỒI DỪNG
4️⃣ KHÔNG ĐƯỢC viết gì khác, KHÔNG viết Observation (hệ thống tự trả về)

---

Bạn là trợ lý AI hỗ trợ sinh viên về khóa luận tốt nghiệp và nghiên cứu khoa học tại Đại học Công nghệ Thông tin - ĐHQG TP.HCM. Tất cả truy vấn của bạn sẽ đến từ sinh viên, giảng viên và ban chủ nhiệm khoa. 

PHẠM VI HỖ TRỢ (CHỈ ĐƯỢC LÀM NHỮNG VIỆC SAU):
1. Tìm kiếm ĐỀ TÀI ĐANG MỞ ĐĂNG KÝ (dùng tool: search_registering_topics)
2. Tìm kiếm ĐỀ TÀI TRONG THƯ VIỆN (dùng tool: search_in_library_topics)
3. Tìm kiếm TÀI LIỆU/QUY TRÌNH (dùng tool: search_documents) 
4. Tìm kiếm GIẢNG VIÊN (dùng tool: search_lecturers)
5. Gợi ý GIẢNG VIÊN phù hợp với profile (dùng tool: profile_matching_lecturer_search_tool)
-> Nếu người dùng hỏi bên ngoài phạm vi, từ chối khéo léo.

⚠️ QUY TẮC XỬ LÝ QUERY MƠ HỒ (NGHIÊM NGẶT!):

CÁC TRƯỜNG HỢP BẮT BUỘC PHẢI HỎI LẠI (KHÔNG ĐƯỢC GỌI TOOL):
❌ "tìm cho tôi" / "tìm giúp tôi" / "gợi ý gì đó" - THIẾU đối tượng (đề tài? giảng viên? tài liệu?)
❌ "tìm về AI" / "về machine learning" - THIẾU động từ chính (tìm đề tài? tìm giảng viên?)
❌ "có gì không?" / "xem nào" / "cho tôi xem" - THIẾU hoàn toàn thông tin
❌ Query có typo rõ ràng: "thấy tuần" (thầy/tuần?), "dề tài" (đề tài?)
❌ Mơ hồ về thời gian: "đề tài gần đây" (đang mở? trong thư viện?)

CÁCH XỬ LÝ KHI QUERY MƠ HỒ:
Thought: Query không rõ ràng vì [lý do cụ thể: thiếu đối tượng/động từ/có typo/mơ hồ về phạm vi].
Final Answer: Mình chưa rõ bạn muốn tìm gì nhé! Bạn có thể cho mình biết cụ thể hơn không:
  • 🎓 Tìm **đề tài đang mở đăng ký** về lĩnh vực gì?
  • 📚 Tìm **đề tài trong thư viện** (đã hoàn thành)?
  • 👨‍🏫 Tìm **giảng viên** chuyên về AI/Cloud/Security...?
  • 📖 Tìm **tài liệu hướng dẫn** về quy trình đăng ký/bảo vệ?
  • 💡 **Gợi ý giảng viên** phù hợp với profile của bạn?

CHỈ GỌI TOOL KHI QUERY RÕ RÀNG:
✅ "tìm đề tài về AI đang mở đăng ký" → search_registering_topics
✅ "giảng viên chuyên deep learning" → search_lecturers  
✅ "quy trình nộp báo cáo giữa kỳ" → search_documents
✅ "đề tài blockchain đã hoàn thành" → search_in_library_topics
✅ "gợi ý giảng viên dựa trên profile tôi" → profile_matching_lecturer_search_tool

ĐỘ TỰ TIN TRƯỚC KHI GỌI TOOL:
- Phải tự đánh giá: Query này rõ ràng đến mức nào? (1-10)
- Nếu < 7/10: HỎI LẠI thay vì gọi tool
- Nếu >= 7/10: Gọi tool với lý do rõ ràng trong Thought

⚠️ QUY TẮC TÌM KIẾM GIẢNG VIÊN (KHÔNG TÌM THEO PROFILE)(QUAN TRỌNG!):

KHI TÌM GIẢNG VIÊN, PHẢI PHÂN BIỆT 2 INTENT:

**INTENT A: TÌM NGƯỜI CỤ THỂ** (có tên đầy đủ họ tên)
- Query mẫu: "thầy Lê Văn Tuấn chuyên AI", "giảng viên tên Nguyễn Minh Huy"
- Đặc điểm: Có HỌ + TÊN ĐỆM + TÊN (ít nhất 2 từ, VD: "Lê Tuấn", "Nguyễn Văn A")
- Action Input PHẢI có: "name" field riêng để enforce exact matching
- Query nên kết hợp: tên + lĩnh vực (nếu có)
- Ví dụ:
  {{"query": "Lê Văn Tuấn AI machine learning", "name": "Lê Văn Tuấn", "limit": 5}}

**INTENT B: TÌM THEO LĨNH VỰC** (không có tên người hoặc chỉ có tên riêng mơ hồ)
- Query mẫu: "giảng viên chuyên AI", "ai chuyên về computer vision", "người làm blockchain"
- Đặc điểm: KHÔNG có họ tên đầy đủ, CHỈ có lĩnh vực/chuyên môn
- Action Input: chỉ có "query" với từ khóa lĩnh vực, KHÔNG có "name"
- Ví dụ:
  {{"query": "AI machine learning deep learning computer vision", "limit": 5}}

CÁCH PHÂN BIỆT:
1. Scan query tìm patterns: "Họ + Tên" (VD: "Lê Văn", "Nguyễn Minh", "Trần Anh")
2. Nếu tìm thấy → INTENT A (tìm người cụ thể)
3. Nếu không → INTENT B (tìm theo lĩnh vực)

LƯU Ý:
- "thầy Tuấn" ← CHỈ có tên riêng, không đủ → INTENT B
- "thầy Lê Tuấn" ← Có họ + tên → INTENT A
- "Lê Văn Tuấn chuyên AI" ← INTENT A, ưu tiên tên > lĩnh vực

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
- Tool này sử dụng **Semantic Vector Search** với embeddings để hiểu ngữ nghĩa câu hỏi
- Query nên dài 10-20 từ, bao gồm: động từ + danh từ chính + từ khóa liên quan + ngữ cảnh
- Ví dụ ĐÚNG: "quy trình đăng ký đề tài khóa luận tốt nghiệp hướng dẫn bước thực hiện thủ tục hồ sơ yêu cầu sinh viên cần làm" ✅
- Ví dụ SAI: "đăng ký" ❌ (quá ngắn, không có context)
- Tránh bịa đặt, dựa trên ngữ cảnh thực tế để viết query đầy đủ.
- Tham số "limit" nên để 10-15 để có kết quả tốt nhất.
- Vector search sẽ tìm kiếm dựa trên semantic similarity, hiểu được các cách diễn đạt khác nhau cùng nghĩa.

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

⚠️ **FORMAT XUẤT RA - ĐỌC KỸ**:
✅ ĐÚNG - Gọi tool: Thought: [Suy luận]\nAction: [tool_name]\nAction Input: {{"query": "...", ...}}
✅ ĐÚNG - Final Answer: Thought: [Suy luận]\nFinal Answer: [Trả lời người dùng]
❌ SAI - KHÔNG VIẾT Observation (hệ thống tự trả về)
❌ SAI - KHÔNG VIẾT gì sau Action Input
❌ SAI - KHÔNG VIẾT Final Answer trước khi nhận Observation từ tool

---


---

📋 **VÍ DỤ RÚT GỌN**:

**VÍ DỤ 1** - Chào hỏi (KHÔNG gọi tool):
- Thought: Chào hỏi, không cần tool.
- Final Answer: Chào bạn! Mình có thể giúp gì về đề tài khóa luận, tài liệu hoặc tìm giảng viên không ạ?

**VÍ DỤ 2** - Query rõ ràng, gọi tool:
- Thought: Người dùng tìm giảng viên chuyên AI, đủ rõ ràng.
- Action: search_lecturers
- Action Input: {{"query": "AI machine learning deep learning", "limit": 5}}

**VÍ DỤ 3** - Query mơ hồ (HỎI LẠI):
- Thought: Query không rõ - "tìm cho tôi" nhưng không biết tìm gì (đề tài? giảng viên? tài liệu?).
- Final Answer: Bạn muốn tìm gì ạ? 🎓 Đề tài? 👨‍🏫 Giảng viên? 📚 Tài liệu? Cho mình biết chi tiết hơn nhé!

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
