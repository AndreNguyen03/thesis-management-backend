# Tên dự án: Nền tảng thông minh hỗ trợ quản lý toàn diện đề tài nghiên cứu và khóa luận tốt nghiệp

## 1. Giới thiệu dự án

Hệ thống website số hóa và tối ưu hóa quy trình quản lý, theo dõi, hỗ trợ thực hiện đề tài nghiên cứu, khóa luận tốt nghiệp trong môi trường đại học. Nâng cao hiệu quả quản lý, tăng cường tương tác giữa các bên liên quan và hỗ trợ học thuật thông minh qua AI.

## 2. Thông tin tác giả & khóa luận

- Hồ Phạm Phú An - 22520013
- Nguyễn Nguyên Ngọc Anh - 22520058
- Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM
- Giảng viên hướng dẫn: TS. Lê Văn Tuấn
- [Link báo cáo chi tiết](https://drive.google.com/drive/folders/1cpnnOiPq8z-MuOv0ZFMD9yPWqn9yJRZk?usp=sharing)

## 3. Tính năng nổi bật

### 3.1 Usecase tổng quát

<img src="docs/general-usecase.png" alt="general-use-case" width="1000"/>

- Quản lý toàn diện vòng đời đề tài: đăng ký, xét duyệt, thực hiện, bảo vệ, lưu trữ.
- Gợi ý đề tài cá nhân hóa bằng AI (Gemini Embedding, RAG).
- Chatbot AI hỗ trợ tìm kiếm thông tin, quy chế, giảng viên, đề tài.
- Quản lý tiến độ, milestone, trao đổi nhóm, nộp báo cáo, đánh giá.
- Thư viện số lưu trữ, tra cứu đề tài chất lượng cao.
- Phân quyền: sinh viên, giảng viên, ban chủ nhiệm, admin.
- Realtime chat, thông báo, quản lý kho tài liệu.

### 3.2 EPIC: Quản lý quy trình đăng ký

![manage-register-period](docs/manage-register-period.png)

### 3.3 EPIC: Quản lý đánh giá thực hiện

![manage-practicing-valueing](docs/manage-practicing-valueing.png)

## 4. Kiến trúc hệ thống & Công nghệ

### 4.1. Kiến trúc hệ thống & Công nghệ

![Kiến trúc tổng quan](docs/system-architecture.png) <!-- Thay bằng hình thực tế nếu có -->

- **Frontend:** ReactJS, Redux Toolkit, RTK Query, Socket.io
- **Backend:** NestJS (Node.js), Socket.io, LangChain, Gemini API, Groq API
- **Database:** MongoDB, MongoDB Atlas Vector Search, Redis (cache)
- **Lưu trữ:** MinIO (object storage)

### 4.2. Hệ thống Agent-based Retrieval-Augmented Generation (RAG):

![Kiến trúc RAG](docs/agent-based-rag-chatbot.png)
Hệ thống sử dụng kiến trúc RAG (Retrieval-Augmented Generation) kết hợp với
Agent (ReAct pattern), cho phép mô hình ngôn ngữ tự động lựa chọn công cụ truy
xuất thông tin phù hợp và tổng hợp kết quả trả lời dựa trên cả tri thức nội tại và
dữ liệu thực tế. Các công cụ bao gồm:

- {topics_registering}: tìm kiếm các đề tài đang mở đăng ký
- {search_lecturers}: tìm kiếm trong tập các giảng viên
- {profile_matching}: tìm kiếm các giảng viên theo hồ sơ cá nhân của sinh viên
  39
- {document}: tìm kiếm quy chế, quy trình đăng ký đề tài trong tập kiến thức

## 5. Các màn hình chính

### 5.1. Màn hình Trợ lý AI

<img src="docs/screen/AI-assistant.png" alt="Màn hình Trợ lý AI" width="800"/>

### 5.2 Màn hình dashboard sinh viên

<img src="docs/screen/manage-lecturer-profile.png" alt="Màn hình dashboard sinh viên" width="800"/>

### 5.3 Màn hình đăng nhập

<img src="docs/screen/login-system.png" alt="Màn hình đăng nhập" width="800"/>

### 5.4 Màn hình quản lý hồ sơ cá nhân

<img src="docs/screen/manage-personal-profile.png" alt="Màn hình quản lý hồ sơ cá nhân" width="800"/>

### 5.5 Màn hình quản lý hồ sơ giảng viên

<img src="docs/screen/manage-lecturer-profile.png" alt="Màn hình quản lý hồ sơ giảng viên" width="800"/>

### 5.6 Màn hình nhắn tin liên hệ

<img src="docs/screen/contact-message.png" alt="Màn hình nhắn tin liên hệ" width="800"/>

### 5.7 Màn hình quản lý các đợt đăng kí

<img src="docs/screen/manage-registration-periods.png" alt="Màn hình quản lý các đợt đăng kí" width="800"/>

### 5.8 Màn hình phân công nhân sự, đề tài cho hội đồng bảo vệ

<img src="docs/screen/assign-council.png" alt="Màn hình phân công nhân sự, đề tài cho hội đồng bảo vệ" width="800"/>

### 5.9 Màn hình quản lý các cột mốc quan trọng của khoa

<img src="docs/screen/manage-important-milestones.png" alt="Màn hình quản lý các cột mốc quan trọng của khoa" width="800"/>

### 5.10 Màn hình quản lý điểm số đề tài trong đợt bảo vệ

<img src="docs/screen/manage-points-in-council.png" alt="Màn hình quản lý điểm số đề tài trong đợt bảo vệ" width="800"/>

### 5.11 Màn hình quản lý lưu trữ đề tài vào thư viện

<img src="docs/screen/manage-storing-to-library.png" alt="Màn hình quản lý lưu trữ đề tài vào thư viện" width="800"/>

### 5.12 Màn hình chi tiết đề tài

<img src="docs/screen/detail-topic.png" alt="Màn hình chi tiết đề tài" width="800"/>

### 5.13 Màn hình làm việc nhóm

<img src="docs/screen/manage-group-tasks.png" alt="Màn hình làm việc nhóm" width="800"/>

### 5.14 Màn hình làm việc nhóm - Thành phần chi tiết công việc

<img src="docs/screen/manage-group-tasks_detail-task.png" alt="Màn hình làm việc nhóm - Thành phần chi tiết công việc" width="800"/>

### 5.15 Màn hình làm việc nhóm - Thành phần chat

<img src="docs/screen/manage-group-tasks_group-chat.png" alt="Màn hình làm việc nhóm - Thành phần chat" width="800"/>

### 5.16 Màn hình làm việc nhóm - Thành phần tài liệu tham khảo

<img src="docs/screen/manage-group-tasks_reference-document.png" alt="Màn hình làm việc nhóm - Thành phần tài liệu tham khảo" width="800"/>

### 5.17 Màn hình tạo đề tài

<img src="docs/screen/manage-prepare-new-topic.png" alt="Màn hình tạo đề tài" width="800"/>

### 5.18 Màn hình quản lý chatbot - cấu hình

<img src="docs/screen/configure-chatbot-information.png" alt="Màn hình quản lý chatbot - cấu hình" width="800"/>

## 6. Kiến trúc dữ liệu (tóm tắt)

- Users, Students, Lecturers, Topics, Groups, Messages, Milestones, Files, Notifications, ...
- Xem chi tiết tại phần thiết kế CSDL trong [tài liệu khóa luận](https://drive.google.com/drive/folders/1cpnnOiPq8z-MuOv0ZFMD9yPWqn9yJRZk?usp=sharing).

## 7. Đóng góp & phát triển

- Hướng phát triển: nâng cấp AI, mở rộng kết nối doanh nghiệp - tìm kiếm tài năng từ trường học, phân tích dữ liệu, bổ sung chức năng thống kê, báo cáo.
