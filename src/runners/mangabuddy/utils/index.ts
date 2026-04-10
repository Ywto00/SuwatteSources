import * as Cheerio from "cheerio";
import { PublicationStatus } from "@suwatte/daisuke";
import { MadBuddyDirectoryItem } from "../types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const firstSrcCandidate = (value?: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (!raw.includes(",")) {
    return raw.split(/\s+/)[0] ?? "";
  }
  const first = raw.split(",")[0] ?? "";
  return first.trim().split(/\s+/)[0] ?? "";
};

const normalizeSeriesHref = (baseUrl: string, href: string): string => {
  const absolute = resolveUrl(baseUrl, href);
  try {
    const u = new URL(absolute);
    const parts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0].toLowerCase() === "manga") {
      return `${u.origin}/${parts[1]}`;
    }
    return absolute;
  } catch {
    return absolute;
  }
};

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

export const parseMangaBuddyDirectory = (
  html: string,
  baseUrl: string
): MadBuddyDirectoryItem[] => {
  const $ = Cheerio.load(html);
  const cards = [
    ".book-item",
    ".page-item-detail",
    ".listupd .bs .bsx",
    "div.bsx",
    ".card-item",
  ];

  const out: MadBuddyDirectoryItem[] = [];
  for (const selector of cards) {
    for (const node of $(selector).toArray()) {
      const $node = $(node);
      const href =
        pick($node, ["a[href*='/manga/']"], "href") || pick($node, ["a[href]"], "href");
      const title =
        pick($node, [".book-title", ".tt", "h3", "a[title]"]) ||
        pick($node, ["img[alt]"], "alt");
      // Try multiple image attributes including lazy loading and srcset
      const cover =
        pick($node, ["img[data-src]"], "data-src") ||
        pick($node, ["img[data-lazy-src]"], "data-lazy-src") ||
        firstSrcCandidate(pick($node, ["img[data-lazy-srcset]"], "data-lazy-srcset")) ||
        firstSrcCandidate(pick($node, ["img[srcset]"], "srcset")) ||
        pick($node, ["img[src]"], "src");

      if (!href || !title) continue;
      const item = {
        id: normalizeSeriesHref(baseUrl, href),
        title,
        cover: resolveUrl(baseUrl, cover),
      };
      out.push(item);
      // DEBUG
      console.log("[MangaBuddy] Parsed directory item:", {
        href,
        title: title.substring(0, 50),
        cover: item.cover.substring(0, 80),
      });
      if (out.length >= 60) return out;
    }
    if (out.length) return out;
  }

  // Fallback: broad link extraction
  for (const node of $("a[href*='/manga/']").toArray()) {
    const $node = $(node);
    const href = String($node.attr("href") ?? "").trim();
    const title =
      String($node.attr("title") ?? "").trim() ||
      String($node.text() ?? "").trim() ||
      String($node.find("img").attr("alt") ?? "").trim();
    const cover =
      String($node.find("img").attr("data-src") ?? "").trim() ||
      String($node.find("img").attr("data-lazy-src") ?? "").trim() ||
      firstSrcCandidate(String($node.find("img").attr("data-lazy-srcset") ?? "").trim()) ||
      firstSrcCandidate(String($node.find("img").attr("srcset") ?? "").trim()) ||
      String($node.find("img").attr("src") ?? "").trim();
    if (!href || !title) continue;
    const item = {
      id: normalizeSeriesHref(baseUrl, href),
      title,
      cover: resolveUrl(baseUrl, cover),
    };
    out.push(item);
    console.log("[MangaBuddy] Fallback directory item:", {
      href,
      title: title.substring(0, 50),
      cover: item.cover.substring(0, 80),
    });
    if (out.length >= 60) break;
  }

  console.log(`[MangaBuddy] Total directory items: ${out.length}`);
  return out;
};

export const parseMangaBuddyContent = (
  html: string,
  baseUrl: string,
  contentId: string
): { title: string; cover: string; summary: string; authors?: string[]; status?: PublicationStatus } => {
  const $ = Cheerio.load(html);
  const root = $.root();
  const title =
    pick(root, [".post-title h1", "h1.entry-title", "h1"]) || `MangaBuddy ${contentId}`;
  const cover =
    pick(root, [".summary_image img"], "src") ||
    pick(root, [".info-image img"], "src") ||
    pick(root, [".thumb img"], "src") ||
    pick(root, ["meta[property='og:image']"], "content");

  const summaryNodes = root.find(".summary__content, .description-summary, .summary-content, .summary, .entry-content p");
  const summary = summaryNodes.length ? summaryNodes.first().text().trim() :
    pick(root, ["meta[name='description']"], "content") || "No summary";

  // Authors
  const authors = root.find(".author-content a, .author_list a, .meta .author a")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  // Status detection
  const statusText = pick(root, [".status, .meta .status, .manga-info .status"]) + " " + summary;
  let status: PublicationStatus | undefined;
  if (/ONGOING|UP|EVERY|WEEKLY/.test(statusText.toUpperCase())) {
    status = PublicationStatus.ONGOING;
  } else if (/COMPLETED|END|FINISHED/.test(statusText.toUpperCase())) {
    status = PublicationStatus.COMPLETED;
  }

  return {
    title,
    cover: resolveUrl(baseUrl, cover),
    summary,
    authors: authors.length ? authors : undefined,
    status,
  };
};

