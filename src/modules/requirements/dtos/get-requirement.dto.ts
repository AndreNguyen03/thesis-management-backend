import { Expose } from 'class-transformer'

export class GetRequirementReponseDto {
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

export class GetRequirementNameReponseDto {
    @Expose()
    name: string
    @Expose()
    slug: string
}
