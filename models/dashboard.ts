export type Role = "admin" | "teacher";

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: Role;
};

export type Row = Record<string, unknown>;

export type MetadataData = {
  academicYears: Row[];
  majors: Row[];
  semesters: Row[];
  rooms: Row[];
  courses: Row[];
  teachers: Row[];
  classes: Row[];
};

export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  optionKey?: keyof MetadataData;
  options?: { value: string; label: string }[];
  placeholder?: string;
  textarea?: boolean;
};

export type EntityConfig = {
  endpoint: string;
  title: string;
  desc: string;
  createLabel?: string;
  columns: [string, string][];
  fields?: Field[];
  canDelete?: boolean;
  canEdit?: boolean;
  canImport?: boolean;
};

export type ToastHandler = (message: string) => void;

export const emptyMetadata: MetadataData = {
  academicYears: [],
  majors: [],
  semesters: [],
  rooms: [],
  courses: [],
  teachers: [],
  classes: [],
};

export const numericKeys = new Set([
  "academicYearId",
  "cohortYear",
  "classId",
  "courseId",
  "semesterId",
  "roomId",
  "teacherId",
  "majorId",
  "maxStudents",
  "capacity",
  "credits",
  "maxFailedCourses",
]);

export const entityConfigs: Record<string, EntityConfig> = {
 "Phòng học": {
  endpoint: "/rooms", title: "Phòng học", desc: "Quản lý phòng dùng để xếp lịch dạy và lịch thi.", createLabel: "Thêm phòng học", canEdit: true,
  columns: [["Tên phòng", "Name"], ["Tòa nhà", "Building"], ["Sức chứa", "Capacity"], ["Mô tả", "Description"], ["Hoạt động", "IsActive"]],
  fields: [{ key: "name", label: "Tên phòng", required: true, placeholder: "Ví dụ: A301" }, { key: "building", label: "Tòa nhà", placeholder: "Ví dụ: Tòa A" }, { key: "capacity", label: "Sức chứa (số người)", type: "number", required: true }, { key: "description", label: "Mô tả", textarea: true, placeholder: "Ví dụ: phòng máy, có máy chiếu..." }]
 },
 "Năm học": {
  endpoint: "/academic-years", title: "Năm học", desc: "Bước 1: tạo năm học với khoảng ngày bao gồm các học kỳ.", createLabel: "Tạo năm học", canEdit: true,
  columns: [["Tên", "Name"], ["Bắt đầu", "StartDate"], ["Kết thúc", "EndDate"]],
  fields: [{key:"name",label:"Tên năm học (VD: 2026–2027)",required:true},{key:"startDate",label:"Ngày bắt đầu",type:"date",required:true},{key:"endDate",label:"Ngày kết thúc",type:"date",required:true}]
 },
 "Học kỳ": {
  endpoint: "/semesters", title: "Học kỳ", desc: "Bước 2: tạo học kỳ trong năm học. Đóng kỳ vẫn giữ lịch sử học phần và điểm.", createLabel: "Tạo học kỳ", canEdit: true,
  columns: [["Tên", "Name"],["Năm học", "AcademicYear.Name"],["Bắt đầu", "StartDate"],["Kết thúc", "EndDate"],["Trạng thái","Status"]],
  fields: [{key:"name",label:"Tên học kỳ (VD: HK1 2026–2027)",required:true},{key:"academicYearId",label:"Năm học",optionKey:"academicYears",required:true},{key:"startDate",label:"Ngày bắt đầu",type:"date",required:true},{key:"endDate",label:"Ngày kết thúc",type:"date",required:true},{key:"status",label:"Trạng thái",required:true,options:[{value:"planned",label:"Sắp tới"},{value:"active",label:"Đang mở"},{value:"closed",label:"Đã đóng"}]}]
 },
 "Học phần": {
  endpoint:"/course-offerings",title:"Học phần",desc:"Mỗi học phần là một môn của một lớp trong một học kỳ. Mở hoặc cập nhật lịch tại Lớp học → Môn & lịch.",
  columns:[["Lớp","Class.ClassCode"],["Môn","Course.Name"],["Học kỳ","Semester.Name"],["Giảng viên","Teacher.User.FullName"],["Phòng","Room.Name"],["Trạng thái","Status"]]
 },
  "Sinh viên": {
    endpoint: "/students",
    title: "Sinh viên",
    desc: "Tạo tài khoản và quản lý hồ sơ sinh viên.",
    createLabel: "Tạo sinh viên",
    canEdit: true,
    canDelete: true,
    canImport: true,
    columns: [
      ["Mã SV", "StudentCode"],
      ["Họ tên", "User.FullName"],
      ["Tên đăng nhập", "User.Username"],
      ["Lớp", "Class.ClassCode"],
      ["Trạng thái", "Status"],
    ],
    fields: [
      { key: "username", label: "Tên đăng nhập", required: true },
      {
        key: "password",
        label: "Mật khẩu",
        type: "password",
        placeholder: "Để trống dùng Student@123",
      },
      { key: "fullName", label: "Họ và tên", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "classId", label: "Lớp", required: true, optionKey: "classes" },
      { key: "dateOfBirth", label: "Ngày sinh", type: "date" },
      { key: "gender", label: "Giới tính" },
      { key: "phone", label: "Số điện thoại" },
      { key: "address", label: "Địa chỉ" },
      { key: "enrollmentDate", label: "Ngày nhập học", type: "date" },
    ],
  },
  "Giảng viên": {
    endpoint: "/teachers",
    title: "Giảng viên",
    desc: "Quản lý hồ sơ và tài khoản giảng viên. Mã giảng viên được cấp tự động khi lưu.",
    createLabel: "Tạo giảng viên",
    canEdit: true,
    canDelete: true,
    canImport: true,
    columns: [
      ["Mã GV", "TeacherCode"],
      ["Họ tên", "User.FullName"],
      ["Tên đăng nhập", "User.Username"],
      ["Email", "User.Email"],
      ["Trình độ", "Qualification"],
    ],
    fields: [
      { key: "username", label: "Tên đăng nhập", required: true },
      {
        key: "password",
        label: "Mật khẩu",
        type: "password",
        placeholder: "Để trống dùng Teacher@123",
      },
      { key: "fullName", label: "Họ và tên", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Số điện thoại" },
      { key: "qualification", label: "Trình độ" },
      { key: "address", label: "Địa chỉ" },
    ],
  },
  "Lớp học": {
    endpoint: "/classes",
    title: "Lớp học",
    desc: "Lớp sinh viên tồn tại qua nhiều học kỳ. Xếp sinh viên, sau đó mở môn và lịch theo từng kỳ.",
    createLabel: "Tạo lớp học",
    columns: [
      ["Mã lớp", "ClassCode"],
      ["Chuyên ngành", "Major.Name"],
      ["Giảng viên", "Teacher.User.FullName"],
      ["Phòng", "Room.Name"],
      ["Đang có", "CurrentStudents"],
      ["Học phần", "CurrentOfferings"],
      ["Sĩ số tối đa", "MaxStudents"],
      ["Trạng thái", "Status"],
    ],
    fields: [
      {
        key: "majorId",
        label: "Chuyên ngành",
        required: true,
        optionKey: "majors",
      },
      { key: "teacherId", label: "Giảng viên chủ nhiệm (không bắt buộc)", optionKey: "teachers" },
      { key: "cohortYear", label: "Năm nhập học (VD: 2026)", type: "number", required: true },
      { key: "maxStudents", label: "Sĩ số tối đa", type: "number" },
    ],
  },
  "Môn học": {
    endpoint: "/courses",
    title: "Môn học",
    desc: "Quản lý danh mục môn học và số tín chỉ.",
    createLabel: "Tạo môn học",
    canDelete: true,
    canEdit: true,
    columns: [
      ["Mã môn", "Code"],
      ["Tên môn", "Name"],
      ["Tín chỉ", "Credits"],
      ["Chuyên ngành", "Major.Name"],
    ],
    fields: [
      { key: "code", label: "Mã môn", required: true },
      { key: "name", label: "Tên môn", required: true },
      { key: "credits", label: "Tín chỉ", type: "number", required: true },
      {
        key: "majorId",
        label: "Chuyên ngành",
        required: true,
        optionKey: "majors",
      },
    ],
  },
  "Lịch thi": {
    endpoint: "/exam-schedules",
    title: "Lịch thi",
    desc: "Tạo, chỉnh sửa và xóa lịch thi; backend tự kiểm tra trùng phòng.",
    createLabel: "Tạo lịch thi",
    canDelete: true,
    canEdit: true,
    columns: [
      ["Lớp", "Class.ClassCode"],
      ["Môn", "Course.Name"],
      ["Ngày thi", "ExamDate"],
      ["Giờ", "StartTime"],
      ["Phòng", "Room.Name"],
    ],
    fields: [
      { key: "classId", label: "Lớp", required: true, optionKey: "classes" },
      {
        key: "courseId",
        label: "Môn học",
        required: true,
        optionKey: "courses",
      },
      {
        key: "semesterId",
        label: "Học kỳ",
        required: true,
        optionKey: "semesters",
      },
      { key: "roomId", label: "Phòng", required: true, optionKey: "rooms" },
      { key: "examDate", label: "Ngày thi", type: "date", required: true },
      { key: "session", label: "Ca thi", required: true },
      { key: "startTime", label: "Giờ bắt đầu", type: "time", required: true },
      { key: "endTime", label: "Giờ kết thúc", type: "time", required: true },
      { key: "examType", label: "Hình thức thi" },
      { key: "note", label: "Ghi chú" },
    ],
  },
  "Lớp của tôi": {
    endpoint: "/teacher/classes",
    title: "Lớp của tôi",
    desc: "Danh sách các lớp đang được phân công giảng dạy.",
    columns: [
      ["Mã lớp", "ClassCode"],
      ["Chuyên ngành", "Major.Name"],
      ["Phòng", "Room.Name"],
      ["Học kỳ", "Semester.Name"],
      ["Trạng thái", "Status"],
    ],
  },
};
