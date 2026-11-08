"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiRequest } from "@/controllers/api.controller";
import { defaultSiteSettings, normalizeSiteSettings } from "@/models/publicWebsite";
import "./guide.css";

const steps = [
  ["Lịch học", "Mở Lịch học để xem ngày, ca học, môn và phòng. Kiểm tra thông báo đổi lịch hoặc học bù trước khi đến lớp."],
  ["Đăng ký học phần", "Chọn lớp học phần đúng chuyên ngành. Sau khi đăng ký, liên hệ học vụ để đối chiếu học phí. Lịch chính thức được cập nhật sau khi xác nhận và xếp lịch."],
  ["Điểm danh", "Mở Điểm danh khi giảng viên đã mở phiên cho buổi học. Quét mã QR được cung cấp, cho phép truy cập camera khi được hỏi và kiểm tra kết quả ghi nhận."],
  ["Nộp bài tập", "Vào Bài tập, chọn đúng môn, xem yêu cầu và hạn nộp. Điền nội dung, đính kèm tài liệu nếu có, gửi bài và kiểm tra trạng thái đã nộp."],
  ["Xem điểm", "Mở mục Điểm để xem kết quả. Điểm chính thức được công bố sau khi giảng viên duyệt; liên hệ giảng viên nếu cần kiểm tra lại."],
  ["Thông báo", "Theo dõi thông báo từ nhà trường và giảng viên để cập nhật lịch thi, lịch học và các yêu cầu học tập."],
];

