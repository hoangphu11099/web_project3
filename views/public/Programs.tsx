"use client";

import { useState } from "react";
import { FiCode, FiCpu, FiShield, FiCloud, FiGrid, FiPenTool, FiLayout, FiTrendingUp, FiBriefcase, FiTruck } from "react-icons/fi";
import { type Program } from "@/models/programs";
import type { SiteSettings } from "@/models/publicWebsite";
import { usePrograms } from "@/components/common/ProgramImages";
import { Icon } from "@/components/ui/Icon";

import { ConsultationForm, ProgramCommunity } from "./ProgramCommunity";

const symbols = { code:FiCode, ai:FiCpu, shield:FiShield, cloud:FiCloud, chip:FiGrid, design:FiPenTool, ux:FiLayout, marketing:FiTrendingUp, business:FiBriefcase, logistics:FiTruck };

function ProgramArtwork({ program, large = false }: { program: Program; large?: boolean }) {
  const Symbol = symbols[program.symbol];
  const image = program.image;
  return <div className={`program-art art-${program.symbol}${large ? " is-large" : ""}`} aria-hidden="true">
    <img src={image} alt="" loading={large ? "eager" : "lazy"} />
    <span className="program-art-brand">PP ACADEMY <span>/{program.group.toUpperCase()}</span></span>
    <div className="program-art-orbit" /><div className="program-art-symbol"><Symbol size={large ? 100 : 62} strokeWidth={1.3} /></div>
    <span className="program-art-caption">{program.tools.slice(0,2).join(" / ")}</span>
  </div>;
}

export function ProgramCard({ program }: { program: Program }) {
  return <a className="degree-card" href={`#nganh-hoc/${program.slug}`}>
    <ProgramArtwork program={program} />
    <div className="degree-card-copy"><small>{program.group}</small><h3>{program.name}</h3><p>{program.tagline}</p><span>Xem chương trình <Icon name="arrowRight" size={18} /></span></div>
  </a>;
}

export function ProgramCatalog() {
  const programs = usePrograms();
  const [group, setGroup] = useState("Tất cả");
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g,"d");
  const visible = programs.filter(program => (group === "Tất cả" || program.group === group) && normalize(`${program.name} ${program.tools.join(" ")}`).includes(normalize(query.trim())));
  return <section className="program-catalog" id="dao-tao"><div className="public-container">
    <div className="public-section-heading"><div><p className="public-section-label">KHÁM PHÁ HƯỚNG ĐI CỦA BẠN</p><h2>Một đam mê.<br /><span>Nhiều hướng phát triển.</span></h2></div><p>Từ công nghệ đến sáng tạo và kinh doanh. Tìm hiểu từng ngành để chọn hướng học tập phù hợp với sở thích và mục tiêu của bạn.</p></div>
    <div className="program-catalog-tools"><div className="program-filters" role="group" aria-label="Nhóm ngành học">{["Tất cả","Công nghệ","Sáng tạo","Kinh doanh"].map(item => <button type="button" key={item} aria-pressed={group === item} onClick={() => setGroup(item)}>{item}<span>{item === "Tất cả" ? programs.length : programs.filter(p => p.group === item).length}</span></button>)}</div><label className="program-search"><Icon name="search" size={18} /><input aria-label="Tìm ngành học" placeholder="Tìm ngành bạn quan tâm…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <p className="program-result-count" role="status">{visible.length} ngành học</p>
    <div className="degree-grid">{visible.map(program => <ProgramCard program={program} key={program.slug} />)}</div>
    {!visible.length && <div className="program-empty"><Icon name="search" size={30} /><h3>Chưa tìm thấy ngành phù hợp</h3><p>Thử từ khóa khác hoặc xem tất cả các nhóm ngành.</p><button className="refresh-button" onClick={() => { setQuery("");setGroup("Tất cả"); }}>Xem tất cả ngành học</button></div>}
  </div></section>;
}

