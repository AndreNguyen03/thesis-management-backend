// constants/cache.constants.ts
export const CACHE_TTL = {
    // Short cache (frequently changing)
    SHORT: 5 * 60 * 1000, // 5 phút

    // Medium cache (moderately changing)
    MEDIUM: 30 * 60 * 1000, // 30 phút

    // Long cache (rarely changing)
    LONG: 2 * 60 * 60 * 1000, // 2 giờ

    // Very long cache (almost static)
    VERY_LONG: 24 * 60 * 60 * 1000, // 24 giờ

    // Default
    DEFAULT: 30 * 60 * 1000 // 30 phút
} as const
