export interface ActiveUserData {
    // id of user
    sub: string

    // email of user
    email: string

    // device id
    deviceId: string

    // role
    role: 'student' | 'lecturer' | 'admin' | 'faculty_board'

    facultyId?: string
}
