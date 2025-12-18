import { remove as removeDiacritics } from 'diacritics' // npm install diacritics

export function generateEmail(fullName: string, existedEmails: Set<string>, domain = 'uit.edu.vn') {
    // 1. Loại dấu và chuyển sang lowercase
    const cleanName = removeDiacritics(fullName).toLowerCase().trim()
    const parts = cleanName.split(/\s+/)
    const lastName = parts.pop() || ''
    const initials = parts.map((p) => p[0]).join('') // các chữ cái đầu
    let baseEmail = `${lastName}${initials}`

    // 2. Kiểm tra trùng và thêm số nếu cần
    let email = `${baseEmail}@${domain}`
    let counter = 1
    while (existedEmails.has(email)) {
        email = `${baseEmail}${counter}@${domain}`
        counter++
    }

    existedEmails.add(email) // mark là đã sử dụng
    return email
}