export function ProgramDetail({ program, settings }: { program: Program; settings: SiteSettings }) {
  const programs = usePrograms();
  const [stage, setStage] = useState(0);
  const selectedStage = program.stages[stage];
  const related = programs.filter(p => p.slug !== program.slug).sort((a,b) => Number(b.group === program.group) - Number(a.group === program.group)).slice(0,3);
  const contact = () => document.getElementById("program-contact")?.scrollIntoView({ behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return <article className="degree-detail">
    <nav className="public-container degree-breadcrumb" aria-label="Đường dẫn"><a href="#trang-chu">Trang chủ</a><Icon name="chevronRight" size={14} /><a href="#dao-tao">Ngành học</a><Icon name="chevronRight" size={14} /><span>{program.name}</span></nav>
    <section className="degree-hero"><div className="public-container degree-hero-grid"><div><a className="degree-back" href="#dao-tao"><Icon name="arrowLeft" size={16} /> Tất cả ngành học</a><p className="degree-eyebrow">PP ACADEMY / {program.group.toUpperCase()}</p><h1>{program.name}</h1><p className="degree-tagline">{program.tagline}</p><p className="degree-intro">{program.description}</p><div className="degree-actions"><button className="public-primary" onClick={contact}>Tìm hiểu & tư vấn <Icon name="arrowRight" size={18} /></button><a className="public-secondary" href="#dao-tao">Khám phá ngành khác</a></div></div><ProgramArtwork program={program} large /></div></section>
    <div className="public-container degree-facts">{[["course","Hướng học tập",program.group],["exercise","Phương pháp","Kiến thức gắn với dự án"],["students","Đối tượng","Người bắt đầu & chuyển ngành"],["calendar","Kế hoạch học","Liên hệ để được tư vấn"]].map(([icon,label,value]) => <div key={label}><Icon name={icon as "course" | "exercise" | "students" | "calendar"} size={24} /><span><small>{label}</small><strong>{value}</strong></span></div>)}</div>
    <nav className="degree-section-nav public-container" aria-label="Nội dung ngành học">{[["Phù hợp với ai?","degree-audience"],["Bạn sẽ học gì?","degree-curriculum"],["Hướng nghề nghiệp","degree-careers"],["Câu hỏi thường gặp","degree-faq"]].map(([label,id]) => <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"})}>{label}</button>)}</nav>
    <section className="degree-section public-container" id="degree-audience"><div className="degree-section-title"><p className="public-section-label">BẮT ĐẦU TỪ ĐIỀU BẠN YÊU THÍCH</p><h2>Ngành học này có dành cho bạn?</h2></div><div className="degree-audience-grid">{[["students","Bạn đang chọn ngành","Muốn tìm hiểu một hướng học tập phù hợp với sở thích, thế mạnh và mục tiêu sau khi tốt nghiệp."],["course","Bạn muốn học thêm","Đang học một ngành khác và muốn bổ sung kỹ năng để phát triển những dự án của riêng mình."],["teacher","Bạn muốn đổi hướng","Đang đi làm, muốn khám phá một lĩnh vực mới và cần được tư vấn lộ trình phù hợp với nền tảng hiện có."]].map(([icon,title,copy]) => <div key={title}><span><Icon name={icon as "students" | "course" | "teacher"} size={28} /></span><h3>{title}</h3><p>{copy}</p></div>)}</div></section>
    <section className="degree-learning" id="degree-curriculum"><div className="public-container"><div className="degree-section-title"><p className="public-section-label">TỪ NỀN TẢNG ĐẾN ỨNG DỤNG</p><h2>Bạn sẽ khám phá những gì?</h2><p>Lộ trình tham khảo để hình dung hướng học. Môn học và kế hoạch chính thức được nhà trường tư vấn theo từng chương trình.</p></div><div className="degree-curriculum"><div className="degree-stage-list" role="tablist" aria-label="Các chặng học">{program.stages.map((item,index) => <button key={item.title} role="tab" id={`stage-${index}`} aria-selected={stage === index} aria-controls="stage-panel" onClick={() => setStage(index)}><b>0{index+1}</b><span><small>CHẶNG {index+1}</small><strong>{item.title}</strong></span><Icon name="chevronRight" size={20} /></button>)}</div><div className="degree-stage-panel" id="stage-panel" role="tabpanel" aria-labelledby={`stage-${stage}`}><span className="degree-stage-number">0{stage+1}</span><h3>{selectedStage.title}</h3><ul>{selectedStage.topics.map(topic => <li key={topic}><Icon name="check" size={17} />{topic}</li>)}</ul><div className="degree-tools">{program.tools.map(tool => <span key={tool}>{tool}</span>)}</div></div></div></div></section>
    <section className="degree-section public-container"><div className="degree-outcomes"><div><p className="public-section-label">KỸ NĂNG BẠN HƯỚNG ĐẾN</p><h2>Học để làm được việc.</h2><ul>{program.skills.map(skill => <li key={skill}><span><Icon name="check" size={17} /></span>{skill}</li>)}</ul></div><aside className="degree-project"><Icon name="exercise" size={32} /><small>DỰ ÁN GỢI Ý</small><h3>Tạo dấu ấn bằng sản phẩm của bạn</h3><p>{program.project}</p><span>Ý tưởng · Thực hành · Trình bày</span></aside></div></section>
    <section className="degree-section public-container degree-standards" id="degree-standards"><div className="degree-standards-heading"><span><Icon name="grade" size={30} /></span><div><p className="public-section-label">MỤC TIÊU NĂNG LỰC</p><h2>Chuẩn đầu ra định hướng</h2></div></div><p>Với ngành {program.name}, lộ trình tham khảo hướng đến các năng lực dưới đây. Tiêu chí đánh giá và chuẩn đầu ra chính thức được nhà trường cung cấp theo chương trình cụ thể.</p><ul>{program.skills.map(skill => <li key={skill}><Icon name="check" size={18} />{skill}</li>)}<li><Icon name="check" size={18} />Hoàn thiện sản phẩm thực hành và trình bày quá trình thực hiện.</li><li><Icon name="check" size={18} />Phối hợp làm việc nhóm, tiếp nhận phản hồi và tự đánh giá kết quả.</li></ul><div className="degree-standard-project"><strong>Sản phẩm thực hành gợi ý</strong><p>{program.project}</p></div></section>
    <section className="degree-careers" id="degree-careers"><div className="public-container"><div className="degree-section-title"><p className="public-section-label">MỞ RỘNG HƯỚNG ĐI</p><h2>Những công việc có thể tìm hiểu</h2><p>Định hướng nghề nghiệp để tham khảo; yêu cầu tuyển dụng phụ thuộc vào năng lực, kinh nghiệm và từng doanh nghiệp.</p></div><div className="degree-career-grid">{program.careers.map((career,index) => <div key={career}><span>0{index+1}</span><h3>{career}</h3><Icon name="arrow" size={24} /></div>)}</div></div></section>
    <section className="degree-section public-container degree-faq" id="degree-faq"><div><p className="public-section-label">GIẢI ĐÁP TRƯỚC KHI BẮT ĐẦU</p><h2>Bạn có thể đang thắc mắc</h2></div><div>{[["Chưa có kiến thức nền có thể tìm hiểu ngành này không?","Bạn có thể bắt đầu bằng các nội dung nền tảng trong lộ trình giới thiệu. Bộ phận tư vấn sẽ trao đổi về kiến thức hiện tại để hướng dẫn lựa chọn chương trình phù hợp."],["Thời lượng và học phí là bao nhiêu?","Thời lượng, học phí và lịch khai giảng cần được nhà trường xác nhận theo chương trình và đợt học. Bạn có thể gửi email hoặc gọi điện qua thông tin liên hệ bên dưới."],["Đây có phải danh sách môn học chính thức không?","Nội dung trên trang là phần giới thiệu và lộ trình tham khảo. Đề cương môn học, điều kiện đầu vào và thông tin chứng nhận chính thức được cung cấp khi tư vấn chương trình."]].map(([question,answer]) => <details key={question}><summary>{question}<Icon name="plus" size={18} /></summary><p>{answer}</p></details>)}</div></section>
    <ConsultationForm program={program} settings={settings} />
    <ProgramCommunity />
    <section className="degree-section public-container"><div className="degree-related-heading"><div><p className="public-section-label">THÊM NHỮNG LỰA CHỌN</p><h2>Có thể bạn cũng quan tâm</h2></div><a className="text-link" href="#dao-tao">Tất cả ngành học <Icon name="arrowRight" size={17} /></a></div><div className="degree-grid related-degree-grid">{related.map(p => <ProgramCard program={p} key={p.slug} />)}</div></section>
  </article>;
}
