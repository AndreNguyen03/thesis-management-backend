import { Inject, Injectable } from '@nestjs/common'
import { BaseRepositoryInterface } from '../../shared/base/repository/base.repository.interface'
import { GetTopicResponseDto } from '../dtos'
import { Archive } from '../schemas/archive.schemas'

export interface ArchiveRepositoryInterface extends BaseRepositoryInterface<Archive> {
    archiveTopic(userId: string, role: string, TopicId: string): Promise<GetTopicResponseDto>
    unarchiveTopic(userId: string, TopicId: string, role: string): Promise<GetTopicResponseDto>
    findSavedThesesByUserId(userId: string, role: string): Promise<GetTopicResponseDto[]>
    // findSavedLecturesByUserIds(userIds: string): Promise<string[]>
}
