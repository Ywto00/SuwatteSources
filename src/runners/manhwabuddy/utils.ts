import * as Cheerio from "cheerio";
import { PublicationStatus } from "@suwatte/daisuke";
import { ManhwaBuddyDirectoryItem } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const pick = ($root: Cheerio.Cheerio<any>, selectors: string[], attr?: string): string => {
  for (const selector of selectors) {
    const node = $root.find(selector).first();
    if (!node.length) continue;
    const raw = attr ? node.attr(attr) : node.text();
    const value = String(raw ?? "").trim();
    if (value) return value;
  }
  return "";
};

const parseRelativeDate = (text: string): Date | undefined => {
  const lower = text.trim().toLowerCase();
  if (!lower) return undefined;

  if (lower === "today" || lower === "just now") {
    return new Date();
  }

  if (lower === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date;
  }

  const match = lower.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!match) return undefined;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  if (!Number.isFinite(amount)) return undefined;

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
    default:
      return undefined;
  }

  return date;
};

const parseChapterNumber = (title: string): number | undefined => {
  const normalized = title
    .replace(/(\d)-(\d)/g, "$1.$2")
    .replace(/chapter\s+/gi, "")
    .trim();

  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
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

export type RuntimeRequestOptions = {
  cookie?: string;
  userAgent?: string;
};

export const requestHtml = async (
  url: string,
  baseUrl: string,
  options: RuntimeRequestOptions = {}
): Promise<string> => {
  const originMatch = String(baseUrl).match(/^https?:\/\/[^/]+/i);
  const origin = originMatch ? originMatch[0] : "";
  const headers: Record<string, string> = {
    "User-Agent": options.userAgent || USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: baseUrl,
    Origin: origin,
  };

  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  const response = await new NetworkClient().request({
    url,
    method: "GET",
    headers,
  });

  const html = typeof response.data === "string"
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

export const buildManhwaBuddySearchUrl = (baseUrl: string, query: string, page: number = 1): string => {
  const root = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const q = encodeURIComponent(query);
  return `${root}/search?s=${q}&page=${page}`;
};

export const buildManhwaBuddyGenreUrl = (baseUrl: string, genreSlug: string, page: number = 1): string => {
  const root = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${root}/genre/${genreSlug}/page/${page}`;
};

export const parseManhwaBuddyDirectory = (
  html: string,
  baseUrl: string
): ManhwaBuddyDirectoryItem[] => {
  const $ = Cheerio.load(html);
  const items: ManhwaBuddyDirectoryItem[] = [];

  // Selector: ".latest-list .latest-item"
  for (const node of $(".latest-list .latest-item, .latest-item").toArray()) {
    const $node = $(node);
    const link = $node.find("a").first();
    const href = link.attr("href") ?? "";
    const title = link.find("h4").text().trim() || link.attr("title")?.trim() || "";
    const cover =
      link.find("img").attr("data-src") ??
      link.find("img").attr("data-lazy-src") ??
      link.find("img").attr("src") ??
      "";

    if (!href || !title) continue;

    items.push({
      id: resolveUrl(baseUrl, href),
      title,
      cover: resolveUrl(baseUrl, cover),
    });
    if (items.length >= 60) return items;
  }

  // Fallback: popular items (".item-move" or generic)
  if (items.length === 0) {
    for (const node of $(".item-move, .item").toArray()) {
      const $node = $(node);
      const link = $node.find("a").first();
      const href = link.attr("href") ?? "";
      const title = link.find("h3, h4").text().trim() || link.attr("title")?.trim() || "";
      const cover =
        link.find("img").attr("data-src") ??
        link.find("img").attr("data-lazy-src") ??
        link.find("img").attr("src") ??
        "";

      if (!href || !title) continue;

      items.push({
        id: resolveUrl(baseUrl, href),
        title,
        cover: resolveUrl(baseUrl, cover),
      });
      if (items.length >= 60) break;
    }
  }

  return items;
};

export const parseManhwaBuddyContent = (
  html: string,
  baseUrl: string,
  contentId: string
): {
  title: string;
  cover: string;
  summary: string;
  authors?: string[];
  artists?: string[];
  genres?: string[];
  status?: PublicationStatus;
} => {
  const $ = Cheerio.load(html);
  const root = $.root();

  const title = pick(root, ["h1.title", ".main-info h1", "h1"]) || `ManhwaBuddy ${contentId}`;
  const cover =
    pick(root, [".img-cover img", ".main-info-right img", ".thumb img", ".cover img"], "data-src") ||
    pick(root, [".img-cover img", ".main-info-right img", ".thumb img", ".cover img"], "src") ||
    pick(root, ["meta[property='og:image']"], "content") || "";

  const summary =
    pick(root, [".short-desc-content p", ".description-summary", ".summary"]) || "No description";

  // Authors, Artists, Genres from old and new meta layouts
  const infoRoot = root.find(".meta.box, .main-info-right").first();
  const authorEl = infoRoot.find("p:has(strong:contains('Author')) a, li:contains('Author') a");
  const artistEl = infoRoot.find("p:has(strong:contains('Artist')) a, li:contains('Artist') a");
  const genreEls = infoRoot.find("p:has(strong:contains('Genres')) a, li:contains('Genres') a");

  const authors = authorEl
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean);
  const artists = artistEl
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean);
  const genres: string[] = [];
  genreEls.each((_, el) => {
    const text = $(el).text().replace(/,$/, "").trim();
    if (text) genres.push(text);
  });

  // Status: "Ongoing", "Complete", etc.
  const statusText =
    infoRoot.find("p:has(strong:contains('Status')) a span, p:has(strong:contains('Status')) span").first().text().trim() ||
    infoRoot.find("li:contains('Status') span").first().text().trim();
  let status: PublicationStatus | undefined;
  if (/ONGOING|ONGOING/i.test(statusText)) {
    status = PublicationStatus.ONGOING;
  } else if (/COMPLETE|COMPLETED/i.test(statusText)) {
    status = PublicationStatus.COMPLETED;
  }

  return {
    title,
    cover: resolveUrl(baseUrl, cover),
    summary,
    authors: authors.length ? authors : undefined,
    artists: artists.length ? artists : undefined,
    genres: genres.length ? genres : undefined,
    status,
  };
};

const parseDate = (dateStr: string): Date => {
  const text = dateStr.trim();
  if (!text) return new Date(0);

  const relative = parseRelativeDate(text);
  if (relative) return relative;

  // Try "dd MMMM yyyy" format (e.g., "05 April 2025")
  const parts = text.split(" ");
  if (parts.length === 3) {
    const day = Number.parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = Number.parseInt(parts[2], 10);
    const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const month = months.indexOf(monthStr);
    if (day && month !== -1 && year) {
      return new Date(year, month, day);
    }
  }

  // Fallback: try Date.parse
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return new Date(0);
};

export const parseManhwaBuddyChapters = (
  html: string,
  baseUrl: string,
  contentId?: string
): Array<{ chapterId: string; title: string; index: number; number: number; date: Date }> => {
  const $ = Cheerio.load(html);
  const rows = $(
    ".chapter-list a, .chapter-list li a, .chapter-item a, .wp-manga-chapter > a"
  ).toArray();

  const raw: Array<{
    chapterId: string;
    title: string;
    date: Date;
    parsedNumber?: number;
  }> = [];
  const seen = new Set<string>();

  for (const node of rows) {
    const $node = $(node);
    const href = String($node.attr("href") ?? "").trim();
    const title =
      $node.find(".chapter-title, .chapter-name").first().text().trim() ||
      $node.text().trim();
    const dateNode = $node.find(".chapter-update, .ct-update, time").first();
    const dateText = (dateNode.attr("title") ?? dateNode.text().trim()) || "";

    if (!href || !title) continue;

    let chapterId = href;
    try {
      const url = new URL(resolveUrl(baseUrl, href));
      chapterId = `${url.pathname}${url.search}`.replace(/\/+$/, "");
    } catch {
      chapterId = href.replace(/#.*$/, "").replace(/\/+$/, "");
    }

    if (!chapterId || seen.has(chapterId)) continue;
    seen.add(chapterId);

    raw.push({
      chapterId,
      title,
      date: parseDate(dateText),
      parsedNumber: parseChapterNumber(title),
    });
  }

  // Fallback for chapter pages that expose only a chapter dropdown.
  if (!raw.length) {
    const absoluteContent = resolveUrl(baseUrl, contentId || "");
    let seriesPath = "";
    try {
      const contentUrl = new URL(absoluteContent || baseUrl);
      seriesPath = contentUrl.pathname.replace(/\/chapter-[^/]+\/?$/i, "").replace(/\/+$/, "");
    } catch {
      seriesPath = "";
    }

    const optionNodes = $(".choose-chapter select.change-chapter option[data-c]").toArray();
    for (const optionNode of optionNodes) {
      const $opt = $(optionNode);
      const slug = String($opt.attr("data-c") ?? "").trim();
      const title = $opt.text().replace(/\s+/g, " ").trim();
      if (!slug || !title) continue;

      const candidatePath = seriesPath ? `${seriesPath}/${slug}/` : `/${slug}/`;
      const chapterId = candidatePath.replace(/\/+$/, "/");
      if (seen.has(chapterId)) continue;
      seen.add(chapterId);

      raw.push({
        chapterId,
        title,
        date: new Date(0),
        parsedNumber: parseChapterNumber(title),
      });
    }
  }

  // Keep source order to avoid inverting the global chapter list.

  return raw.map((item, index) => ({
    chapterId: item.chapterId,
    title: item.title,
    index,
    number: item.parsedNumber ?? index + 1,
    date: item.date,
  }));
};

export const parseManhwaBuddyPages = (
  html: string,
  baseUrl: string
): string[] => {
  const $ = Cheerio.load(html);
  const nodes = $(
    "#chapter-images .chapter-image img, .chapter-image img, .chapter-content img, .reading-content img, .viewer img, .page-image img"
  ).toArray();

  const out: string[] = [];
  for (const node of nodes) {
    const $node = $(node);
    const src =
      String($node.attr("data-src") ?? "").trim() ||
      String($node.attr("data-lazy-src") ?? "").trim() ||
      String($node.attr("src") ?? "").trim();
    if (!src) continue;
    const full = resolveUrl(baseUrl, src);
    if (!/^https?:\/\//i.test(full)) continue;
    if (full.includes("/loading.svg")) continue;
    out.push(full);
  }

  // Regex fallback
  if (!out.length) {
    const regex = /(https?:\/\/[^\"'\s>]+\.(?:jpg|jpeg|png|webp|gif|webm))(?:\?[^\"'\s>]*)?/gi;
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const img = String(match[1] ?? "").trim();
      if (!img) continue;
      found.add(resolveUrl(baseUrl, img));
      if (found.size >= 300) break;
    }
    out.push(...Array.from(found));
  }

  return [...new Set(out)];
};
