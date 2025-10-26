import { Inject, Injectable } from '@nestjs/common'
import { BaseRepositoryInterface } from '../../../shared/base/repository/base.repository.interface'
import { GetTopicResponseDto } from '../dtos'
import { UserSavedTopics } from '../schemas/user_saved_topics.schemas'

export interface UserSavedTopicRepositoryInterface extends BaseRepositoryInterface<UserSavedTopics> {
    assignSaveTopic(userId: string, topicId: string): Promise<UserSavedTopics>
    unassignSaveTopic(userId: string, topicId: string): Promise<string>
    // findSavedLecturesByUserIds(userIds: string): Promise<string[]>
}
