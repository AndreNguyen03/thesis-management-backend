import { IsEnum, IsNotEmpty, ValidateNested } from 'class-validator'
import { MissingTopicRecord } from '../../periods/dtos/phase-resolve.dto'
import { PeriodPhaseName } from '../../periods/enums/period-phases.enum'

export class RequestReminderLecturers {
    @IsNotEmpty()
    periodId: string
    @IsNotEmpty()
    @IsEnum(PeriodPhaseName)
    phaseName: PeriodPhaseName
    @IsNotEmpty()
    deadline: Date
}
