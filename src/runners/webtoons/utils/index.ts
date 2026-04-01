import * as Cheerio from "cheerio";
import * as he from "he";
import { PublicationStatus } from "@suwatte/daisuke";
import { WebtoonsDirectoryItem, EpisodeListResponse } from "../types";

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
  mobile?: boolean;
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
    Referer: options.mobile ? "https://m.webtoons.com/" : baseUrl,
    Origin: options.mobile ? "https://m.webtoons.com" : origin,
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

export const buildWebtoonsCatalogUrls = (baseUrl: string): string[] => {
  const root = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return [
    `${root}/en/ranking/trending`,
    `${root}/en/ranking/popular`,
    `${root}/en/originals`,
    `${root}/en/canvas`,
  ];
};

export const buildWebtoonsSearchUrl = (baseUrl: string, query: string): string => {
  const root = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const q = encodeURIComponent(query);
  return `${root}/en/search?keyword=${q}`;
};

const normalizeWebtoonsContentUrl = (baseUrl: string, href: string): string => {
  const absolute = resolveUrl(baseUrl, href);
  try {
    const url = new URL(absolute);
    if (!/webtoons\.com$/i.test(url.hostname)) {
      return "";
    }
    const path = url.pathname;
    const titleNo = url.searchParams.get("title_no") || url.searchParams.get("titleNo");
    if (!titleNo) return "";

    // Convert episode URLs into list URLs so details/chapters parser always receives series pages.
    if (path.includes("/episode") || path.includes("/viewer")) {
      url.pathname = path.replace("/episode", "/list").replace("/viewer", "/list");
      url.searchParams.delete("episode_no");
      url.searchParams.delete("episodeNo");
    }

    if (!url.pathname.includes("/list")) {
      return "";
    }

    if (!url.pathname.startsWith("/en/") && !url.pathname.startsWith("/zh-hant/") && !url.pathname.startsWith("/zh-hans/")) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
};

export const parseWebtoonsDirectory = (
  html: string,
  baseUrl: string
): WebtoonsDirectoryItem[] => {
  const $ = Cheerio.load(html);
  const nodes = $(
    "a.link._card_item, .webtoon_list li a, .card_item, .challenge_lst li, .daily_card_item, ._searchResultItem"
  ).toArray();
  const out: WebtoonsDirectoryItem[] = [];

  for (const node of nodes) {
    const $node = $(node);
    const href =
      String($node.attr("href") ?? "").trim() ||
      pick($node, ["a[href*='/list?title_no=']", "a[href]"], "href");
    const contentUrl = normalizeWebtoonsContentUrl(baseUrl, href);
    const title =
      pick($node, ["strong.title", ".subj", ".info .title", "a[title]"]) ||
      pick($node, ["img[alt]"], "alt");
    const cover =
      pick($node, ["img[data-url]"], "data-url") ||
      pick($node, ["img[data-src]"], "data-src") ||
      pick($node, ["img[src]"], "src");
    if (!contentUrl || !title) continue;

    out.push({
      id: contentUrl,
      title,
      cover: resolveUrl(baseUrl, cover),
    });
    if (out.length >= 60) break;
  }

  return out;
};

export const parseWebtoonsContent = (
  html: string,
  baseUrl: string,
  contentId: string
): {
  title: string;
  cover: string;
  summary: string;
  creators: string[];
  status?: PublicationStatus;
} => {
  const $ = Cheerio.load(html);
  const root = $.root();
  const title = pick(root, ["h1.subj", "h3.subj", ".info .title", "h1"]) || `Webtoons ${contentId}`;
  const cover =
    pick(root, [".detail_body img"], "src") ||
    pick(root, ["meta[property='og:image']"], "content");
  const summary =
    pick(root, ["p.summary", ".detail .summary", "meta[name='description']"]) || "No summary";

  const creators = [pick(root, [".author:nth-of-type(1)"]), pick(root, [".author:nth-of-type(2)"])]
    .map((v) => v.trim())
    .filter(Boolean);

  const statusText =
    (pick(root, [".genre", ".day_info", ".detail_install_app"]) + " " + summary).toUpperCase();

  let status: PublicationStatus | undefined;
  if (/UP|EVERY|NOUVEAU|ONGOING|WEEKLY/.test(statusText)) {
    status = PublicationStatus.ONGOING;
  } else if (/END|COMPLETED|TERMIN[ÉE]/.test(statusText)) {
    status = PublicationStatus.COMPLETED;
  }

  return {
    title,
    cover: resolveUrl(baseUrl, cover),
    summary,
    creators,
    status,
  };
};

export const extractEpisodeListData = (
  html: string,
  url: string
): { titleNo: string; type: string } => {
  const urlObj = new URL(url);
  const urlTitleNo = urlObj.searchParams.get("title_no") || urlObj.searchParams.get("titleNo");

  if (urlTitleNo) {
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);
    const type = pathSegments[1] === "canvas" ? "canvas" : "webtoon";
    return { titleNo: urlTitleNo, type };
  }

  const titleNoMatch = html.match(/title_no\s*[=:]\s*["']?(\d+)["']?/i);
  if (titleNoMatch) {
    const pathSegments = urlObj.pathname.split("/").filter(Boolean);
    const type = pathSegments[1] === "canvas" ? "canvas" : "webtoon";
    return { titleNo: titleNoMatch[1], type };
  }

  return { titleNo: "", type: "webtoon" };
};

const parseChapterDate = (timestamp: number): Date => {
  if (timestamp > 0) return new Date(timestamp);
  return new Date(0);
};

const parseEpisodeTitle = (title: string, index: number): { number: number; display: string } => {
  const match = title.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const num = parseFloat(match[1]);
    return { number: num, display: title };
  }
  return { number: index + 1, display: title };
};

export const parseWebtoonsChapters = (
  html: string,
  baseUrl: string
): Array<{
  chapterId: string;
  title: string;
  index: number;
  number: number;
  date: Date;
}> => {
  try {
    const data: EpisodeListResponse = JSON.parse(html);
    const episodes = data.result?.episodeList || [];

    return episodes.map((ep, index) => {
      const match = parseEpisodeTitle(ep.episodeTitle, index);
      return {
        chapterId: ep.viewerLink,
        title: he.decode(ep.episodeTitle),
        index,
        number: match.number,
        date: parseChapterDate(ep.exposureDateMillis),
      };
    }).reverse();
  } catch (error) {
    console.warn("Failed to parse Webtoons API response as JSON:", error);
    return [];
  }
};

const imageUrlRegex = /(https?:\/\/[^\"'\s>]+\.(?:jpg|jpeg|png|webp|gif))(?:\?[^\"'\s>]*)?/gi;

export const parseWebtoonsPages = (html: string, baseUrl: string): string[] => {
  const $ = Cheerio.load(html);
  // Expanded selectors for various Webtoons page layouts
  const nodes = $(
    "div#_imageList > img, #_imageList img, .viewer_lst img, " +
    ".chapter-content img, .reading-content img, .image-viewer img, " +
    ".viewer img, .page-image img, ._imageList img"
  ).toArray();
  const out: string[] = [];

  console.log(`[Webtoons] Found ${nodes.length} image elements with selectors`);

  for (const node of nodes) {
    const $node = $(node);
    // Multiple attribute strategies including srcset
    let raw =
      String($node.attr("data-url") ?? "").trim() ||
      String($node.attr("data-src") ?? "").trim() ||
      String($node.attr("data-original") ?? "").trim() ||
      String($node.attr("src") ?? "").trim();

    // Handle srcset: take first URL before any whitespace/comma
    if (!raw) {
      const srcset = String($node.attr("srcset") ?? "").trim();
      if (srcset) {
        raw = srcset.split(/[\s,]+/)[0];
      }
    }

    if (!raw) continue;

    // Remove noise parameters (type=q90, quality=low/high etc)
    const clean = raw.replace(/[?&](type|quality|v)=\w+/gi, "");
    out.push(resolveUrl(baseUrl, clean));
    console.log(`[Webtoons] Extracted image:`, clean.substring(0, 80));
  }

  if (!out.length) {
    console.log("[Webtoons] No images from selectors, trying regex fallback");
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = imageUrlRegex.exec(html)) !== null) {
      const img = String(match[1] ?? "").trim();
      if (!img) continue;
      found.add(resolveUrl(baseUrl, img));
      if (found.size >= 300) break;
    }
    out.push(...Array.from(found));
    console.log(`[Webtoons] Regex fallback found ${found.size} images`);
  }

  console.log(`[Webtoons] Total pages extracted: ${out.length}`);
  return out;
};