export default function GuidePage() {
  const [settings,setSettings]=useState(defaultSiteSettings);
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{const controller=new AbortController();let active=true;
    apiRequest("","/public/home",{signal:controller.signal}).then(result=>{if(active)setSettings(normalizeSiteSettings(result.data?.settings||{}));}).catch(()=>{if(active)setFailed(true);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[]);
  const canDownload=settings.downloadEnabled&&/^https?:\/\//i.test(settings.downloadUrl);
  return <main className="installation-guide">
    <header className="guide-header"><Link href="/" className="guide-brand"><Image src={settings.logoUrl||"/pp-academy-logo.png"} width={52} height={52} unoptimized alt=""/><span>{settings.schoolName}<small>Trung tâm hướng dẫn</small></span></Link><Link className="guide-link" href="/">← Về trang chủ</Link></header>
    <section className="guide-hero"><span className="guide-eyebrow">ĐỒNG HÀNH CÙNG SINH VIÊN</span><h1>Cài đặt dễ dàng.<br/>Học tập chủ động.</h1><p>Mọi bước cần biết để bắt đầu sử dụng ứng dụng {settings.schoolName}, từ đăng nhập đến theo dõi việc học mỗi ngày.</p><div className="guide-actions"><a className="guide-button" href="#cai-dat">Bắt đầu cài đặt ↓</a><a className="guide-outline" href="#su-dung">Hướng dẫn sử dụng</a></div><div className="guide-highlights"><span>01 · Cài đặt ứng dụng</span><span>02 · Kích hoạt tài khoản</span><span>03 · Bắt đầu học tập</span></div></section>
    <div className="guide-layout"><nav className="guide-nav" aria-label="Mục lục hướng dẫn"><strong>TRÊN TRANG NÀY</strong><a href="#cai-dat">Cài đặt ứng dụng</a><a href="#dang-nhap">Đăng nhập lần đầu</a><a href="#su-dung">Sử dụng hằng ngày</a><a href="#cau-hoi">Câu hỏi thường gặp</a><a href="#ho-tro">Liên hệ hỗ trợ</a></nav><div className="guide-content">
      <section id="cai-dat" className="guide-section"><span className="guide-number">01 / CÀI ĐẶT</span><h2>Chuẩn bị ứng dụng trên điện thoại</h2><p>Kết nối Internet và chuẩn bị tài khoản do nhà trường cấp. Chọn hướng dẫn phù hợp với thiết bị của bạn.</p><div className="guide-device-grid"><article><h3>Điện thoại Android</h3><ol><li>Mở đường dẫn bản cài đặt do nhà trường cung cấp bên dưới.</li><li>Nếu nhận tệp APK, tải về và mở tệp để cài đặt. Chỉ cấp quyền cài từ nguồn này cho đường dẫn chính thức của trường khi thiết bị yêu cầu.</li><li>Hoàn tất cài đặt, mở ứng dụng PP Academy và đăng nhập.</li></ol>{loading?<p role="status">Đang kiểm tra bản cài đặt…</p>:canDownload?<a className="guide-button" href={settings.downloadUrl} target="_blank" rel="noreferrer">Mở bản cài đặt của nhà trường ↗</a>:<p className="guide-note">{failed?"Chưa tải được thông tin bản cài đặt. Bạn có thể tải lại trang hoặc liên hệ học vụ.":"Nhà trường chưa công bố đường dẫn tải. Vui lòng liên hệ học vụ để nhận bản cài đặt."}</p>}</article><article><h3>iPhone / iPad</h3><ol><li>Liên hệ nhà trường để nhận kênh cài đặt dành cho iOS.</li><li>Nếu được cấp lời mời TestFlight hoặc đường dẫn App Store, làm theo hướng dẫn đi kèm lời mời.</li><li>Cài đặt xong, mở ứng dụng và dùng tài khoản được cấp.</li></ol><p className="guide-note">Tệp APK dành cho Android không cài được trên iPhone. Kênh phát hành iOS sẽ do nhà trường thông báo.</p></article></div></section>
      <section id="dang-nhap" className="guide-section"><span className="guide-number">02 / TÀI KHOẢN</span><h2>Đăng nhập lần đầu</h2><ol className="guide-login-steps"><li><strong>Nhận thông tin tài khoản</strong><p>Nhà trường cung cấp tên đăng nhập hoặc email cùng mật khẩu tạm thời.</p></li><li><strong>Đăng nhập ứng dụng</strong><p>Nhập đúng tài khoản và mật khẩu được cấp. Dùng nút hiện mật khẩu để kiểm tra nếu cần.</p></li><li><strong>Đổi mật khẩu bắt buộc</strong><p>Tạo mật khẩu mới khác mật khẩu tạm thời, xác nhận lại và lưu. Hoàn tất bước này mới có thể truy cập các chức năng trên web hoặc app.</p></li><li><strong>Kiểm tra hồ sơ</strong><p>Đối chiếu họ tên, mã sinh viên và chuyên ngành. Nếu chưa có lớp hoặc lịch học, liên hệ học vụ để được xếp lớp.</p></li></ol></section>
      <section id="su-dung" className="guide-section"><span className="guide-number">03 / SỬ DỤNG</span><h2>Việc học trong tầm tay</h2><div className="guide-feature-grid">{steps.map(([title,body],index)=><article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section id="cau-hoi" className="guide-section"><span className="guide-number">HỖ TRỢ NHANH</span><h2>Câu hỏi thường gặp</h2>{[
        ["Không đăng nhập được thì làm gì?","Kiểm tra tên đăng nhập hoặc email, mật khẩu và kết nối mạng. Nếu quên mật khẩu, dùng mục Quên mật khẩu để xem hướng dẫn liên hệ quản trị viên xác minh và cấp lại."],
        ["Vì sao chưa thấy lớp hoặc lịch học?","Tài khoản có thể mới đăng ký chuyên ngành, chưa được xếp lớp; hoặc đăng ký học phần đang chờ xác nhận học phí, giảng viên hay lịch chính thức. Liên hệ học vụ để kiểm tra."],
        ["Camera không quét được mã QR?","Kiểm tra quyền camera trong cài đặt điện thoại, lau ống kính và quét mã rõ nét. Phiên điểm danh cần được giảng viên mở đúng buổi học; báo giảng viên nếu vẫn không ghi nhận."],
        ["Bài tập đã hết hạn có nộp được không?","Khi hết hạn hoặc bài tập bị khóa, hệ thống ngừng nhận bài. Liên hệ giảng viên để được xem xét mở lại hoặc gia hạn."],
        ["Có cần tạo tài khoản mới trong ứng dụng không?","Bạn sử dụng tài khoản do nhà trường cấp. Không cần tạo tài khoản riêng cho web và ứng dụng."],
      ].map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <section id="ho-tro" className="guide-support"><h2>Cần thêm hỗ trợ?</h2><p>Khi liên hệ, cung cấp mã sinh viên, thiết bị đang dùng và mô tả lỗi. Không gửi mật khẩu của bạn.</p>{!failed&&<div>{settings.contactEmail&&<a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}{settings.phone&&<a href={`tel:${settings.phone.replace(/[^+\d]/g,"")}`}>{settings.phone}</a>}</div>}<Link href="/#lien-he">Xem thông tin liên hệ nhà trường →</Link></section>
    </div></div><footer className="guide-footer">{settings.schoolName} · Hướng dẫn cài đặt và sử dụng<Link href="/">Về trang chủ ↑</Link></footer>
  </main>;
}
