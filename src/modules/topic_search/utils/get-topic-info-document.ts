import { Document } from '@langchain/core/documents'
import { GetGeneralTopics } from '../../topics/dtos'
import { stripHtml } from '../../../common/pagination-an/utils/stripHtml'

export const topicToDocument = (topic: GetGeneralTopics) => {
    const { _id, ...nest } = topic
    return new Document({
        pageContent: `Đề tài nghiên cứu về ${topic.titleVN}.
        ${topic.titleEng ? `Tên tiếng Anh: ${topic.titleEng}.` : ''}

        Mô tả đề tài:
        ${stripHtml(topic.description)}

        Lĩnh vực và hướng nghiên cứu:
        ${topic.fields?.map((f) => f.name).join(', ')}

        Yêu cầu kiến thức và kỹ năng:
        ${topic.requirements?.map((req) => req.name).join(', ')}

        Chuyên ngành phù hợp:
        ${topic.major?.name}

        Tóm tắt:
        Đề tài này phù hợp với sinh viên quan tâm đến ${topic.fields
            ?.map((f) => f.name)
            .slice(0, 2)
            .join(', ')},
        yêu cầu nền tảng về ${topic.requirements
            ?.map((r) => r.name)
            .slice(0, 3)
            .join(', ')}.
                `.trim(),
        metadata: { original_id: topic._id, facultyId: topic.major.facultyId, ...nest }
    })
}
