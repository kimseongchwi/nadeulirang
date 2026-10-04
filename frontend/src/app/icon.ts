import { readFile } from "node:fs/promises";
import path from "node:path";
import { brandPalette } from "@/config/brand";

export const size = { width: 128, height: 128 };
export const contentType = "image/svg+xml";
export default async function Icon() {
  const symbol = await readFile(
    path.join(process.cwd(), "public/images/icon-people-v3.png"),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><filter id="brand" color-interpolation-filters="sRGB"><feFlood flood-color="${brandPalette.brand}"/><feComposite in2="SourceAlpha" operator="in"/></filter><image href="data:image/png;base64,${symbol.toString("base64")}" width="128" height="128" preserveAspectRatio="xMidYMid meet" filter="url(#brand)"/></svg>`;
  return new Response(svg, {
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
