import type { Metadata, Viewport } from "next";
import { NavigationProvider } from "@/providers/navigation-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { seoulDate } from "@/features/outings/model";
import { pageMetadata } from "@/config/seo";
import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata(
  undefined,
  "나들이 발견 · 나들이랑",
  "가까운 나들이를 발견하고 일정과 방문 정보를 확인해요.",
  false,
);
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <NavigationProvider today={seoulDate()}>
          <SiteShell>{children}</SiteShell>
        </NavigationProvider>
      </body>
    </html>
  );
}
