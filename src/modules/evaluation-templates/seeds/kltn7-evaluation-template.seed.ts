import { EvaluationTemplate } from '../../milestones/schemas/evaluation-template.schema'

/**
 * Seed data: Template đánh giá KLTN-7 cho Khoa Công nghệ Thông tin
 * Dựa trên file ảnh: "PHẦN CHẤM ĐIỂM DÀNH CHO THÀNH VIÊN HỘI ĐỒNG"
 */
export const KLTN7_EVALUATION_TEMPLATE: Partial<EvaluationTemplate> = {
    name: 'KLTN-7 - Khoa Công nghệ Thông tin',
    version: 1,
    isActive: true,
    description: 'Template đánh giá khóa luận tốt nghiệp dành cho sinh viên ngành Kỹ thuật Phần mềm - KLTN-7',
    criteria: [
        {
            id: '1',
            category: 'Ý nghĩa khoa học, giá trị thực tiễn',
            maxScore: 3.0,
            elos: 'LO2, LO3',
            subcriteria: [
                {
                    id: '1.1',
                    name: 'Tính mới và độ phức tạp',
                    maxScore: 1.5,
                    elos: 'LO2'
                },
                {
                    id: '1.2',
                    name: 'Tính thực tiễn và đóng góp',
                    maxScore: 1.5,
                    elos: 'LO3'
                }
            ]
        },
        {
            id: '2',
            category: 'Vận dụng kiến thức nền tảng và chuyên sâu ngành KTPM',
            maxScore: 3.0,
            elos: 'LO3, LO4',
            subcriteria: [
                {
                    id: '2.1',
                    name: 'Khả năng tìm hiểu, phân tích yêu cầu và thiết kế hệ thống',
                    maxScore: 1.0,
                    elos: 'LO3'
                },
                {
                    id: '2.2',
                    name: 'Khả năng hiện thực hoá, kiểm thử và vận hành hệ thống, khả năng làm việc nhóm, quản lý giải pháp',
                    maxScore: 1.0,
                    elos: 'LO4'
                },
                {
                    id: '2.3',
                    name: 'Học hỏi và cập nhật kiến thức, công nghệ mới, khả năng học tập suốt đời',
                    maxScore: 1.0,
                    elos: 'LO3'
                }
            ]
        },
        {
            id: '3',
            category: 'Trình bày kết quả',
            maxScore: 3.0,
            elos: 'LO6, LO8',
            subcriteria: [
                {
                    id: '3.1',
                    name: 'Nội dung trình bày cuốn báo và sản phẩm (viết)',
                    maxScore: 1.0,
                    elos: 'LO6, LO8'
                },
                {
                    id: '3.2',
                    name: 'Kỹ năng trình bày (nói)',
                    maxScore: 1.0,
                    elos: 'LO6'
                },
                {
                    id: '3.3',
                    name: 'Trả lời các câu hỏi',
                    maxScore: 1.0,
                    elos: 'LO8'
                }
            ]
        },
        {
            id: '4',
            category: 'Kỹ năng mềm',
            maxScore: 1.0,
            elos: 'LO4, LO5, LO6, LO7',
            subcriteria: [
                {
                    id: '4.1',
                    name: 'Lập kế hoạch và quản lý thời gian, công việc của cá nhân hoặc đội nhóm',
                    maxScore: 0.5,
                    elos: 'LO5, LO7'
                },
                {
                    id: '4.2',
                    name: 'Kỹ năng tìm hiểu, đọc hiểu tài liệu ngoại ngữ và khả năng tự duy, giải quyết vấn đề',
                    maxScore: 0.5,
                    elos: 'LO4, LO6'
                }
            ]
        }
    ]
}
