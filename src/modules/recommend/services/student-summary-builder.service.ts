import { Injectable } from '@nestjs/common'
import { StudentProfileDto } from '../../../users/dtos/student.dto'

// services/student-summary-builder.service.ts
@Injectable()
export class StudentSummaryBuilderService {
    buildSemanticSummary(profile: StudentProfileDto): string {
        return `
      STUDENT PROFILE:
      Skills: ${profile.skills?.join(', ') || 'Chưa có'}
      Interests: ${profile.interests?.join(', ') || 'Chưa có'}
      Bio: ${profile.bio || 'Chưa có'}
    `
    }

    buildLexicalSummary(profile: StudentProfileDto): string {
        return `${profile.skills?.join(' ')} ${profile.interests?.join(' ')} ${profile.bio || ''}`.toLowerCase()
    }
}
