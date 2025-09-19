# 🚀 NestJS Thesis Management Backend

---

## 📦 Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) >= 18  
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)  
- [Redis](https://redis.io/) (sẽ chạy bằng Docker Compose)

---

## ⚙️ Cấu hình môi trường
Tạo file `.env.development` ở thư mục gốc (tham khảo `.env.example`):


## 🐳 Khởi chạy Redis & ▶️ Chạy ứng dụng

Dự án đã có sẵn `docker-compose.yml`. Thực hiện các bước sau:

```bash
# Khởi động Redis bằng Docker Compose
docker-compose up -d

# Kiểm tra Redis container đang chạy
docker ps

# Cài đặt dependencies
npm install

# Chạy ứng dụng ở chế độ development
npm run start:dev
