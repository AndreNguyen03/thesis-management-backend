import { Inject } from '@nestjs/common'
import { TopicRepositoryInterface } from '../repository'

export class GetTopicStatisticInSubmitPhaseDto {
    periodId: string
    currentPhase: string
    rejectedTopicsNumber: number
    approvalTopicsNumber: number
    submittedTopicsNumber: number
    underReviewTopicsNumber: number
    totalTopicsNumber: number
}
export class GetTopicStatisticInOpenRegPhaseDto {
    periodId: string
    currentPhase: string
    emptyTopicsNumber: number
    registeredTopicsNumber: number
    fullTopicsNumber: number
    totalTopicsInPhaseNumber: number
}
export class GetTopicsStatisticInExecutionPhaseDto {
    periodId: string
    currentPhase: string
    inNormalProcessingNumber: number
    delayedTopicsNumber: number
    pausedTopicsNumber: number
    submittedToReviewTopicsNumber: number
    readyForEvaluationNumber: number
}

export class GetTopicsStatisticInCompletionPhaseDto {
    periodId: string
    currentPhase: string
    readyForEvaluationNumber: number
    gradedTopicsNumber: number
    achivedTopicsNumber: number
    rejectedFinalTopicsNumber: number
}

export class LecGetTopicStatisticInSubmitPhaseDto {
    periodId: string
    currentPhase: string
    rejectedTopicsNumber: number
    approvalTopicsNumber: number
    submittedTopicsNumber: number
    underReviewTopicsNumber: number
    totalTopicsNumber: number
}

export class LecGetTopicStatisticInOpenRegPhaseDto {
    periodId: string
    currentPhase: string
    emptyTopicsNumber: number
    registeredTopicsNumber: number
    totalTopicsInPhaseNumber: number
}

export class LecGetTopicsStatisticInExecutionPhaseDto {
    periodId: string
    currentPhase: string
    //Số đề tài bị hủy ở pha trước
    canceledRegisteredTopicsNumber: number
    inNormalProcessingNumber: number
    delayedTopicsNumber: number
    pausedTopicsNumber: number
    submittedTopicsNumber: number
    readyForEvaluationNumber: number
}

export class LecGetTopicsStatisticInCompletionPhaseDto {
    periodId: string
    currentPhase: string
    readyForEvaluationNumber: number
    gradedTopicsNumber: number
    achivedTopicsNumber: number
    rejectedFinalTopicsNumber: number
}