export const extractBookIdAndSlug = (html: string): { bookId?: string; bookSlug?: string } => {
  const bookIdMatch = html.match(/bookId\s*[=:]\s*["']?(\d+)["']?/);
  const bookSlugMatch = html.match(/bookSlug\s*[=:]\s*["']([^"']+)["']/);

  return {
    bookId: bookIdMatch ? bookIdMatch[1] : undefined,
    bookSlug: bookSlugMatch ? bookSlugMatch[1] : undefined,
  };
};

const parseChapterDate = (value: string): Date => {
  const text = value.trim();
  if (!text) return new Date(0);

  const ms = Number(text);
  if (Number.isFinite(ms) && ms > 0) return new Date(ms);

  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  // Relative time (e.g., "2 days ago")
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const date = new Date();
    switch (unit) {
      case "second": date.setSeconds(date.getSeconds() - amount); break;
      case "minute": date.setMinutes(date.getMinutes() - amount); break;
      case "hour": date.setHours(date.getHours() - amount); break;
      case "day": date.setDate(date.getDate() - amount); break;
      case "week": date.setDate(date.getDate() - amount * 7); break;
      case "month": date.setMonth(date.getMonth() - amount); break;
      case "year": date.setFullYear(date.getFullYear() - amount); break;
    }
    return date;
  }

  return new Date(0);
};

export const parseMangaBuddyChapters = (
  html: string,
  baseUrl: string
): Array<{ chapterId: string; title: string; index: number; number: number; date: Date }> => {
  const $ = Cheerio.load(html);
  const rows = $(
    ".chapter-list a[href], #chapter-list a[href], .detail-chlist a[href], .chap-list a[href], .list-chapter a[href], .chapter__list a[href], li.wp-manga-chapter a[href]"
  ).toArray();

  console.log(`[MangaBuddy] Found ${rows.length} chapter row candidates`);

  const out = rows
    .map((node, index) => {
      const $node = $(node);
      const href = pick($node, ["a[href]"], "href") || String($node.attr("href") ?? "").trim();
      const title =
        $node.find(".chapter-name, .chapter-title, .title, span").first().text().trim() ||
        $node.text().replace(/\s+/g, " ").trim();
      const dateText =
        $node.find(".ct-update, .chapter-update, .date, .chapter-date, .update, time").first().text().trim() ||
        $node.find(".ct-update, .chapter-update, .date, .chapter-date, .update, time").first().attr("title") ||
        "";

      if (!href || !title) {
        console.log(`[MangaBuddy] Skipped chapter row ${index}: missing href=${!!href} title=${!!title}`);
        return null;
      }

      const match = title.match(/(\d+(?:\.\d+)?)/);
      const number = match ? Number(match[1]) : rows.length - index;

      // Normalize chapterId: keep relative path or extract path from absolute URL
      let chapterId = href;
      if (/^https?:\/\//i.test(href)) {
        try {
          const url = new URL(href);
          chapterId = url.pathname + url.search;
        } catch {
          // keep original href if URL parsing fails
        }
      }

      const item = {
        chapterId,
        title,
        index,
        number,
        date: parseChapterDate(dateText),
      };
      console.log(`[MangaBuddy] Parsed chapter ${index}:`, {
        chapterId,
        title: title.substring(0, 50),
        number,
        date: item.date.toISOString(),
      });
      return item;
    })
    .filter(
      (item): item is { chapterId: string; title: string; index: number; number: number; date: Date } =>
        !!item
    );

  const reversed = out.reverse().map((item, index) => ({
    ...item,
    index,
  }));
  console.log(`[MangaBuddy] Total chapters parsed: ${reversed.length}`);
  return reversed;
};

export const parseMangaBuddyPages = (html: string, baseUrl: string): string[] => {
  const $ = Cheerio.load(html);
  const readers = $("#chapter-reader, .container-chapter-reader, .chapter-content, .reading-content");
  const nodeSelector =
    ".page-break img, #chapter-images img, .chapter-image img, .viewer img, .image-container img, .manga-page img, .chapter-reader img, img[data-src], img[data-lazy-src], img[data-original], img[data-srcset], img[data-lazy-srcset], img[srcset], img[src]";
  const nodes = readers.length ? readers.find(nodeSelector).toArray() : $.root().find(nodeSelector).toArray();

  console.log(`[MangaBuddy] Found ${nodes.length} image elements with selectors`);

  const out: string[] = [];
  for (const node of nodes) {
    const $node = $(node);
    // Multiple attribute strategies for lazy-loaded images
    const src =
      String($node.attr("data-src") ?? "").trim() ||
      String($node.attr("data-lazy-src") ?? "").trim() ||
      String($node.attr("data-original") ?? "").trim() ||
      String($node.attr("data-url") ?? "").trim() ||
      firstSrcCandidate(String($node.attr("data-srcset") ?? "")) ||
      firstSrcCandidate(String($node.attr("data-lazy-srcset") ?? "")) ||
      firstSrcCandidate(String($node.attr("srcset") ?? "")) ||
      String($node.attr("src") ?? "").trim();
    if (!src) continue;
    const fullUrl = resolveUrl(baseUrl, src);
    if (!/https?:\/\//i.test(fullUrl)) continue;
    out.push(fullUrl);
    console.log(`[MangaBuddy] Extracted image:`, src.substring(0, 80));
  }

  // If no images found, try regex fallback with improved pattern
  if (!out.length) {
    console.log("[MangaBuddy] No images from selectors, trying regex fallback");
    const source = html.replace(/\\\//g, "/");
    const regex = /(https?:\/\/[^\"'\s>]+\.(?:jpg|jpeg|png|webp|gif|webm))(?:\?[^\"'\s>]*)?/gi;
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const img = String(match[1] ?? "").trim();
      if (!img) continue;
      found.add(resolveUrl(baseUrl, img));
      if (found.size >= 300) break;
    }
    out.push(...Array.from(found));
    console.log(`[MangaBuddy] Regex fallback found ${found.size} images`);
  }

  console.log(`[MangaBuddy] Total pages extracted: ${out.length}`);
  return out;
};
