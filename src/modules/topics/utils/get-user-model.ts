import { UserRole } from '../../../auth/enum/user-role.enum'

export const getUserModelFromRole = (role: string) => {
    switch (role) {
        case UserRole.STUDENT:
            return 'Student'
        case UserRole.LECTURER:
            return 'Lecturer'
        case UserRole.ADMIN:
            return 'Admin'
    }
}
