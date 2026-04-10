import { PublicationStatus } from "@suwatte/daisuke";
import * as Cheerio from "cheerio";
import { DirectoryItem } from "./types";
import {
  firstSrcCandidate,
  normalizeSeriesHref,
  parseChapterDate,
  pick,
  resolveUrl,
} from "./utils";

export const parseDirectory = (html: string, baseUrl: string): DirectoryItem[] => {
  const $ = Cheerio.load(html);
  const cards = [
    ".book-item",
    ".page-item-detail",
    ".listupd .bs .bsx",
    "div.bsx",
    ".card-item",
  ];

  const out: DirectoryItem[] = [];
  for (const selector of cards) {
    for (const node of $(selector).toArray()) {
      const $node = $(node);
      const href =
        pick($node, ["a[href*='/manga/']"], "href") ||
        pick($node, ["a[href]"], "href");
      const title =
        pick($node, [".book-title", ".tt", "h3", "a[title]"]) ||
        pick($node, ["img[alt]"], "alt");
      const cover =
        pick($node, ["img[data-src]"], "data-src") ||
        pick($node, ["img[data-lazy-src]"], "data-lazy-src") ||
        firstSrcCandidate(
          pick($node, ["img[data-lazy-srcset]"], "data-lazy-srcset")
        ) ||
        firstSrcCandidate(pick($node, ["img[srcset]"], "srcset")) ||
        pick($node, ["img[src]"], "src");

      if (!href || !title) continue;
      out.push({
        id: normalizeSeriesHref(baseUrl, href),
        title,
        cover: resolveUrl(baseUrl, cover),
      });
      if (out.length >= 60) return out;
    }
    if (out.length) return out;
  }

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
      firstSrcCandidate(
        String($node.find("img").attr("data-lazy-srcset") ?? "").trim()
      ) ||
      firstSrcCandidate(String($node.find("img").attr("srcset") ?? "").trim()) ||
      String($node.find("img").attr("src") ?? "").trim();

    if (!href || !title) continue;
    out.push({
      id: normalizeSeriesHref(baseUrl, href),
      title,
      cover: resolveUrl(baseUrl, cover),
    });
    if (out.length >= 60) break;
  }

  return out;
};

export const parseContent = (
  html: string,
  baseUrl: string,
  contentId: string
): {
  title: string;
  cover: string;
  summary: string;
  authors?: string[];
  status?: PublicationStatus;
  genres?: string[];
} => {
  const $ = Cheerio.load(html);
  const root = $.root();

  const title =
    pick(root, [".post-title h1", "h1.entry-title", "h1"]) ||
    `Manga ${contentId}`;
  const cover =
    pick(root, [".img-cover img"], "data-src") ||
    pick(root, [".img-cover img"], "data-lazy-src") ||
    pick(root, [".img-cover img"], "src") ||
    pick(root, [".summary_image img"], "data-src") ||
    pick(root, [".summary_image img"], "data-lazy-src") ||
    pick(root, [".summary_image img"], "src") ||
    pick(root, [".info-image img"], "data-src") ||
    pick(root, [".info-image img"], "src") ||
    pick(root, [".thumb img"], "data-src") ||
    pick(root, [".thumb img"], "src") ||
    pick(root, ["meta[property='og:image']"], "content");

  const summaryNodes = root.find(
    ".content, .content p, .summary__content, .description-summary, .summary-content, .summary, .entry-content p"
  );
  const summary = summaryNodes.length
    ? summaryNodes.first().text().trim()
    : pick(root, ["meta[name='description']"], "content") || "No summary";

  const authors = root
    .find(".author-content a, .author_list a, .meta .author a")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  // Fallback: parse .meta.box structure like the example HTML
  if ((!authors || !authors.length) && root.find(".meta.box").length) {
    const meta = root.find(".meta.box");
    const authorNode = meta
      .find("p")
      .filter((_, el) => $(el).text().toLowerCase().includes("authors"))
      .first();
    if (authorNode.length) {
      const list = $(authorNode).find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean);
      if (list.length) authors.push(...list);
    }
  }

  let statusText =
    pick(root, [".status, .meta .status, .manga-info .status"]) + " " + summary;

  if (root.find(".meta.box").length) {
    const meta = root.find(".meta.box");
    const statusNode = meta
      .find("p")
      .filter((_, el) => $(el).text().toLowerCase().includes("status"))
      .first();
    if (statusNode.length) {
      const s = $(statusNode).text().replace(/\s+/g, " ").trim();
      if (s) statusText = s + " " + statusText;
    }
  }

  let status: PublicationStatus | undefined;
  if (/ONGOING|UP|EVERY|WEEKLY/.test(statusText.toUpperCase())) {
    status = PublicationStatus.ONGOING;
  } else if (/COMPLETED|END|FINISHED/.test(statusText.toUpperCase())) {
    status = PublicationStatus.COMPLETED;
  }

  // Extract genres if present in .meta.box
  let genres: string[] | undefined;
  if (root.find(".meta.box").length) {
    const meta = root.find(".meta.box");
    const genresNode = meta
      .find("p")
      .filter((_, el) => $(el).text().toLowerCase().includes("genres"))
      .first();
    if (genresNode.length) {
      const g = $(genresNode).find("a").map((_, a) => $(a).text().trim()).get().filter(Boolean);
      if (g.length) genres = g;
    }
  }

  return {
    title,
    cover: resolveUrl(baseUrl, cover),
    summary,
    authors: authors.length ? authors : undefined,
    status,
    genres,
  };
};

