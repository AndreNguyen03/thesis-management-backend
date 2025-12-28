export function ParseDay(date: Date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}
