import { Chapter, Content } from "@suwatte/daisuke";
import { ChapterRecognition } from "../ChapterRecognition";
export declare abstract class TachiSource {
    abstract readonly name: string;
    readonly recognizer: ChapterRecognition;
    abstract getMangaDetails(id: string): Promise<Content>;
    abstract getMangaChapters(id: string): Promise<Chapter[]>;
    getUrlWithoutDomain(orig: string): string;
}
