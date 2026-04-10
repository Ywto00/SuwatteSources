"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TachiDaraTemplate = void 0;
const daisuke_1 = require("@suwatte/daisuke");
const tachiyomi_1 = require("../tachiyomi");
const cheerio_1 = require("cheerio");
const lodash_1 = require("lodash");
const moment_1 = __importDefault(require("moment"));
const constants_1 = require("./constants");
class TachiDaraTemplate extends tachiyomi_1.TachiParsedHttpSource {
    supportsLatest = true;
    dateFormat = "MMMM DD, YYYY";
    headers() {
        return {
            Referer: this.baseUrl + "/",
            Origin: this.baseUrl + "/",
        };
    }
    filterNonMangaItems = true;
    mangaEntrySelector() {
        return this.filterNonMangaItems ? ".manga" : "";
    }
    fetchGenres = true;
    mangaSubString = "manga";
    useNewChapterEndpoint = false;
    oldChapterEndpointDisabled = false;
    // * Popular
    popularMangaUrlSelector = "div.post-title a";
    popularMangaSelector() {
        return `div.page-item-detail:not(:has(a[href*='bilibilicomics.com']))${this.mangaEntrySelector()}`;
    }
    popularMangaNextPageSelector = this.searchMangaNextPageSelector;
    popularMangaRequest(page) {
        return {
            url: `${this.baseUrl}/${this.mangaSubString}/${this.searchPage(page)}?m_orderby=views`,
            headers: this.headers(),
        };
    }
    popularMangaFromElement(element) {
        const child = element.find(this.popularMangaUrlSelector);
        const id = this.getUrlWithoutDomain(child.attr("href") ?? "");
        const title = this.ownText(child);
        const cover = this.imageFromElement(element.find("img").first());
        return { id, title, cover };
    }
    // * Latest
    latestUpdatesSelector = this.popularMangaSelector;
    latestUpdatesFromElement(element) {
        return this.popularMangaFromElement(element);
    }
    latestUpdatesRequest(page) {
        return {
            url: `${this.baseUrl}/${this.mangaSubString}/${this.searchPage(page)}?m_orderby=latest`,
            headers: this.headers(),
        };
    }
    latestUpdatesNextPageSelector = this.popularMangaNextPageSelector;
    parseLatestManga(html) {
        const result = super.parseLatestManga(html);
        const distinct = Object.values(result.results.reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), Object.create(null)));
        result.results = distinct;
        return result;
    }
    // * Search
    searchMangaSelector() {
        return "div.c-tabs-item__content";
    }
    searchMangaFromElement(element) {
        const child = element.find("div.post-title a").first();
        const id = this.getUrlWithoutDomain(child.attr("href") ?? "");
        const title = this.ownText(child);
        const cover = this.imageFromElement(element.find("img").first());
        return { id, title, cover };
    }
    searchMangaNextPageSelector() {
        return "div.nav-previous, nav.navigation-ajax, a.nextpostslink";
    }
    searchMangaRequest(request) {
        const url = `${this.baseUrl}/${this.searchPage(request.page)}`;
        const params = {
            s: request.query,
            post_type: "wp-manga",
        };
        return { url, params };
    }
    // * Profile
    mangaDetailsParse($) {
        let title = this.ownText($(this.mangaDetailsSelectorTitle));
        if (!title)
            title = $(this.mangaDetailsSelectorTitle).text().trim();
        const authors = $(this.mangaDetailsSelectorAuthor)
            .toArray()
            .map((v) => $(v).text().trim());
        const artists = $(this.mangaDetailsSelectorArtist)
            .toArray()
            .map((v) => $(v).text().trim());
        const summaryElem = $(this.mangaDetailsSelectorDescription);
        let summary = summaryElem.text();
        if (summaryElem.find("p").text().trim()) {
            summary = summaryElem
                .find("p")
                .toArray()
                .map((v) => $(v).text().trim())
                .join("\n\n")
                .replaceAll("<br>", "\n");
        }
        const cover = this.imageFromElement($(this.mangaDetailsSelectorThumbnail).first());
        const statusStr = $(this.mangaDetailsSelectorStatus).last().text().trim();
        let status;
        if (this.completedStatusList.includes(statusStr))
            status = daisuke_1.PublicationStatus.COMPLETED;
        else if (this.ongoingStatusList.includes(statusStr))
            status = daisuke_1.PublicationStatus.ONGOING;
        else if (this.hiatusStatusList.includes(statusStr))
            status = daisuke_1.PublicationStatus.HIATUS;
        else if (this.canceledStatusList.includes(statusStr))
            status = daisuke_1.PublicationStatus.CANCELLED;
        const genres = $(this.mangaDetailsSelectorGenre)
            .toArray()
            .map((v) => (0, lodash_1.capitalize)($(v).text().toLowerCase().trim()));
        return {
            title,
            cover,
            status,
            summary,
            info: [...authors, ...artists, ...genres],
        };
    }
    // * Chapters
    chapterListSelector() {
        return "li.wp-manga-chapter";
    }
    chapterDateSelector() {
        return "span.chapter-release-date";
    }
    chapterUrlSelector = "a";
    chapterUrlSuffix = "?style=list";
    // * Chapter Utils
    oldXhrChaptersRequest(mangaId) {
        const body = {
            action: "manga_get_chapters",
            manga: mangaId,
        };
        const headers = {
            ...this.headers(),
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded",
        };
        return {
            url: `${this.baseUrl}/wp-admin/admin-ajax.php`,
            method: "POST",
            headers,
            body,
        };
    }
    xhrChaptersRequest(mangaUrl) {
        return {
            url: `${this.baseUrl}${mangaUrl}ajax/chapters`,
            headers: {
                ...this.headers(),
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
        };
    }
    parseDate(str) {
        if (["just", "now", "up", "new"].some((v) => str.trim().toLowerCase().includes(v)))
            return new Date();
        if (str.trim().toLowerCase() === "yesterday")
            return (0, moment_1.default)().subtract(1, "day").toDate();
        const date = this.parseRelativeDate(str)?.toDate();
        if (date)
            return date;
        const formatted = (0, moment_1.default)(str, this.dateFormat, true);
        if (formatted.isValid())
            return formatted.toDate();
        const strDate = (0, moment_1.default)(str);
        if (strDate.isValid())
            return strDate.toDate();
        return new Date();
    }
    parseRelativeDate(str) {
        const numStr = str.match(/(\d+)/)?.[1];
        if (!numStr || Number.isNaN(parseInt(numStr))) {
            return null;
        }
        const number = parseInt(numStr);
        const now = (0, moment_1.default)();
        if (constants_1.DAY_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "days");
        if (constants_1.HOUR_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "hours");
        if (constants_1.MINUTE_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "minutes");
        if (constants_1.SECONDS_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "seconds");
        if (constants_1.WEEK_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "weeks");
        if (constants_1.MONTH_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "months");
        if (constants_1.YEAR_DATE_LIST.some((v) => str.toLowerCase().includes(v)))
            return now.subtract(number, "years");
        return null;
    }
    async getMangaChapters(id) {
        const request = this.chapterListRequest(id);
        const { data: html } = await this.client.request(request);
        const $ = (0, cheerio_1.load)(html);
        const title = this.ownText($(this.mangaDetailsSelectorTitle));
        const wrapper = $("div[id^=manga-chapters-holder]");
        const standardElements = $(this.chapterListSelector()).toArray();
        if (!standardElements.length && wrapper.length) {
            const mangaId = wrapper.attr("data-id");
            const xhrReq = this.useNewChapterEndpoint || this.oldChapterEndpointDisabled
                ? this.xhrChaptersRequest(id)
                : this.oldXhrChaptersRequest(mangaId ?? "");
            let response = "";
            try {
                response = (await this.client.request(xhrReq)).data;
            }
            catch (err) {
                if (err instanceof NetworkError &&
                    !this.useNewChapterEndpoint &&
                    err.res.status == 400) {
                    this.oldChapterEndpointDisabled = true;
                    response = (await this.client.request(this.xhrChaptersRequest(id)))
                        .data;
                }
                else {
                    throw err;
                }
            }
            const $$ = (0, cheerio_1.load)(response);
            const xhrElements = $$(this.chapterListSelector()).toArray();
            return xhrElements.map((v, i) => this.generateChapter(this.chapterFromElement($$(v)), i, title));
        }
        return standardElements.map((v, i) => this.generateChapter(this.chapterFromElement($(v)), i, title));
    }
    chapterFromElement(element) {
        const urlElem = element.find(this.chapterUrlSelector).first();
        const urlHref = urlElem.attr("href") ?? "";
        const url = urlHref.split("?style=paged")[0] +
            (!urlHref.endsWith(this.chapterUrlSuffix) ? this.chapterUrlSuffix : "");
        const title = urlElem.text().trim();
        const dateStr = element.find("img:not(.thumb)").first().attr("alt") ??
            element.find("span a").first().attr("title") ??
            element.find(this.chapterDateSelector()).first().text().trim();
        const date = this.parseDate(dateStr);
        return { chapterId: url.trim(), title, date };
    }
    parseChapterList(_) {
        throw new Error("method not used");
    }
    // * Page List
    pageListRequest(fragment) {
        if (fragment.startsWith("http"))
            return { url: fragment };
        else
            return super.pageListRequest(fragment);
    }
    pageListParse($) {
        const pages = $(this.pageListParseSelector)
            .toArray()
            .map((v) => this.imageFromElement($("img", v).first()));
        return pages;
    }
    //* Utils
    searchPage(page) {
        return `page/${page}/`;
    }
    imageFromElement(element) {
        return (element.attr("data-src") ??
            element.attr("data-lazy-src") ??
            element.attr("srcset")?.split(" ")?.[0] ??
            element.attr("src") ??
            "")
            .trim()
            .replace("-110x150", "")
            .replace("-175x238", "")
            .replace("-193x278", "")
            .replace("-224x320", "")
            .replace("-350x476", "");
    }
    mangaDetailsSelectorTitle = "div.post-title h3, div.post-title h1";
    mangaDetailsSelectorAuthor = "div.author-content > a";
    mangaDetailsSelectorArtist = "div.artist-content > a";
    mangaDetailsSelectorStatus = "div.summary-content";
    mangaDetailsSelectorDescription = "div.description-summary div.summary__content, div.summary_content div.post-content_item > h5 + div, div.summary_content div.manga-excerpt";
    mangaDetailsSelectorThumbnail = "div.summary_image img";
    mangaDetailsSelectorGenre = "div.genres-content a";
    mangaDetailsSelectorTag = "div.tags-content a";
    seriesTypeSelector = ".post-content_item:contains(Type) .summary-content";
    altNameSelector = ".post-content_item:contains(Alt) .summary-content";
    altName = "Alternative Names: ";
    pageListParseSelector = "div.page-break, li.blocks-gallery-item, .reading-content .text-left:not(:has(.blocks-gallery-item)) img";
    chapterProtectorSelector = "#chapter-protector-data";
    notUpdating(val) {
        !/updating|atualizando/i.test(val);
    }
    completedStatusList = [
        "Completed",
        "Completo",
        "Completado",
        "Concluído",
        "Concluido",
        "Finalizado",
        "Achevé",
        "Terminé",
        "Hoàn Thành",
        "مكتملة",
        "مكتمل",
        "已完结",
    ];
    ongoingStatusList = [
        "OnGoing",
        "Продолжается",
        "Updating",
        "Em Lançamento",
        "Em lançamento",
        "Em andamento",
        "Em Andamento",
        "En cours",
        "En Cours",
        "En cours de publication",
        "Ativo",
        "Lançando",
        "Đang Tiến Hành",
        "Devam Ediyor",
        "Devam ediyor",
        "In Corso",
        "In Arrivo",
        "مستمرة",
        "مستمر",
        "En Curso",
        "En curso",
        "Emision",
        "Curso",
        "En marcha",
        "Publicandose",
        "En emision",
        "连载中",
        "Em Lançamento",
    ];
    hiatusStatusList = ["On Hold", "Pausado", "En espera"];
    canceledStatusList = ["Canceled", "Cancelado"];
}
exports.TachiDaraTemplate = TachiDaraTemplate;
