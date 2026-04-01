import {
  DirectoryConfig,
  DirectoryHandler,
  DirectoryRequest,
  PagedResult,
} from "@suwatte/daisuke";
import { MadBuddyStore } from "../store";
import {
  buildSearchUrls,
  parseMangaBuddyDirectory,
  requestHtml,
} from "../utils";

export const MadBuddyDirectoryHandler: DirectoryHandler = {
  getDirectory: async function (request: DirectoryRequest): Promise<PagedResult> {
    const baseUrl = await MadBuddyStore.baseUrl();
    const cookie = await MadBuddyStore.cookie();
    const userAgent = await MadBuddyStore.userAgent();
    if (!baseUrl) {
      throw new Error("Set Base URL in setup/preferences.");
    }

    const query = request.query?.trim();
    let items: PagedResult["results"] = [];
    let lastError: unknown;

    if (query) {
      const searchUrls = buildSearchUrls(baseUrl, query);
      for (const target of searchUrls) {
        try {
          const html = await requestHtml(target, baseUrl, { cookie, userAgent });
          items = parseMangaBuddyDirectory(html, baseUrl).map(item => ({
            id: item.id,
            title: item.title,
            cover: item.cover ?? "",
            subtitle: `search: ${query}`,
          }));
          if (items.length) break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
    } else {
      const catalogUrls = [
        baseUrl,
        `${baseUrl}/popular`,
        `${baseUrl}/latest`,
      ];
      for (const target of catalogUrls) {
        try {
          const html = await requestHtml(target, baseUrl, { cookie, userAgent });
          items = parseMangaBuddyDirectory(html, baseUrl).map(item => ({
            id: item.id,
            title: item.title,
            cover: item.cover ?? "",
            subtitle: "mangabuddy directory",
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
        : new Error("Failed to fetch MangaBuddy.me directory.");
    }

    return {
      results: items,
      isLastPage: true,
    };
  },
  getDirectoryConfig: async function (): Promise<DirectoryConfig> {
    return {
      searchable: true,
    };
  },
};
