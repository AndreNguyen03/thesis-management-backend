export const stripHtml = (html: any) => {
    if (!html) return "";
    return String(html)
        .replace(/<[^>]+>/g, " ") // Thay thế thẻ HTML bằng khoảng trắng
        .replace(/&nbsp;/g, " ")  // Thay thế khoảng trắng đặc biệt (nếu có)
        .replace(/\s+/g, " ")     // Xóa khoảng trắng thừa liên tiếp
        .trim();
};