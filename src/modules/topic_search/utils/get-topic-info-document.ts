import { Document } from '@langchain/core/documents'
import { GetGeneralTopics } from '../../topics/dtos'
import { stripHtml } from '../../../common/pagination-an/utils/stripHtml'

export const topicToDocument = (topic: GetGeneralTopics) => {
    const { _id, ...nest } = topic
    return new Document({
        pageContent: `Tên đề tài bằng tiếng Anh: ${topic.titleEng}. Tên đề tài bằng tiếng Việt: ${topic.titleVN}
                    . Mô tả: ${stripHtml(topic.description)}. Giảng viên hướng dẫn: ${topic.lecturers.map((lec) => ` ${lec.title} ${lec.title} ${lec.fullName}`).join(', ')}. Lĩnh vực: ${topic.fields
                        .filter((field) => field && field.name)
                        .map((field) => field.name)
                        .join(', ')}. Yêu cầu: ${topic.requirements.map((req) => req.name).join(', ')}.
                    Số sinh viên tối đa: ${topic.maxStudents}. Số sinh viên hiện tại: ${topic.studentsNum}. Loại đề tài: ${topic.type}. Chuyên ngành: ${topic.major.name}`,
        metadata: { original_id: topic._id, facultyId: topic.major.facultyId, ...nest }
    })
}
