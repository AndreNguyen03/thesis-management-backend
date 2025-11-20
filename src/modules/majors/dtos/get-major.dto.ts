import { Expose } from 'class-transformer'

export class GetMajorMiniDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    facultyId: string
}
