import { Injectable } from '@nestjs/common'
import { StudentProfileDto } from '../../../users/dtos/student.dto'

// services/student-summary-builder.service.ts
@Injectable()
export class StudentSummaryBuilderService {
    buildSemanticSummary(profile: StudentProfileDto): string {
        return `
            Sinh viên có các kỹ năng gồm ${profile.skills?.join(', ') || 'chưa có thông tin'}.
            Sinh viên quan tâm đến các lĩnh vực như ${profile.interests?.join(', ') || 'chưa xác định'}.
            Mô tả thêm về nền tảng và định hướng: ${profile.bio || 'không có mô tả'}.
            `
    }

    buildLexicalSummary(profile: StudentProfileDto): string {
        return `${profile.skills?.join(' ')} ${profile.interests?.join(' ')} ${profile.bio || ''}`.toLowerCase()
    }
}
