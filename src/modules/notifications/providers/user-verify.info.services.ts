import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { User } from '../../../users/schemas/users.schema'
import { Socket } from 'socket.io'
import { UserRole } from '../../../auth/enum/user-role.enum'
import { GetTopicIdsProvider } from '../../registrations/provider/get-topic-ids-stu.provider'
import { CheckUserInfoProvider } from '../../../users/provider/check-user-info.provider'
import { userInfo } from 'os'
@Injectable()
export class UserVerifyInfoService {
    constructor(
        private getTopicIdsProvider: GetTopicIdsProvider,
        private checkUserInfoProvider: CheckUserInfoProvider
    ) {}
    async joinRoom(userId: string, client: Socket) {
        //1. Join vào room cá nhân
        const userRoom = `user_${userId.toString()}`
        await client.join(userRoom)
        console.log(`Client ${client.id} joined room ${userRoom}`)
        const user = await this.checkUserInfoProvider.getUserInfo(userId)
        //2. Thêm user vào nhóm chung theo role
        //Lấy facultyId của user
        let facultyId = await this.checkUserInfoProvider.getFacultyBoardIdByUserId(userId, user.role)
        switch (user.role) {
            case UserRole.LECTURER:
                //Thêm giảng viên vào nhóm GV của khoa
                await client.join(`faculty_lecturers_${facultyId}`)
                ///Lấy id những đề tài mà người này hướng dẫn
                if (this.getTopicIdsProvider) {
                    const lecTopicIds = await this.getTopicIdsProvider.getTopicIdsOfLecturer(user._id.toString())
                    for (const topicId of lecTopicIds) {
                        //Thêm người này vào các room có id đề tài mà mình HD tương ứng
                        const topicRoom = `topic_${topicId}`
                        await client.join(topicRoom)
                        console.log(`Client ${client.id} joined room ${topicRoom}`)
                        //Thêm người này vào room của giảng viên trong đề tài
                        const topicLecturerRoom = `topic_lecturers_${topicId}`
                        await client.join(topicLecturerRoom)
                        console.log(`Client ${client.id} joined room ${topicLecturerRoom}`)
                    }
                }
                break
            case UserRole.STUDENT:
                //sinh viên sẽ được thêm vào nhóm sinh viên của khoa
                await client.join(`faculty_students_${facultyId}`)
                //sinh viên được thêm vào room của đề tài đã tham gia
                ///lấy ids các đề ti đã đăng ký
                const stuTopicIds = await this.getTopicIdsProvider.getTopicIdsOfStudent(user._id.toString())
                // /thêm vào các room có _id tượng ứng
                for (const topicId of stuTopicIds) {
                    const topicRoom = `topic_${topicId}`
                    await client.join(topicRoom)
                    console.log(`Client ${client.id} joined room ${topicRoom}`)
                    const topicStudentRoom = `topic_students_${topicId}`
                    await client.join(topicStudentRoom)
                    console.log(`Client ${client.id} joined room ${topicStudentRoom}`)
                }
                break
        }
        if (!facultyId) return // admin thì không join room khoa
        //thêm gv, sv, bcn của khoa vào một room
        await client.join(`faculty_${facultyId}`)
        console.log(`Client ${client.id} joined room faculty_${facultyId}`)
    }
    //lắng nghe sự kiện từ client
    // @SubscribeMessage('my-event')
    // handleMyEvent(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    //     // Xử lý dữ liệu từ client gửi lên
    // }
}
