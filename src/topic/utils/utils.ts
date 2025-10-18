import { Types } from 'mongoose'

/**
 * Chuyển các field dạng string sang ObjectId
 * @param dto object DTO
 * @param idFields danh sách key cần convert
 * @returns object mới với các field ObjectId
 */
export function convertDtoIdsToObjectId<T extends Record<string, any>>(dto: T, idFields: (keyof T)[]): Partial<T> {
    const result: Partial<T> = {}

    for (const key in dto) {
        if (dto[key] !== undefined) {
            if (idFields.includes(key as keyof T)) {
                if (Array.isArray(dto[key])) {
                    result[key] = (dto[key] as string[]).map((id) => new Types.ObjectId(id)) as any
                } else {
                    result[key] = new Types.ObjectId(dto[key] as string) as any
                }
            } else {
                result[key] = dto[key]
            }
        }
    }

    return result
}
