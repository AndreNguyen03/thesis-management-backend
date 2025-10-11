import { Inject, Injectable } from '@nestjs/common'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { GetThesisResponseDto } from '../dtos'
import { Archive } from '../schemas/archive.schemas'

export interface ArchiveRepositoryInterface extends BaseRepositoryInterface<Archive> {
    archiveThesis(userId: string, role: string, thesisId: string): Promise<GetThesisResponseDto>
    unarchiveThesis(userId: string, thesisId: string, role: string): Promise<GetThesisResponseDto>
    findSavedThesesByUserId(userId: string, role: string): Promise<GetThesisResponseDto[]>
    // findSavedLecturesByUserIds(userIds: string): Promise<string[]>
}
