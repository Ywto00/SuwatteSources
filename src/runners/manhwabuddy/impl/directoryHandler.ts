import {
  DirectoryConfig,
  DirectoryHandler,
  DirectoryRequest,
  PagedResult,
} from "@suwatte/daisuke";
import { ManhwaBuddyStore } from "../store";
import {
  buildManhwaBuddySearchUrl,
  buildManhwaBuddyGenreUrl,
  parseManhwaBuddyDirectory,
  requestHtml,
} from "../utils";

export const ManhwaBuddyDirectoryHandler: DirectoryHandler = {
  getDirectory: async function (request: DirectoryRequest): Promise<PagedResult> {
    const baseUrl = await ManhwaBuddyStore.baseUrl();
    const cookie = await ManhwaBuddyStore.cookie();
    const userAgent = await ManhwaBuddyStore.userAgent();
    if (!baseUrl) {
      throw new Error("Set Base URL in setup/preferences.");
    }

    const query = request.query?.trim();
    const listId = request.listId;
    let items: PagedResult["results"] = [];
    let lastError: unknown;

    let targetUrl = "";
    if (query) {
      // Search
      const page = request.page ?? 1;
      targetUrl = buildManhwaBuddySearchUrl(baseUrl, query, page);
    } else if (listId === "template_popular_list" || listId === "popular") {
      targetUrl = baseUrl;
    } else if (listId === "template_latest_list" || listId === "latest") {
      const page = request.page ?? 1;
      targetUrl = `${baseUrl}/page/${page}`;
    } else if (listId?.startsWith("genre_")) {
      const genreSlug = listId.replace("genre_", "");
      const page = request.page ?? 1;
      targetUrl = buildManhwaBuddyGenreUrl(baseUrl, genreSlug, page);
    } else {
      // Default: root catalog
      targetUrl = baseUrl;
    }

    try {
      const html = await requestHtml(targetUrl, baseUrl, { cookie, userAgent });
      items = parseManhwaBuddyDirectory(html, baseUrl).map(item => ({
        id: item.id,
        title: item.title,
        cover: item.cover ?? "",
        subtitle: query ? `search: ${query}` : undefined,
      }));
    } catch (error) {
      lastError = error;
    }

    if (!items.length && lastError) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Failed to fetch ManhwaBuddy.com directory.");
    }

    return {
      results: items,
      isLastPage: true, // Could be improved by checking "next" button
    };
  },

  getDirectoryConfig: async function (): Promise<DirectoryConfig> {
    return {
      searchable: true,
      // Genre filters could be added here
    };
  },
};