export const extractBookIdAndSlug = (
  html: string
): { bookId?: string; bookSlug?: string } => {
  const bookIdMatch = html.match(/bookId\s*[=:]\s*["']?(\d+)["']?/);
  const bookSlugMatch = html.match(/bookSlug\s*[=:]\s*["']([^"']+)["']/);

  return {
    bookId: bookIdMatch ? bookIdMatch[1] : undefined,
    bookSlug: bookSlugMatch ? bookSlugMatch[1] : undefined,
  };
};

export const parseChapters = (
  html: string,
  chapterSelectors: string
): Array<{
  chapterId: string;
  title: string;
  index: number;
  number: number;
  date: Date;
}> => {
  const $ = Cheerio.load(html);
  const rows = $(chapterSelectors).toArray();

  const normalizeChapterTitle = (value: string): string => {
    return value
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s*:\s*/g, ": ")
      .replace(/\s*\.\s*/g, ".")
      .replace(/\s*,\s*/g, ", ")
      .trim();
  };

  const out: Array<{
    chapterId: string;
    title: string;
    index: number;
    number: number;
    date: Date;
  }> = [];

  const parseChapterNumber = (title: string, href: string): number => {
    const titleMatch = title.match(/(\d+(?:\.\d+)?)/);
    if (titleMatch) return Number(titleMatch[1]);

    const hrefLower = href.toLowerCase();
    const hrefDecimal = hrefLower.match(/chapter[-_/](\d+)[-.](\d+)/i);
    if (hrefDecimal) {
      return Number(`${hrefDecimal[1]}.${hrefDecimal[2]}`);
    }

    const hrefMatch = hrefLower.match(/chapter[-_/](\d+(?:\.\d+)?)/i);
    if (hrefMatch) return Number(hrefMatch[1]);

    const low = title.toLowerCase();
    if (/(bonus|extra|special|oneshot|one-shot)/.test(low) || /bonus|extra|special|oneshot|one-shot/.test(hrefLower)) {
      return 0;
    }

    // Avoid inflated fallback numbers (e.g. 122) which break next/prev navigation.
    return 0;
  };

  for (let i = 0; i < rows.length; i++) {
    const node = rows[i];
    const $node = $(node);
    const href = pick($node, ["a[href]"], "href") || String($node.attr("href") ?? "").trim();
    const rawTitle =
      $node.find(".chapter-name, .chapter-title, .title, span").first().text().trim() ||
      $node.text().replace(/\s+/g, " ").trim();
    const title = normalizeChapterTitle(rawTitle);

    const dateText =
      $node
        .find(".ct-update, .chapter-update, .date, .chapter-date, .update, time")
        .first()
        .text()
        .trim() ||
      $node
        .find(".ct-update, .chapter-update, .date, .chapter-date, .update, time")
        .first()
        .attr("title") ||
      "";

    if (!href || !title) continue;

    let chapterId = href;
    if (/^https?:\/\//i.test(href)) {
      try {
        const url = new URL(href);
        // Use only pathname (no query) so chapter IDs are stable and do not include search params
        chapterId = url.pathname.replace(/\/+$/, "");
      } catch {
        chapterId = href.split(/[?#]/)[0];
      }
    }

    const number = parseChapterNumber(title, href);
    const date = parseChapterDate(dateText);

    out.push({ chapterId, title, index: i, number, date });
  }

  // Keep chapter order exactly as provided by the site.
  return out.map((item, idx) => ({ ...item, index: idx }));
};

export const parsePages = (html: string, baseUrl: string, pageSelectors: string): string[] => {
  const $ = Cheerio.load(html);
  const out: string[] = [];
  const seen = new Set<string>();

  const isPlaceholder = (s: string) => {
    const low = s.toLowerCase();
    if (low.startsWith("data:image")) return true;
    return /placeholder|loading|blank|spinner|lazy/i.test(low);
  };

  const pushUrl = (src: string) => {
    if (!src) return;
    if (isPlaceholder(src)) return;
    const fullUrl = resolveUrl(baseUrl, src);
    if (!/^https?:\/\//i.test(fullUrl)) return;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    out.push(fullUrl);
  };

  // Priority path: parse from the exact chapter container in DOM order.
  const chapterContainer = $("#chapter-images").first();
  const chapterNodes = chapterContainer.length
    ? chapterContainer.find(".chapter-image img").toArray()
    : [];

  const nodes = chapterNodes.length ? chapterNodes : $(pageSelectors).toArray();

  for (const node of nodes) {
    const $node = $(node);
    const src =
      String($node.attr("data-src") ?? "").trim() ||
      String($node.attr("data-lazy-src") ?? "").trim() ||
      String($node.attr("data-original") ?? "").trim() ||
      String($node.attr("data-url") ?? "").trim() ||
      firstSrcCandidate(String($node.attr("data-srcset") ?? "")) ||
      firstSrcCandidate(String($node.attr("data-lazy-srcset") ?? "")) ||
      firstSrcCandidate(String($node.attr("srcset") ?? "")) ||
      String($node.attr("src") ?? "").trim();

    pushUrl(src);
  }

  // If the site lazy-loads with delays, infer expected page count from "Loading x/y".
  let expectedTotal = 0;
  if (chapterContainer.length) {
    for (const span of chapterContainer.find(".chapter-image span").toArray()) {
      const t = String($(span).text() ?? "").replace(/\u00a0/g, " ");
      const m = t.match(/(\d+)\s*\/\s*(\d+)/);
      if (!m) continue;
      const total = Number(m[2]);
      if (Number.isFinite(total) && total > expectedTotal) expectedTotal = total;
    }
  }

  // Strong fallback used by MangaBuddy chapter pages.
  // Example: var chapImages = "url1,url2,...";
  const chapImagesMatch = html.match(/var\s+chapImages\s*=\s*["']([^"']+)["']/i);
  if (chapImagesMatch?.[1]) {
    const list = chapImagesMatch[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const item of list) {
      pushUrl(item);
      if (expectedTotal > 0 && out.length >= expectedTotal) break;
      if (out.length >= 300) break;
    }
  }

  // Fallback within the exact chapter container only, so ad blocks outside do not pollute.
  if (chapterContainer.length && expectedTotal > 0 && out.length < expectedTotal) {
    const source = String(chapterContainer.html() ?? "").replace(/\\\//g, "/");
    const regex =
      /(https?:\/\/[^\"'\s>]+\.(?:jpg|jpeg|png|webp|gif|webm))(?:\?[^\"'\s>]*)?/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const img = String(match[1] ?? "").trim();
      pushUrl(img);
      if (out.length >= expectedTotal) break;
    }
  }

  if (!out.length) {
    const source = html.replace(/\\\//g, "/");
    const regex =
      /(https?:\/\/[^\"'\s>]+\.(?:jpg|jpeg|png|webp|gif|webm))(?:\?[^\"'\s>]*)?/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const img = String(match[1] ?? "").trim();
      pushUrl(img);
      if (out.length >= 300) break;
    }
  }

  return out;
};
