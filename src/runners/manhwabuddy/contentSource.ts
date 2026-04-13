// Content source: fetches content metadata, chapters and pages using utils parsers
import {
  Chapter,
  ChapterData,
  ChapterPage,
  Content,
  DefinedLanguages,
  Property,
} from "@suwatte/daisuke";
import { ManhwaBuddyStore } from "./store";
import {
  parseManhwaBuddyContent,
  parseManhwaBuddyPages,
  parseManhwaBuddyChapters,
  requestHtml,
  resolveUrl,
} from "./utils";

export const ManhwaBuddyContentSource = {
  getContent: async function (contentId: string): Promise<Content> {
    const baseUrl = await ManhwaBuddyStore.baseUrl();
    const cookie = await ManhwaBuddyStore.cookie();
    const userAgent = await ManhwaBuddyStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });
    const parsed = parseManhwaBuddyContent(html, baseUrl, contentId);

    // Combine authors and artists into creators
    const creators = [...(parsed.authors || []), ...(parsed.artists || [])];

    // Build properties from genres
    const properties = parsed.genres?.length
      ? (() => {
          const clean = (s: string) => s.replace(/,/g, "").replace(/\s+/g, " ").trim();
          return [
            {
              id: "genres",
              title: "Genres",
              tags: parsed.genres.map((genre) => {
                const t = clean(genre);
                return { id: t.toLowerCase().replace(/\s+/g, "-"), title: t };
              }),
            } as Property,
          ];
        })()
      : undefined;

    return {
      title: parsed.title,
      cover: parsed.cover,
      summary: parsed.summary,
      webUrl: url,
      creators: creators.length ? creators : undefined,
      properties,
      status: parsed.status,
      recommendedPanelMode: 0, // ReadingMode.PAGED_COMIC
    };
  },

  getChapters: async function (contentId: string): Promise<Chapter[]> {
    const baseUrl = await ManhwaBuddyStore.baseUrl();
    const cookie = await ManhwaBuddyStore.cookie();
    const userAgent = await ManhwaBuddyStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });

    const chapters = parseManhwaBuddyChapters(html, baseUrl, contentId);

    return chapters.map((chapter) => ({
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
    const baseUrl = await ManhwaBuddyStore.baseUrl();
    const cookie = await ManhwaBuddyStore.cookie();
    const userAgent = await ManhwaBuddyStore.userAgent();
    const url = resolveUrl(baseUrl, chapterId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });

    const pages = parseManhwaBuddyPages(html, baseUrl).map(
      (url): ChapterPage => ({ url })
    );

    if (!pages.length) {
      throw new Error("No pages found. The site structure may have changed.");
    }

    return { pages };
  },
};
