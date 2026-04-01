import {
  DirectoryConfig,
  DirectoryHandler,
  DirectoryRequest,
  PagedResult,
} from "@suwatte/daisuke";
import { WebtoonsStore } from "../store";
import {
  parseWebtoonsDirectory,
  requestHtml,
  buildWebtoonsCatalogUrls,
  buildWebtoonsSearchUrl,
} from "../utils";

export const WebtoonsDirectoryHandler: DirectoryHandler = {
  getDirectory: async function (request: DirectoryRequest): Promise<PagedResult> {
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();
    const userAgent = await WebtoonsStore.userAgent();
    if (!baseUrl) {
      throw new Error("Set Base URL in setup/preferences.");
    }

    const query = request.query?.trim();
    let items: PagedResult["results"] = [];
    let lastError: unknown;

    if (query) {
      const url = buildWebtoonsSearchUrl(baseUrl, query);
      try {
        const html = await requestHtml(url, baseUrl, { cookie, userAgent });
        items = parseWebtoonsDirectory(html, baseUrl).map(item => ({
          id: item.id,
          title: item.title,
          cover: item.cover ?? "",
          subtitle: `search: ${query}`,
        }));
      } catch (error) {
        lastError = error;
      }
    } else {
      const catalogUrls = buildWebtoonsCatalogUrls(baseUrl);
      for (const target of catalogUrls) {
        try {
          const html = await requestHtml(target, baseUrl, { cookie, userAgent });
          items = parseWebtoonsDirectory(html, baseUrl).map(item => ({
            id: item.id,
            title: item.title,
            cover: item.cover ?? "",
            subtitle: "webtoons catalog",
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
        : new Error("Failed to fetch Webtoons.com directory.");
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
