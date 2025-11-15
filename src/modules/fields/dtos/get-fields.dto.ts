import { Expose } from 'class-transformer'

export class GetFieldReponseDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    slug: string
    @Expose()
    description: string
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
}

export class GetFieldNameReponseDto {
    @Expose()
    _id: string
    @Expose()
    name: string
    @Expose()
    slug: string
}
