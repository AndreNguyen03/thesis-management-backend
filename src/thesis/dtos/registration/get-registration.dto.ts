import { Prop } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { RegistrationStatus } from '../../enum'
import { ThesisDto } from '../../../users/dtos/lecturer.dto'
import { GetThesisResponseDto } from '../getThesis.dto'
import { Expose, Type } from 'class-transformer'
@Expose()
export class GetRegistrationDto {
    @Expose()
    _id: string
    @Expose()
    @Type(() => GetThesisResponseDto)
    thesis: GetThesisResponseDto
    @Expose()
    status: RegistrationStatus
    @Expose()
    createdAt: Date
    @Expose()
    updatedAt: Date
    @Expose()
    deleted_at?: Date | null
}
