import { entityConfigs, type MetadataData, type Role, type ToastHandler } from "@/models/dashboard";
import { EntityPage } from "./EntityPage";
import { ClassOfferAdminPage, NotificationPage, WarningPage } from "./AdminFeatures";
import { GradeManager, TeacherOffers } from "./TeacherAcademicFeatures";
import { AttendanceManager, ExerciseManager } from "./TeacherActivityFeatures";
import { ReportPage } from "./ReportPage";
import { TeacherSchedulePage } from "./TeacherSchedulePage";
import { WebsiteAdminPage } from "./WebsiteAdminPage";

export function FeatureRouter({ role, active, token, metadata, onToast, onNavigate }: { role: Role; active: string; token: string; metadata: MetadataData; onToast: ToastHandler; onNavigate: (value: string) => void }) {
  if (entityConfigs[active]) return <EntityPage active={active} token={token} metadata={metadata} onToast={onToast} />;
  if (active === "Trang chủ trường") return <WebsiteAdminPage token={token} onToast={onToast} />;
  if (active === "Cảnh báo học vụ") return <WarningPage token={token} metadata={metadata} onToast={onToast} />;
  if (active === "Thông báo") return <NotificationPage token={token} onToast={onToast} />;
  if (active === "Phân công lớp") return <ClassOfferAdminPage token={token} metadata={metadata} onToast={onToast} />;
  if (active === "Điểm danh") return <AttendanceManager token={token} metadata={metadata} onToast={onToast} />;
  if (active === "Lịch dạy") return <TeacherSchedulePage token={token} onNavigate={onNavigate} />;
  if (active === "Bảng điểm") return <GradeManager token={token} onToast={onToast} />;
  if (active === "Bài tập") return <ExerciseManager token={token} onToast={onToast} />;
  if (active === "Đề xuất lớp") return <TeacherOffers token={token} onToast={onToast} />;
  if (active === "Báo cáo") return <ReportPage role={role} token={token} />;
  return <section className="feature-page"><h1>{active}</h1><p>Chức năng chưa được định nghĩa.</p></section>;
}
