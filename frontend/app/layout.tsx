import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CXI Studio",
  description: "CXI Studio - 사내용 UX 리서치 인사이트 워크벤치"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
