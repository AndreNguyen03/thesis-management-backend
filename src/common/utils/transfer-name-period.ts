import { GetPeriodDto } from '../../modules/periods/dtos/period.dtos'

const typeLabels = {
    thesis: 'Khóa luận',
    scientific_research: 'Nghiên cứu khoa học'
} as const

export function transferNamePeriod(currentPeriod: GetPeriodDto): string {
    return `Kì hiện tại: ${currentPeriod.year} • HK ${currentPeriod.semester} • ${typeLabels[currentPeriod.type]}`
}
