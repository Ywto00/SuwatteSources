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
  requestHtml,
  resolveUrl,
  extractEpisodeListData,
} from "./utils";

type DirectoryParsedItem = { id: string; title: string; cover: string };

export const WebtoonsContentSource = {
  getContent: async function (contentId: string): Promise<Content> {
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();
    const userAgent = await WebtoonsStore.userAgent();
    const url = resolveUrl(baseUrl, contentId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });
    const parsed = parseWebtoonsContent(html, baseUrl, contentId);

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
      chapters = parseWebtoonsChaptersFromHtml(html, baseUrl);
    }

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
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();
    const userAgent = await WebtoonsStore.userAgent();
    const url = resolveUrl(baseUrl, chapterId);
    const html = await requestHtml(url, baseUrl, { cookie, userAgent });

    const pages = parseWebtoonsPages(html, baseUrl).map((url): ChapterPage => ({ url }));

    if (!pages.length) {
      throw new Error("No pages found. The site structure may have changed.");
    }

    return { pages };
  },
};
