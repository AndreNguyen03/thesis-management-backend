import { Injectable } from '@nestjs/common'
import { Topic } from '../../topics/schemas/topic.schemas'
import mongoose, { Model } from 'mongoose'
import { StudentRegisterTopic } from '../../registrations/schemas/ref_students_topics.schemas'
import { LecturerRegisterTopic } from '../../registrations/schemas/ref_lecturers_topics.schemas'
import { InjectModel } from '@nestjs/mongoose'
import { TopicStatus } from '../../topics/enum'

@Injectable()
export class SubmitPhaseProvider {
    constructor(
        @InjectModel(Topic.name)
        private readonly topicModel: Model<Topic>
    ) {}

    async getLecturerDashboard(periodId: string, lecturerId: string) {
        const pipeline: any[] = []
        const match: any = {}
        match.periodId = new mongoose.Types.ObjectId(periodId)
        match.createBy = new mongoose.Types.ObjectId(lecturerId)
        // Chỉ lấy pha 'open_registration'
        match['phaseHistories.phaseName'] = 'submit_topic'

        pipeline.push({ $match: match })

        pipeline.push({
            $project: {
                _id: 1,
                titleVN: 1,
                type: 1,
                maxStudents: 1,
                allowManualApproval: 1,
                currentStatus: 1,
            }
        })

        return this.topicModel.aggregate(pipeline).exec()
    }

    async getStudentDashboard(periodId: string, lecturerId: string) {
        return null
    }
}
