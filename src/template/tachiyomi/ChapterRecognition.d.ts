export declare class ChapterRecognition {
    private readonly NUMBER_PATTERN;
    private basic;
    private number;
    private preview;
    private unwanted;
    private unwantedWhiteSpace;
    parseChapterNumber(mangaTitle: string, chapterName: string, chapterNumber?: number): number;
    private getChapterNumberFromMatch;
    private checkForDecimal;
    private parseAlphaPostFix;
}
