import {
  Chapter,
  ChapterData,
  ChapterPage,
  DefinedLanguages,
  DirectoryConfig,
  DirectoryRequest,
  Form,
  NetworkRequest,
  PagedResult,
  UITextField,
} from "@suwatte/daisuke";
import {
  buildSearchUrls,
  requestHtml,
  resolveUrl,
} from "./utils";
import {
  extractBookIdAndSlug,
  parseChapters,
  parseContent,
  parseDirectory,
  parsePages,
} from "./parser";
import { MadThemeContext, MadThemeRuntime } from "./types";

const DEFAULT_CHAPTER_SELECTORS =
  ".chapter-list a[href], #chapter-list a[href], .detail-chlist a[href], .chap-list a[href], .list-chapter a[href], .chapter__list a[href], li.wp-manga-chapter a[href]";

const DEFAULT_PAGE_SELECTORS =
  "#chapter-images img, .chapter-image img, .container-chapter-reader img, .chapter-content img, .reading-content img, .page-break img, .viewer img, .image-container img, .manga-page img, .chapter-reader img, img[data-src], img[data-lazy-src], img[data-original], img[data-srcset], img[data-lazy-srcset], img[srcset], img[src]";

export class MadThemeController {
  constructor(private readonly ctx: MadThemeContext) {}

  private key(name: string): string {
    return `${this.ctx.storeKeyPrefix}_${name}`;
  }

  async runtime(): Promise<MadThemeRuntime> {
    const baseUrl =
      (await ObjectStore.string(this.key("baseUrl")))?.trim() ||
      this.ctx.defaultBaseUrl;
    const cookie = (await ObjectStore.string(this.key("cookie")))?.trim() || "";
    const userAgent =
      (await ObjectStore.string(this.key("userAgent")))?.trim() || "";

    return { baseUrl, cookie, userAgent };
  }

  async setSetup(form: {
    baseUrl: string;
    cookie?: string;
    userAgent?: string;
  }): Promise<void> {
    const url = form.baseUrl.trim();
    if (!url) {
      throw new Error("Base URL is required");
    }

    await ObjectStore.set(this.key("baseUrl"), url);
    await ObjectStore.set(this.key("cookie"), String(form.cookie ?? "").trim());
    await ObjectStore.set(this.key("userAgent"), String(form.userAgent ?? "").trim());
  }

  async setupMenu(): Promise<Form> {
    const runtime = await this.runtime();
    return {
      sections: [
        {
          header: `${this.ctx.displayName} Configuration`,
          children: [
            UITextField({
              id: "baseUrl",
              title: "Base URL",
              value: runtime.baseUrl,
              placeholder: this.ctx.defaultBaseUrl,
            }),
            UITextField({
              id: "cookie",
              title: "Cookie (optional)",
              value: runtime.cookie,
              placeholder: "cf_clearance=...; other_cookie=...",
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent (optional)",
              value: runtime.userAgent,
              placeholder: "Mozilla/5.0 (...)",
            }),
          ],
        },
      ],
    };
  }

  async preferenceMenu(): Promise<Form> {
    const runtime = await this.runtime();
    return {
      sections: [
        {
          header: `${this.ctx.displayName} Settings`,
          footer: "Optional: configure cookie and user-agent for accessing the site.",
          children: [
            UITextField({
              id: "cookie",
              title: "Cookie",
              value: runtime.cookie,
              placeholder: "cf_clearance=...; session=...",
              didChange: async (value: string) => {
                await ObjectStore.set(this.key("cookie"), value.trim());
              },
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent",
              value: runtime.userAgent,
              placeholder: "Mozilla/5.0 (...)",
              didChange: async (value: string) => {
                await ObjectStore.set(this.key("userAgent"), value.trim());
              },
            }),
          ],
        },
      ],
    };
  }

  async isSetup(): Promise<{ state: boolean }> {
    const runtime = await this.runtime();
    return { state: !!runtime.baseUrl };
  }

