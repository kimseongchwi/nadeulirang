import type { Metadata, Viewport } from "next";
import { ReviewProvider } from "@/providers/review-provider";
import { ReviewShell } from "@/components/layout/site-shell";
import { seoulDate } from "@/features/outings/model";
import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "나들이 발견 · 나들이랑 검토 시안",
  description:
    "나들이랑의 홈·검색·상세와 UI 디자인을 확인하는 검토 화면입니다.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <ReviewProvider today={seoulDate()}>
          <ReviewShell>{children}</ReviewShell>
        </ReviewProvider>
      </body>
    </html>
  );
}
