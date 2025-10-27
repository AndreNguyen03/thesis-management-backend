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
    created_at: Date
    @Expose()
    updated_at: Date
}

export class GetFieldNameReponseDto {
    @Expose()
    name: string
    @Expose()
    slug: string
}
