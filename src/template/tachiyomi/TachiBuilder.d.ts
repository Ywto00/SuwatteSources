import { Chapter, ChapterData, Content, ContentSource, DirectoryConfig, DirectoryRequest, ImageRequestHandler, NetworkRequest, PagedResult, RunnerInfo } from "@suwatte/daisuke";
import { TachiHttpSource } from "./source";
export declare class TachiBuilder implements ContentSource, ImageRequestHandler {
    info: RunnerInfo;
    source: TachiHttpSource;
    constructor(info: RunnerInfo, template: new () => TachiHttpSource);
    getContent(contentId: string): Promise<Content>;
    getChapters(contentId: string): Promise<Chapter[]>;
    getChapterData(contentId: string, chapterId: string): Promise<ChapterData>;
    getDirectory(search: DirectoryRequest): Promise<PagedResult>;
    getDirectoryConfig(_: string | undefined): Promise<DirectoryConfig>;
    willRequestImage(imageURL: string): Promise<NetworkRequest>;
}
