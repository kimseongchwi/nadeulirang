"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { analyticsPageUrl } from "@/config/analytics";

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = analyticsPageUrl(event.url);
  return event.type === "pageview" && url ? { ...event, url } : null;
}

export function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={beforeSend}
      debug={false}
    />
  );
}
