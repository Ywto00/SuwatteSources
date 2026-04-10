"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TachiParsedHttpSource = void 0;
const cheerio_1 = require("cheerio");
const HttpSource_1 = require("./HttpSource");
class TachiParsedHttpSource extends HttpSource_1.TachiHttpSource {
    // Core Parsers
    parsePopularManga(html) {
        const $ = (0, cheerio_1.load)(html);
        const results = $(this.popularMangaSelector())
            .toArray()
            .map((element) => this.popularMangaFromElement($(element)));
        let isLastPage = true;
        const selector = this.popularMangaNextPageSelector?.();
        if (selector) {
            isLastPage = $(selector).length === 0;
        }
        return {
            results,
            isLastPage,
        };
    }
    parseSearchManga(html, _) {
        const $ = (0, cheerio_1.load)(html);
        const results = $(this.searchMangaSelector())
            .toArray()
            .map((element) => this.searchMangaFromElement($(element)));
        let isLastPage = true;
        const selector = this.searchMangaNextPageSelector?.();
        if (selector) {
            isLastPage = $(selector).length === 0;
        }
        return {
            results,
            isLastPage,
        };
    }
    parseLatestManga(html) {
        const $ = (0, cheerio_1.load)(html);
        const results = $(this.latestUpdatesSelector())
            .toArray()
            .map((element) => this.latestUpdatesFromElement($(element)));
        let isLastPage = true;
        const selector = this.latestUpdatesNextPageSelector?.();
        if (selector) {
            isLastPage = $(selector).length === 0;
        }
        return {
            results,
            isLastPage,
        };
    }
    parseMangaDetails(html) {
        return this.mangaDetailsParse((0, cheerio_1.load)(html));
    }
    parseChapterList(html) {
        const $ = (0, cheerio_1.load)(html);
        const title = this.mangaDetailsParse($).title;
        return $(this.chapterListSelector())
            .toArray()
            .map((element, idx) => {
            const data = this.chapterFromElement($(element));
            return this.generateChapter(data, idx, title);
        });
    }
    generateChapter(data, index, title) {
        return {
            ...data,
            index,
            number: !!data.number && data.number !== -1
                ? data.number
                : this.recognizer.parseChapterNumber(title, data.title ?? ""),
            language: this.lang,
        };
    }
    parsePageList(html) {
        const pages = this.pageListParse((0, cheerio_1.load)(html)).map((url) => ({ url }));
        return { pages };
    }
    ownText(element) {
        return element.contents().not(element.children()).text().trim();
    }
}
exports.TachiParsedHttpSource = TachiParsedHttpSource;
