import * as Cheerio from "cheerio";

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const firstSrcCandidate = (value?: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!raw.includes(",")) {
    return raw.split(/\s+/)[0] ?? "";
  }
  const first = raw.split(",")[0] ?? "";
  return first.trim().split(/\s+/)[0] ?? "";
};

export const resolveUrl = (baseUrl: string, value?: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const originMatch = String(baseUrl).match(/^https?:\/\/[^/]+/i);
  const origin = originMatch ? originMatch[0] : "";
  const normalizedBase = String(baseUrl).replace(/\/+$/, "");

  if (raw.startsWith("//")) {
    const proto = origin.startsWith("https://") ? "https:" : "http:";
    return `${proto}${raw}`;
  }
  if (raw.startsWith("/")) {
    return origin ? `${origin}${raw}` : raw;
  }
  if (raw.startsWith("./")) {
    return `${normalizedBase}/${raw.slice(2)}`;
  }

  return `${normalizedBase}/${raw}`;
};

export const normalizeSeriesHref = (baseUrl: string, href: string): string => {
  const absolute = resolveUrl(baseUrl, href);
  try {
    const u = new URL(absolute);
    const parts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0].toLowerCase() === "manga") {
      return `${u.origin}/${parts[1]}`;
    }
    // Remove query and fragment for consistent IDs (e.g. /list?title_no=123)
    const cleanPath = u.pathname.replace(/\/+$/, "");
    return `${u.origin}${cleanPath}`;
  } catch {
    return absolute.split(/[?#]/)[0];
  }
};

export const pick = (
  $root: Cheerio.Cheerio<any>,
  selectors: string[],
  attr?: string
): string => {
  for (const selector of selectors) {
    const node = $root.find(selector).first();
    if (!node.length) continue;
    const raw = attr ? node.attr(attr) : node.text();
    const value = String(raw ?? "").trim();
    if (value) return value;
  }
  return "";
};

export const requestHtml = async (
  url: string,
  baseUrl: string,
  opts: { cookie?: string; userAgent?: string } = {}
): Promise<string> => {
  const originMatch = String(baseUrl).match(/^https?:\/\/[^/]+/i);
  const origin = originMatch ? originMatch[0] : "";

  const headers: Record<string, string> = {
    "User-Agent": opts.userAgent || DEFAULT_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: baseUrl,
    Origin: origin,
  };

  if (opts.cookie) {
    headers.Cookie = opts.cookie;
  }

  const response = await new NetworkClient().request({
    url,
    method: "GET",
    headers,
  });

  const html =
    typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);

  const lower = html.toLowerCase();
  if (
    lower.includes("checking your browser") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("attention required")
  ) {
    throw new Error(
      "Blocked by anti-bot challenge. Set a valid cookie in runner preferences and retry."
    );
  }

  return html;
};

export const buildSearchUrls = (baseUrl: string, query: string): string[] => {
  const root = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const q = encodeURIComponent(query);
  return [
    `${root}/search?q=${q}`,
    `${root}/search?status=all&sort=views&q=${q}`,
    `${root}/search?keyword=${q}`,
    `${root}/search?s=${q}`,
  ];
};

export const parseChapterDate = (value: string): Date => {
  const text = value.trim();
  if (!text) return new Date(0);

  const ms = Number(text);
  if (Number.isFinite(ms) && ms > 0) return new Date(ms);

  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  const match = text.match(
    /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i
  );
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const date = new Date();
    switch (unit) {
      case "second":
        date.setSeconds(date.getSeconds() - amount);
        break;
      case "minute":
        date.setMinutes(date.getMinutes() - amount);
        break;
      case "hour":
        date.setHours(date.getHours() - amount);
        break;
      case "day":
        date.setDate(date.getDate() - amount);
        break;
      case "week":
        date.setDate(date.getDate() - amount * 7);
        break;
      case "month":
        date.setMonth(date.getMonth() - amount);
        break;
      case "year":
        date.setFullYear(date.getFullYear() - amount);
        break;
    }
    return date;
  }

  return new Date(0);
};
