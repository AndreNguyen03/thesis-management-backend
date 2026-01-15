import { Injectable } from '@nestjs/common'
import { ProfileMatchingProvider } from '../providers/profile-matching.provider'
import { MatchLecturerRequestDto } from '../dtos/match-lecturer-request.dto'
import { MatchLecturerResponseDto } from '../dtos/match-lecturer-response.dto'

@Injectable()
export class MatchingService {
    constructor(private readonly profileMatchingProvider: ProfileMatchingProvider) {}

    async matchLecturers(userId: string, dto: MatchLecturerRequestDto): Promise<MatchLecturerResponseDto> {
        return this.profileMatchingProvider.matchLecturersForStudent(userId, dto.query, dto.limit)
    }
}
