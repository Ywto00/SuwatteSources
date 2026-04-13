import {
  Chapter,
  ChapterData,
  ChapterPage,
  Content,
  DefinedLanguages,
} from "@suwatte/daisuke";
import { WebtoonsStore } from "./store";
import {
  parseWebtoonsChapters,
  parseWebtoonsChaptersFromHtml,
  parseWebtoonsContent,
  parseWebtoonsPages,
  parseWebtoonsViewerNavigation,
  requestHtml,
  resolveUrl,
  extractEpisodeListData,
} from "./utils";

type DirectoryParsedItem = { id: string; title: string; cover: string };

const extractEpisodeNo = (chapterId: string, fallback: number): number => {
  const raw = String(chapterId ?? "");
  const queryMatch = raw.match(/[?&]episode_(?:no|No)=(\d+)/i);
  if (queryMatch) {
    const value = Number(queryMatch[1]);
    if (Number.isFinite(value)) return value;
  }
  const pathMatch = raw.match(/\/episode-(\d+)\//i);
  if (pathMatch) {
    const value = Number(pathMatch[1]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
};

const isInvalidCover = (cover: string): boolean => {
  const raw = String(cover ?? "").trim();
  if (!raw) return true;
  return /\/qr\//i.test(raw) || /bg_transparency\.png/i.test(raw);
};

export const WebtoonsContentSource = {
  getContent: async function (contentId: string): Promise<Content> {
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();
    const userAgent = await WebtoonsStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });
    const parsed = parseWebtoonsContent(html, baseUrl, contentId);

    // Fallback to cached cover when detail page cover is missing/invalid.
    if (isInvalidCover(parsed.cover) && parsed.webTitleNo) {
      try {
        const cached = await WebtoonsStore.getCachedCover(parsed.webTitleNo);
        if (cached && !isInvalidCover(cached)) parsed.cover = cached;
      } catch {
        // ignore
      }
    }

    return {
      title: parsed.title,
      cover: parsed.cover,
      summary: parsed.summary,
      webUrl: url,
      creators: parsed.creators,
      status: parsed.status,
    };
  },

  getChapters: async function (contentId: string): Promise<Chapter[]> {
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();
    const userAgent = await WebtoonsStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });

    const { titleNo, type } = extractEpisodeListData(html, url);

    if (!titleNo) {
      throw new Error("Cannot extract title_no from URL or page content");
    }

    const apiUrl = `https://m.webtoons.com/api/v1/${type}/${titleNo}/episodes?pageSize=99999`;
    let chapters = [] as ReturnType<typeof parseWebtoonsChapters>;

    try {
      const apiHtml = await requestHtml(apiUrl, baseUrl, { cookie, userAgent, mobile: true });
      chapters = parseWebtoonsChapters(apiHtml, baseUrl);
    } catch {
      chapters = [];
    }

    if (!chapters.length) {
      // Parse first page from HTML
      chapters = parseWebtoonsChaptersFromHtml(html, baseUrl);

      // If we have pagination, attempt to fetch additional pages and merge chapters
      try {
        const $ = (await import("cheerio")).default.load(html);
        const pageLinks = new Set<string>();
        $(".paginate a[href]").each((_, el) => {
          const href = String($(el).attr("href") ?? "").trim();
          if (href && href.includes("page=")) pageLinks.add(href);
        });

        for (const link of Array.from(pageLinks)) {
          try {
            const nextHtml = await requestHtml(resolveUrl(baseUrl, link), baseUrl, { cookie, userAgent });
            const more = parseWebtoonsChaptersFromHtml(nextHtml, baseUrl);
            if (more && more.length) {
              const existing = new Set(chapters.map((c) => c.chapterId));
              for (const c of more) {
                if (!existing.has(c.chapterId)) chapters.push(c);
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        // ignore pagination errors
      }
    }

    const normalized = Array.from(new Map(chapters.map((c) => [c.chapterId, c])).values())
      .sort((a, b) => {
        const na = extractEpisodeNo(a.chapterId, a.number);
        const nb = extractEpisodeNo(b.chapterId, b.number);
        if (na !== nb) return nb - na;
        return a.chapterId.localeCompare(b.chapterId);
      })
      .map((chapter, index) => ({ ...chapter, index, number: extractEpisodeNo(chapter.chapterId, chapter.number) }));

    return normalized.map(chapter => ({
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
    const MAX_AUTO_APPENDED_CHAPTERS = 1;
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();
    const userAgent = await WebtoonsStore.userAgent();
    const initialUrl = resolveUrl(baseUrl, chapterId);
    const initialHtml = await requestHtml(initialUrl, baseUrl, { cookie, userAgent });
    const pages = parseWebtoonsPages(initialHtml, baseUrl).map((url): ChapterPage => ({ url }));

    // Follow site viewer navigation once, so reaching the end can continue into the next episode.
    const visited = new Set<string>([initialUrl]);
    let navigation = parseWebtoonsViewerNavigation(initialHtml, baseUrl);
    for (let i = 0; i < MAX_AUTO_APPENDED_CHAPTERS; i++) {
      const nextChapterUrl = navigation.nextChapterId ? resolveUrl(baseUrl, navigation.nextChapterId) : "";
      if (!nextChapterUrl || visited.has(nextChapterUrl)) break;
      visited.add(nextChapterUrl);

      try {
        const nextHtml = await requestHtml(nextChapterUrl, baseUrl, { cookie, userAgent });
        const nextPages = parseWebtoonsPages(nextHtml, baseUrl).map((url): ChapterPage => ({ url }));
        if (!nextPages.length) break;
        pages.push(...nextPages);
        navigation = parseWebtoonsViewerNavigation(nextHtml, baseUrl);
      } catch {
        break;
      }
    }

    if (!pages.length) {
      throw new Error("No pages found. The site structure may have changed.");
    }

    return { pages };
  },
};
