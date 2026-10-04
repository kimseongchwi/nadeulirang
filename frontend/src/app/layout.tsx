import type { Metadata, Viewport } from "next";
import { ReviewProvider } from "@/providers/review-provider";
import { ReviewShell } from "@/components/layout/site-shell";
import { seoulDate } from "@/features/outings/model";
import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "나들이 발견 · 나들이랑",
  description:
    "가까운 나들이를 발견하고 일정과 방문 정보를 확인해요.",
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
