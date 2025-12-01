import { Injectable } from '@nestjs/common'

@Injectable()
export class ValidateTopicStatusProvider {
    //kiểm tra thứ tự của việc chuyển trạng thái
    async validateStatusManualTransition(currentStatus: string, newStatus: string): Promise<boolean> {
        const validTransitions = {
            draft: ['submitted'], //ok
            submitted: ['approved', 'rejected', 'under_review', 'draft' ],
            under_review: ['approved', 'rejected'],
            refected: [],
            approved: ['in_progress'],
            in_progress: ['delayed', 'paused', 'submitted_for_review'],
            delayed: ['in_progress'],
            paused: ['in_progress'],
            submitted_for_review: ['awaiting_evaluation'],
            awaiting_evaluation: ['graded', 'rejected_final'],
            graded: ['reviewed'],
            reviewd: ['archived'],
            archived: [],
            rejected_final: []
        }
        return validTransitions[currentStatus]?.includes(newStatus) ?? false
    }
}
