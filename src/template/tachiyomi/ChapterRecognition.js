"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChapterRecognition = void 0;
class ChapterRecognition {
    NUMBER_PATTERN = "([0-9]+)(\\.[0-9]+)?(\\.?[a-z]+)?";
    basic = new RegExp(`(ch\\.) *${this.NUMBER_PATTERN}`, "i");
    number = new RegExp(this.NUMBER_PATTERN);
    preview = /preview/i;
    unwanted = /\b(?:v|ver|vol|version|volume|season|s)[^a-z]?[0-9]+/;
    unwantedWhiteSpace = /\s(?=extra|special|omake)/;
    parseChapterNumber(mangaTitle, chapterName, chapterNumber) {
        if (chapterNumber !== undefined &&
            (chapterNumber === -2.0 || chapterNumber > -1.0)) {
            return chapterNumber;
        }
        let name = chapterName.toLowerCase();
        name = name.replace(mangaTitle.toLowerCase(), "").trim();
        name = name.replace(",", ".").replace("-", ".");
        name = name.replace(this.unwantedWhiteSpace, "");
        name = name.replace(this.unwanted, "");
        const basicMatch = name.match(this.basic);
        if (basicMatch && basicMatch[1].toLowerCase() === "ch.") {
            // Ensure the prefix is 'ch.'
            return this.getChapterNumberFromMatch(basicMatch, true);
        }
        const numberMatch = name.match(this.number);
        if (numberMatch) {
            return this.getChapterNumberFromMatch(numberMatch);
        }
        const previewMatch = name.match(this.preview);
        if (previewMatch) {
            return 0;
        }
        return chapterNumber !== undefined
            ? chapterNumber
            : Math.round(Math.random() * 100) / 100;
    }
    getChapterNumberFromMatch(match, isBasicMatch) {
        const offset = isBasicMatch ? 1 : 0;
        const initial = parseFloat(match[1 + offset]);
        const subChapterDecimal = match[2 + offset];
        const subChapterAlpha = match[3 + offset];
        const addition = this.checkForDecimal(subChapterDecimal, subChapterAlpha);
        return initial + addition;
    }
    checkForDecimal(decimal, alpha) {
        if (decimal) {
            return parseFloat(decimal);
        }
        if (alpha) {
            if (alpha.includes("extra")) {
                return 0.99;
            }
            if (alpha.includes("omake")) {
                return 0.98;
            }
            if (alpha.includes("special")) {
                return 0.97;
            }
            const trimmedAlpha = alpha.startsWith(".")
                ? alpha.slice(1)
                : alpha;
            if (trimmedAlpha.length === 1) {
                return this.parseAlphaPostFix(trimmedAlpha);
            }
        }
        return 0.0;
    }
    parseAlphaPostFix(alpha) {
        const number = alpha.charCodeAt(0) - ("a".charCodeAt(0) - 1);
        if (number >= 10)
            return 0.0;
        return number / 10.0;
    }
}
exports.ChapterRecognition = ChapterRecognition;
