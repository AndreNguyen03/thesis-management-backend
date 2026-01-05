import { Expose } from 'class-transformer'
import { GetTopicStatisticInSubmitPhaseDto } from '../../topics/dtos/get-statistics-topics.dtos'

export class GetStatiticInPeriod {
    @Expose()
    periodId: string
    @Expose()
    currentPhase: string

    //config for  submit topic phase
    @Expose()
    rejectedTopicsNumber: number
    @Expose()
    approvalTopicsNumber: number
    @Expose()
    submittedTopicsNumber: number
    @Expose()
    totalTopicsNumber: number

    //config for open registration phase
    @Expose()
    emptyTopicsNumber: number
    @Expose()
    registeredTopicsNumber: number
    @Expose()
    fullTopicsNumber: number
    @Expose()
    totalTopicsInPhaseNumber: number

    //config for execution phase
    @Expose()
    inNormalProcessingNumber: number
    @Expose()
    delayedTopicsNumber: number
    @Expose()
    pausedTopicsNumber: number
    @Expose()
    submittedToReviewTopicsNumber: number
    @Expose()
    readyForEvaluationNumber: number

    //config for completion phase
    // readyForEvaluationNumber: number
    @Expose()
    assignedTopicsNumber: number
    @Expose()
    gradedTopicsNumber: number
    @Expose()
    achivedTopicsNumber: number
    @Expose()
    rejectedFinalTopicsNumber: number
}
