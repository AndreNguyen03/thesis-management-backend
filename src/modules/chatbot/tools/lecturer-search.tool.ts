import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

export class LecturerSearchTool {
    createTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'search_lecturers',
            description: `
Công cụ tìm kiếm GIẢNG VIÊN hướng dẫn.

SỬ DỤNG KHI:
- Người dùng hỏi về giảng viên
- Muốn tìm giảng viên theo chuyên môn
- Hỏi "giảng viên nào chuyên về AI?"

VÍ DỤ QUERY:
- "Giảng viên chuyên về machine learning"
- "Thầy/cô hướng dẫn blockchain"

OUTPUT: Danh sách giảng viên + chuyên môn
            `.trim(),
            schema: z.object({
                query: z.string(),
                limit: z.number().optional().default(5)
            }) as any,
            func: async ({ query, limit }) => {
                // TODO: Implement khi có data lecturer
                return 'Tính năng tìm giảng viên đang được phát triển.'
            }
        })
    }
}
