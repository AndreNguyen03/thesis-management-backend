import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { DefenseCouncilRepository } from '../repository/defense-council.repository'

export const REQUIRED_COUNCIL_ROLES_KEY = 'councilRoles'

/**
 * Guard kiểm tra role của user trong hội đồng bảo vệ
 * Sử dụng: @CouncilRoles('secretary', 'chairperson')
 */
@Injectable()
export class CouncilRoleGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private defenseCouncilRepository: DefenseCouncilRepository
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(REQUIRED_COUNCIL_ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ])

        if (!requiredRoles || requiredRoles.length === 0) {
            return true // Không yêu cầu role đặc biệt
        }

        const request = context.switchToHttp().getRequest()
        const user = request.user
        const councilId = request.params.councilId

        if (!councilId) {
            throw new ForbiddenException('Không tìm thấy councilId trong request')
        }

        // Lấy thông tin hội đồng
        const council = await this.defenseCouncilRepository.getCouncilById(councilId)

        // Kiểm tra user có trong hội đồng không
        const userRoles: string[] = []

        for (const topic of council.topics) {
            for (const member of topic.members) {
                if (member.memberId.toString() === user.sub) {
                    userRoles.push(member.role)
                }
            }
        }

        // Kiểm tra có role phù hợp không
        const hasRole = requiredRoles.some((role) => userRoles.includes(role))

        if (!hasRole) {
            throw new ForbiddenException(
                `Bạn không có quyền thực hiện hành động này. Yêu cầu: ${requiredRoles.join(', ')}`
            )
        }

        // Lưu roles vào request để controller có thể sử dụng
        request.councilRoles = userRoles

        return true
    }
}

/**
 * Decorator để chỉ định các role được phép trong hội đồng
 * @param roles - Danh sách role: 'secretary', 'chairperson', 'member', 'reviewer', 'supervisor'
 */
export const CouncilRoles = (...roles: string[]) => {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        Reflect.defineMetadata(REQUIRED_COUNCIL_ROLES_KEY, roles, descriptor ? descriptor.value : target)
        return descriptor || target
    }
}
