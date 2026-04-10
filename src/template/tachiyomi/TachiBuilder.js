"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TachiBuilder = void 0;
class TachiBuilder {
    info;
    source;
    constructor(info, template) {
        this.source = new template();
        this.info = {
            ...info,
            supportedLanguages: [this.source.lang],
            website: this.source.baseUrl,
        };
    }
    async getContent(contentId) {
        const content = await this.source.getMangaDetails(contentId);
        return {
            ...content,
            webUrl: this.source.getMangaURL(contentId),
        };
    }
    async getChapters(contentId) {
        return this.source.getMangaChapters(contentId);
    }
    async getChapterData(contentId, chapterId) {
        return this.source.getPageList(contentId, chapterId);
    }
    async getDirectory(search) {
        if (!search.query &&
            !search.filters &&
            (search.listId === "template_popular_list" ||
                search.listId === "template_latest_list")) {
            const isPopular = search.listId === "template_popular_list";
            return isPopular
                ? this.source.getPopularManga(search.page)
                : this.source.getLatestManga(search.page);
        }
        else {
            return this.source.getSearchManga(search);
        }
    }
    async getDirectoryConfig(_) {
        const definedSortOptions = await this.source.getSortOptions();
        const getLists = () => {
            const options = [
                {
                    id: "template_popular_list",
                    title: "Popular Titles",
                },
            ];
            if (this.source.supportsLatest) {
                options.push({
                    id: "template_latest_list",
                    title: "Latest Titles",
                });
            }
            return options;
        };
        return {
            lists: getLists(),
            sort: {
                options: definedSortOptions,
            },
            filters: await this.source.getFilterList(),
        };
    }
    // * Image Request Handler
    async willRequestImage(imageURL) {
        return this.source.imageRequest(imageURL);
    }
}
exports.TachiBuilder = TachiBuilder;
