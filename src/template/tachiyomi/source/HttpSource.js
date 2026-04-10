"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TachiHttpSource = void 0;
const daisuke_1 = require("@suwatte/daisuke");
const CatalogSource_1 = require("./CatalogSource");
class TachiHttpSource extends CatalogSource_1.TachiCatalogSource {
    client;
    constructor() {
        super();
        this.client = new daisuke_1.NetworkClientBuilder()
            .addRequestInterceptor(async (r) => {
            return {
                ...r,
                headers: {
                    ...r.headers,
                    ...this.headers(),
                },
            };
        })
            .build();
    }
    headers() {
        return {};
    }
    // Requests
    mangaDetailsRequest(fragment) {
        return {
            url: this.baseUrl + fragment,
            headers: this.headers(),
        };
    }
    chapterListRequest(fragment) {
        return {
            url: this.baseUrl + fragment,
            headers: this.headers(),
        };
    }
    pageListRequest(fragment) {
        return {
            url: this.baseUrl + fragment,
            headers: this.headers(),
        };
    }
    // Core
    async getPopularManga(page) {
        const request = this.popularMangaRequest(page);
        const { data: response } = await this.client.request(request);
        return this.parsePopularManga(response);
    }
    async getLatestManga(page) {
        const request = this.latestUpdatesRequest(page);
        const { data: response } = await this.client.request(request);
        return this.parseLatestManga(response);
    }
    async getSearchManga(searchRequest) {
        const request = this.searchMangaRequest(searchRequest);
        const { data: response } = await this.client.request(request);
        return this.parseSearchManga(response, searchRequest);
    }
    async getMangaDetails(id) {
        const request = this.mangaDetailsRequest(id);
        const { data: response } = await this.client.request(request);
        return this.parseMangaDetails(response);
    }
    async getMangaChapters(id) {
        const request = this.chapterListRequest(id);
        const { data: response } = await this.client.request(request);
        return this.parseChapterList(response);
    }
    async getPageList(_, chapter) {
        const request = this.pageListRequest(chapter);
        const { data: response } = await this.client.request(request);
        return this.parsePageList(response);
    }
    async imageRequest(url) {
        return { url, headers: this.headers() };
    }
    async getFilterList() {
        return [];
    }
    async getSortOptions() {
        return [];
    }
    getMangaURL(fragment) {
        return this.mangaDetailsRequest(fragment).url;
    }
}
exports.TachiHttpSource = TachiHttpSource;
