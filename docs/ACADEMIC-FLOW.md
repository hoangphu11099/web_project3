# Môn học, học phần và lớp học phần

Quy ước của dự án: một môn học tương ứng một học phần có mã môn và số tín chỉ.
Một học phần có thể mở nhiều lớp học phần trong các học kỳ hoặc lớp sinh hoạt khác nhau.

- `Course`: danh mục môn/học phần thuộc chuyên ngành, ví dụ JAVA101, Lập trình Java, 3 tín chỉ.
- `Class`: lớp sinh hoạt theo khóa, ví dụ K26_WEB_01. Sinh viên được xếp lớp sau khi đăng ký chuyên ngành.
- `CourseOffering`: lớp học phần của một môn trong một học kỳ, tổ chức cho một lớp sinh hoạt; có mã riêng LHP000001, giảng viên, phòng và các buổi học. Nhiều CourseOffering có thể dùng cùng CourseID. Một tổ hợp môn + lớp sinh hoạt + học kỳ hiện chỉ có một lớp học phần.
- `CourseRegistration`: yêu cầu đăng ký một CourseOffering cụ thể và trạng thái xác nhận học phí.
- `Enrollment`: việc học chính thức của sinh viên tại CourseOffering; điểm và điểm danh gắn với lần học này.

Luồng: đăng ký chuyên ngành → xem lớp học phần thuộc ngành → chọn lớp học phần → chờ học phí → admin xác nhận → xếp lịch/học chính thức → điểm danh, nhập điểm và tổng kết.
Sinh viên chưa có lớp sinh hoạt vẫn xác định được chuyên ngành từ hồ sơ tuyển sinh.
Đăng ký lớp học phần không đổi lớp sinh hoạt của sinh viên. Một sinh viên không đăng ký hai lớp học phần của cùng một môn trong cùng học kỳ.

Trang Học phần của admin hiển thị các lớp học phần theo lớp sinh hoạt để dễ quản lý; lịch chỉ tải khi mở Chi tiết. Mã LHP được tính từ ID hiện có nên không thay đổi dữ liệu hoặc khóa liên kết.

Phạm vi hiện tại không có bảng chương trình đào tạo được quản lý phiên bản và không tách một môn thành nhiều học phần con. Không dùng CourseOffering để biểu diễn học phần con: đó là lớp mở dạy của học phần. Muốn hỗ trợ học phần lý thuyết/thực hành riêng có tín chỉ, điều kiện tiên quyết riêng cần bổ sung mô hình chương trình và học phần trước.
