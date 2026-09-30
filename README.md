# EduSync Web Dashboard

Dashboard web cho **Admin** và **Teacher**. Xem hướng dẫn đầy đủ tại `../../README.md`.

## Chạy nhanh

```powershell
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Web không còn fallback sang dữ liệu demo khi API lỗi; thanh trạng thái kết nối và thông báo lỗi sẽ phản ánh backend thật.

## Luồng quản lý lớp và điểm danh

1. Admin tạo lớp. Backend tự sinh mã dạng `K26_WEB_01`; giao diện không cho nhập mã lớp.
2. Trên dòng của lớp, admin chọn **Phân công môn** để chọn môn, giảng viên, phòng, thứ và giờ dạy.
3. Admin tạo hoặc thêm sinh viên vào lớp. Backend tự sinh mã dạng `STD001` và tự tạo `Enrollment` cho các học phần đang mở.
4. Nếu thêm học phần sau khi lớp đã có sinh viên, backend tự đồng bộ toàn bộ sinh viên sang học phần mới.
5. Đến đúng ngày dạy, giảng viên vào **Điểm danh**, chọn tiết hôm nay và chỉ có thể mở phiên từ 15 phút trước giờ bắt đầu đến hết tiết.

Không nhập thủ công `classCode`, `studentCode`, lớp/môn/ngày điểm danh ở phía giảng viên.

## Các trang Admin

Tổng quan · Sinh viên · Giảng viên · Lớp học · Môn học · Lịch thi · Cảnh báo học vụ · Thông báo · Phân công lớp · Lịch dạy giảng viên · Báo cáo.

## Các trang Teacher

Tổng quan · Lớp của tôi · Điểm danh QR · Bảng điểm · Bài tập/chấm bài · Đề xuất lớp · Báo cáo.
