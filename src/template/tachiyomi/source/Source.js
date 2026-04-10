"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TachiSource = void 0;
const ChapterRecognition_1 = require("../ChapterRecognition");
class TachiSource {
    recognizer = new ChapterRecognition_1.ChapterRecognition();
    getUrlWithoutDomain(orig) {
        try {
            const encodedOrig = orig.replace(" ", "%20");
            const uriPattern = /^https?:\/\/[^/]+(\/[^?]*)?(\?[^#]*)?(#.*)?/;
            const matches = encodedOrig.match(uriPattern);
            if (matches) {
                let out = matches[1] || "";
                if (matches[2]) {
                    out += matches[2];
                }
                if (matches[3]) {
                    out += matches[3];
                }
                return out;
            }
            else {
                throw new Error("Invalid URL");
            }
        }
        catch (e) {
            return orig;
        }
    }
}
exports.TachiSource = TachiSource;