  async getDirectory(request: DirectoryRequest): Promise<PagedResult> {
    const runtime = await this.runtime();
    const query = request.query?.trim();
    const page = request.page ?? 1;
    let items: PagedResult["results"] = [];
    let lastError: unknown;

    if (query) {
      const searchUrls = this.ctx.buildSearchUrl
        ? [this.ctx.buildSearchUrl(runtime.baseUrl, query, page)]
        : buildSearchUrls(runtime.baseUrl, query);
      for (const target of searchUrls) {
        try {
          const html = await requestHtml(target, runtime.baseUrl, runtime);
          items = parseDirectory(html, runtime.baseUrl).map((item) => ({
            id: item.id,
            title: item.title,
            cover: item.cover ?? "",
          }));
          if (items.length) break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
    } else {
      const root = runtime.baseUrl.replace(/\/+$/, "");
      const defaultCatalogUrls = [
        `${root}/home`,
        root,
        `${root}/popular`,
        `${root}/latest`,
      ];

      const catalogUrls = this.ctx.buildListUrl
        ? [this.ctx.buildListUrl(runtime.baseUrl, request.listId, page)]
        : Array.from(new Set(defaultCatalogUrls));
      for (const target of catalogUrls) {
        try {
          const html = await requestHtml(target, runtime.baseUrl, runtime);
          items = parseDirectory(html, runtime.baseUrl).map((item) => ({
            id: item.id,
            title: item.title,
            cover: item.cover ?? "",
          }));
          if (items.length) break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
    }

    if (!items.length && lastError) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`Failed to fetch ${this.ctx.displayName} directory.`);
    }

    return {
      results: items,
      isLastPage: true,
    };
  }

  async getDirectoryConfig(): Promise<DirectoryConfig> {
    return { searchable: true };
  }

  async getContent(contentId: string) {
    const runtime = await this.runtime();
    const url = resolveUrl(runtime.baseUrl, contentId);
    const html = await requestHtml(url, runtime.baseUrl, runtime);
    const parsed = parseContent(html, runtime.baseUrl, contentId);

    const creators = parsed.authors ?? [];

    const properties = parsed.genres && parsed.genres.length
      ? (() => {
          const clean = (s: string) => s.replace(/,/g, "").replace(/\s+/g, " ").trim();
          return [
            {
              id: "genres",
              title: "Genres",
              tags: parsed.genres.map((g) => {
                const t = clean(g);
                return { id: t.toLowerCase().replace(/\s+/g, "-"), title: t };
              }),
            },
          ];
        })()
      : undefined;

    return {
      title: parsed.title,
      cover: parsed.cover,
      summary: parsed.summary,
      webUrl: url,
      status: parsed.status,
      creators: creators.length ? creators : undefined,
      info: creators.length ? creators : undefined,
      properties,
    };
  }

  async getChapters(contentId: string): Promise<Chapter[]> {
    const runtime = await this.runtime();
    const url = resolveUrl(runtime.baseUrl, contentId);
    const html = await requestHtml(url, runtime.baseUrl, runtime);

    const { bookId, bookSlug } = extractBookIdAndSlug(html);
    const chapterSelectors = this.ctx.chapterSelectors ?? DEFAULT_CHAPTER_SELECTORS;

    let chapters = parseChapters(html, chapterSelectors);

    const showMoreChapters = html.includes("getChapters()") && !!bookId && !!bookSlug;
    if (showMoreChapters && bookId) {
      try {
        const apiUrl = `${runtime.baseUrl}/api/manga/${bookId}/chapters?source=detail`;
        const apiHtml = await requestHtml(apiUrl, runtime.baseUrl, runtime);
        const apiChapters = parseChapters(apiHtml, chapterSelectors);
        const current = new Set(chapters.map((c) => c.chapterId));
        const merged = apiChapters.filter((c) => !current.has(c.chapterId));
        chapters = [...chapters, ...merged];
      } catch {
        // Keep HTML chapter list when API is unavailable.
      }
    }

    // Keep original site order and deduplicate by chapterId.
    const seenChapterIds = new Set<string>();
    chapters = chapters
      .filter((chapter) => {
        if (!chapter.chapterId || seenChapterIds.has(chapter.chapterId)) {
          return false;
        }
        seenChapterIds.add(chapter.chapterId);
        return true;
      })
      .map((chapter, index) => ({ ...chapter, index }));

    return chapters.map((chapter) => ({
      chapterId: chapter.chapterId,
      title: chapter.title,
      index: chapter.index,
      // Preserve parsed chapter numbers (e.g. 228, 202.5) while keeping site order by index.
      number: chapter.number,
      date: chapter.date,
      language: DefinedLanguages.UNIVERSAL,
    }));
  }

  async getChapterData(_contentId: string, chapterId: string): Promise<ChapterData> {
    const runtime = await this.runtime();
    const chapterUrl = resolveUrl(runtime.baseUrl, chapterId);
    const html = await requestHtml(chapterUrl, runtime.baseUrl, runtime);
    const pageSelectors = this.ctx.pageSelectors ?? DEFAULT_PAGE_SELECTORS;

    let pages = parsePages(html, runtime.baseUrl, pageSelectors);

    const chapterIdMatch = html.match(/chapterId\s*[=:]\s*["']?(\d+)["']?/);
    if (chapterIdMatch?.[1]) {
      try {
        const apiUrl = `${runtime.baseUrl}/service/backend/chapterServer/?server_id=1&chapter_id=${chapterIdMatch[1]}`;
        const headers: Record<string, string> = {
          "User-Agent": runtime.userAgent || "",
          Referer: runtime.baseUrl,
        };
        if (runtime.cookie) {
          headers.Cookie = runtime.cookie;
        }

        const apiResponse = await new NetworkClient().request({
          url: apiUrl,
          method: "GET",
          headers,
        });

        const apiHtml =
          typeof apiResponse.data === "string"
            ? apiResponse.data
            : JSON.stringify(apiResponse.data);

        const apiPages = parsePages(apiHtml, runtime.baseUrl, pageSelectors);
        // Keep the most complete source; some endpoints return partial pages.
        if (apiPages.length > pages.length) {
          pages = apiPages;
        }
      } catch {
        // Keep HTML pages when API is unavailable.
      }
    }

    // Fallback for chapter pages split as /page-1, /page-2, ...
    // Some sources only embed part of the images in each paginated subpage.
    const pagedLinks = Array.from(
      new Set(
        Array.from(
          html.matchAll(/href=["']([^"']*\/page-\d+)["']/gi),
          (m) => String(m[1] ?? "").trim()
        ).filter(Boolean)
      )
    );

    if (pagedLinks.length) {
      const mergedPages = new Set(pages);
      const taskFuncs = pagedLinks.map((link) => async () => {
        try {
          const pageUrl = resolveUrl(runtime.baseUrl, link);
          const pageHtml = await requestHtml(pageUrl, runtime.baseUrl, runtime);
          return parsePages(pageHtml, runtime.baseUrl, pageSelectors);
        } catch {
          return [] as string[];
        }
      });

      // Run paginated subpage fetches in small batches to avoid large parallel spikes.
      const BATCH_SIZE = 4;
      for (let i = 0; i < taskFuncs.length; i += BATCH_SIZE) {
        const batch = taskFuncs.slice(i, i + BATCH_SIZE).map((fn) => fn());
        const results = await Promise.all(batch);
        for (const part of results) {
          for (const p of part) {
            if (p && p.startsWith("http")) mergedPages.add(p);
          }
        }
      }

      pages = Array.from(mergedPages);
    }

    const uniquePages = [...new Set(pages.filter((p) => p && p.startsWith("http")))];
    const chapterPages = uniquePages.map((url): ChapterPage => ({ url }));

    if (!chapterPages.length) {
      throw new Error("No pages found. The site structure may have changed.");
    }

    // Best-effort prefetch: warm next chapter HTML/pages in background when available.
    const nextHrefMatch = html.match(/id=["']btn-next["'][^>]*href=["']([^"']+)["']/i);
    const nextHref = String(nextHrefMatch?.[1] ?? "").trim();
    if (nextHref && nextHref !== "#") {
      void (async () => {
        try {
          const nextUrl = resolveUrl(runtime.baseUrl, nextHref);
          const nextHtml = await requestHtml(nextUrl, runtime.baseUrl, runtime);
          // Parse once to warm request path/cache without impacting current chapter latency.
          parsePages(nextHtml, runtime.baseUrl, pageSelectors);
        } catch {
          // Ignore prefetch errors.
        }
      })();
    }

    return { pages: chapterPages };
  }

  async willRequestImage(url: string): Promise<NetworkRequest> {
    const runtime = await this.runtime();
    const headers: Record<string, string> = {
      Accept: "image/*",
      Referer: runtime.baseUrl,
    };

    if (runtime.userAgent) {
      headers["User-Agent"] = runtime.userAgent;
    }
    if (runtime.cookie) {
      headers.Cookie = runtime.cookie;
    }

    return { url, headers };
  }
}
