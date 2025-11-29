import { Expose } from 'class-transformer'
import { ResponseFacultyBoardProfileDto } from './faculty-board.dto'
import { ResponseMiniLecturerDto } from './lecturer.dto'

export class GetMiniUserDto {
    @Expose()
    _id: string
    @Expose()
    fullName: string
    @Expose()
    email: string
    @Expose()
    phone: string
    @Expose()
    avatarUrl: string
    @Expose()
    title: string
    // facultyId: string
    // facultyName: string
}
