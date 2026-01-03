import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import { Auth } from '../../auth/decorator/auth.decorator'
import { AuthType } from '../../auth/enum/auth-type.enum'
import { DashboardService } from './application/dashboard.service'
import { ActiveUserData } from '../../auth/interface/active-user-data.interface'

@Controller('dashboard')
@Auth(AuthType.Bearer)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('/lecturer')
    async lecturerDashboard(@Req() req: { user: ActiveUserData }) {
        if (!req.user.facultyId) return { message: 'Chua co facultyId' }
        const result = await this.dashboardService.getLecturerDashboard(req.user.sub, req.user.facultyId)
        return result
    }

    @Get('/student')
    async studentDashboard(@Req() req: { user: ActiveUserData }) {
        if (!req.user.facultyId) return { message: 'Chua co facultyId' }
        const result = await this.dashboardService.getStudentDashboard(req.user.sub, req.user.facultyId)
        return result
    }
}
