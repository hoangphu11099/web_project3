export type SiteSettings = {
  id: number;
  schoolName: string;
  slogan: string;
  introduction: string;
  heroImageUrl: string;
  logoUrl: string;
  downloadButtonLabel: string;
  downloadUrl: string;
  downloadEnabled: boolean;
  contactEmail: string;
  phone: string;
  address: string;
};

export type SchoolPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  authorName: string;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export const defaultSiteSettings: SiteSettings = {
  id: 1,
  schoolName: "PP Academy",
  slogan: "Thông tin đào tạo và học tập",
  introduction:
    "Trang thông tin PP Academy cung cấp thông báo, giới thiệu chương trình đào tạo và các tiện ích học tập cho sinh viên, giảng viên.",
  heroImageUrl: "/pp-academy-campus.webp",
  logoUrl: "/pp-academy-logo.svg",
  downloadButtonLabel: "Tải ứng dụng",
  downloadUrl: "",
  downloadEnabled: false,
  contactEmail: "hello@ppacademy.edu.vn",
  phone: "028 7300 6868",
  address: "Thành phố Hồ Chí Minh, Việt Nam",
};


// Replace only the original demo copy; preserve text edited by the school.
export function normalizeSiteSettings(value: Partial<SiteSettings>): SiteSettings {
 const settings = { ...defaultSiteSettings, ...value };
 if (settings.introduction === "PP Academy là môi trường học tập hiện đại, nơi người học phát triển kiến thức chuyên môn, kỹ năng thực tiễn và tư duy sáng tạo để sẵn sàng cho tương lai.") settings.introduction = defaultSiteSettings.introduction;
 if (settings.slogan === "Kiến tạo tri thức · Dẫn lối tương lai") settings.slogan = defaultSiteSettings.slogan;
 return settings;
}
