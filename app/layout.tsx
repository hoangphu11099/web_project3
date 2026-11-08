import type { Metadata } from "next";
import { ErrorFeedbackProvider } from "@/components/common/ErrorFeedback";
import "./globals.css";
import "./forms.css";
import "./school.css";
import "./overview.css";
import "./programs.css";
import "./reports.css";
import "./class-student-picker.css";
import "./student-editor.css";
import "./entity-editor.css";

export const metadata: Metadata = {
  title: "PP Academy — Thông tin nhà trường",
  description:
    "PP Academy - môi trường đào tạo hiện đại và hệ thống quản lý học tập dành cho sinh viên, giảng viên.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/pp-academy-logo.png",
    shortcut: "/pp-academy-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preload" href="/fonts/kripa/Kripa-Variable.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
      </head>
      <body><ErrorFeedbackProvider>{children}</ErrorFeedbackProvider></body>
    </html>
  );
}
