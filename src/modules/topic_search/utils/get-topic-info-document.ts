import { Document } from '@langchain/core/documents'
import { GetGeneralTopics, TopicsInLibrary } from '../../topics/dtos'
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

export const topicsChunkToDocuments = (topic: GetGeneralTopics) => {
    const documents: Document[] = []
    documents.push(
        new Document({
            pageContent:
                `Đề tài nghiên cứu về ${topic.titleVN}. ${topic.titleEng}?` + `Tên tiếng Anh: ${topic.titleEng}.`,
            metadata: { original_id: topic._id, facultyId: topic.major.facultyId }
        }),
        new Document({
            pageContent: `Mô tả đề tài: ${stripHtml(topic.description)}`,
            metadata: { original_id: topic._id, facultyId: topic.major.facultyId }
        }),
        new Document({
            pageContent: ` Yêu cầu kiến thức và kỹ năng:
        ${topic.requirements?.map((req) => req.name).join(', ')}`,
            metadata: { original_id: topic._id, facultyId: topic.major.facultyId }
        }),
        new Document({
            pageContent: ` Chuyên ngành phù hợp:
        ${topic.major?.name}`,
            metadata: { original_id: topic._id, facultyId: topic.major.facultyId }
        })
    )
}

export const topicToContentString = (topic: GetGeneralTopics | TopicsInLibrary): string => {
    return `
      Đề tài nghiên cứu về ${topic.titleVN}.
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
                `.trim()
}
