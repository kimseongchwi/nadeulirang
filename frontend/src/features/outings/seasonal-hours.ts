export function formatSeasonalHours(value: string) {
  return value.replace(
    /(^|[\r\n]+\s*|\s*[-–—]\s*)(하절기|동절기)\s*(\([^\r\n)]*\))\s*[:：]?\s*(?=\d{1,2}:\d{2})/g,
    (_match, _separator: string, season: string, months: string, offset: number) =>
      `${offset === 0 ? "" : "\n"}${season}${months}: `,
  );
}
