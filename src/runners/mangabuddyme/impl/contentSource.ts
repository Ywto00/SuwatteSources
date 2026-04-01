import {
  Chapter,
  ChapterData,
  ChapterPage,
  Content,
  DefinedLanguages,
} from "@suwatte/daisuke";
import * as Cheerio from "cheerio";
import { MadBuddyStore } from "../store";
import {
  parseMangaBuddyChapters,
  parseMangaBuddyContent,
  parseMangaBuddyPages,
  requestHtml,
  resolveUrl,
  extractBookIdAndSlug,
} from "../utils";

const toPath = (value: string): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname.replace(/\/+$/, "").replace(/^\/manga\//i, "/");
    } catch {
      return raw.replace(/\/+$/, "").replace(/^\/manga\//i, "/");
    }
  }
  return raw.replace(/\/+$/, "").replace(/^\/manga\//i, "/");
};

const chapterBelongsToContent = (chapterId: string, contentId: string): boolean => {
  const chapterPath = toPath(chapterId).toLowerCase();
  const contentPath = toPath(contentId).toLowerCase();
  if (!chapterPath || !contentPath) return true;
  return chapterPath.startsWith(`${contentPath}/`);
};

export const MadBuddyContentSource = {
  getContent: async function (contentId: string): Promise<Content> {
    const baseUrl = await MadBuddyStore.baseUrl();
    const cookie = await MadBuddyStore.cookie();
    const userAgent = await MadBuddyStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });
    const parsed = parseMangaBuddyContent(html, baseUrl, contentId);

    return {
      title: parsed.title,
      cover: parsed.cover,
      summary: parsed.summary,
      webUrl: url,
    };
  },

  getChapters: async function (contentId: string): Promise<Chapter[]> {
    const baseUrl = await MadBuddyStore.baseUrl();
    const cookie = await MadBuddyStore.cookie();
    const userAgent = await MadBuddyStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });

    const { bookId, bookSlug } = extractBookIdAndSlug(html);

    let chapters = parseMangaBuddyChapters(html, baseUrl);
    const $ = Cheerio.load(html);
    const showMoreChapters = $("div#show-more-chapters > span[onclick='getChapters()']").length > 0;

    if (showMoreChapters && bookId && bookSlug) {
      try {
        const apiUrl = `${baseUrl}/api/manga/${bookId}/chapters?source=detail`;
        const apiHtml = await requestHtml(apiUrl, baseUrl, { cookie, userAgent });
        const apiChapters = parseMangaBuddyChapters(apiHtml, baseUrl);
        const htmlUrls = new Set(chapters.map(c => c.chapterId));
        const newChapters = apiChapters.filter(c => !htmlUrls.has(c.chapterId));
        chapters = [...chapters, ...newChapters];
      } catch (error) {
        console.warn("Failed to fetch additional chapters from API:", error);
      }
    }

    chapters = chapters.filter((chapter) => chapterBelongsToContent(chapter.chapterId, contentId));

    return chapters.map(chapter => ({
      chapterId: chapter.chapterId,
      title: chapter.title,
      index: chapter.index,
      number: chapter.number,
      date: chapter.date,
      language: DefinedLanguages.UNIVERSAL,
    }));
  },

  getChapterData: async function (
    _contentId: string,
    chapterId: string
  ): Promise<ChapterData> {
    const baseUrl = await MadBuddyStore.baseUrl();
    const cookie = await MadBuddyStore.cookie();
    const userAgent = await MadBuddyStore.userAgent();
    // chapterId is a relative path (e.g., "/chapter-123/...") - resolve to absolute URL
    const url = resolveUrl(baseUrl, chapterId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });

    // Try to extract numeric chapter ID from HTML for API call
    const chapterIdMatch = html.match(/chapterId\s*[=:]\s*["']?(\d+)["']?/);

    let pages = parseMangaBuddyPages(html, baseUrl);

    // If we have both IDs, try the chapter server API for cleaner image data
    if (chapterIdMatch) {
      try {
        const apiUrl = `${baseUrl}/service/backend/chapterServer/?server_id=1&chapter_id=${chapterIdMatch[1]}`;
        const headers: Record<string, string> = {
          "User-Agent": userAgent || "",
          Referer: baseUrl,
        };
        if (cookie) {
          headers.Cookie = cookie;
        }
        const apiResponse = await new NetworkClient().request({
          url: apiUrl,
          method: "GET",
          headers,
        });
        const apiHtml = typeof apiResponse.data === "string" ? apiResponse.data : JSON.stringify(apiResponse.data);
        const apiPages = parseMangaBuddyPages(apiHtml, baseUrl);
        if (apiPages.length) {
          pages = apiPages;
        }
      } catch (error) {
        console.warn("API fetch failed, falling back to HTML parsing:", error);
      }
    }

    const uniquePages = [...new Set(pages.filter(p => p && p.startsWith('http')))];
    const chapterPages = uniquePages.map((url): ChapterPage => ({ url }));

    if (!chapterPages.length) {
      throw new Error("No pages found. The site structure may have changed.");
    }

    return { pages: chapterPages };
  },
};
