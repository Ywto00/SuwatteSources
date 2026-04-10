import { Highlight, Chapter, Content, ChapterData, DirectoryRequest, PagedResult } from "@suwatte/daisuke";
import { Cheerio, CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { TachiHttpSource } from "./HttpSource";
export type CheerioElement = Cheerio<AnyNode>;
export type CheerioDocument = CheerioAPI;
export declare abstract class TachiParsedHttpSource extends TachiHttpSource {
    abstract popularMangaSelector(): string;
    abstract latestUpdatesSelector(): string;
    abstract searchMangaSelector(): string;
    abstract chapterListSelector(): string;
    popularMangaNextPageSelector?(): string;
    searchMangaNextPageSelector?(): string;
    latestUpdatesNextPageSelector?(): string;
    abstract popularMangaFromElement(element: CheerioElement): Highlight;
    abstract searchMangaFromElement(element: CheerioElement): Highlight;
    abstract latestUpdatesFromElement(element: CheerioElement): Highlight;
    abstract chapterFromElement(element: CheerioElement): Omit<Chapter, "index" | "number" | "volume" | "language">;
    abstract mangaDetailsParse(document: CheerioDocument): Content;
    abstract pageListParse(document: CheerioDocument): string[];
    parsePopularManga(html: string): PagedResult;
    parseSearchManga(html: string, _: DirectoryRequest): PagedResult;
    parseLatestManga(html: string): PagedResult;
    parseMangaDetails(html: string): Content;
    parseChapterList(html: string): Chapter[];
    generateChapter(data: any, index: number, title: string): Chapter;
    parsePageList(html: string): ChapterData;
    protected ownText(element: CheerioElement): string;
}
