import { MadBuddyOverride } from "./types";

export const PilotDefaultOverride: MadBuddyOverride = {
  template: "madtheme",
  searchPath: "/search",
  headers: {},
  selectors: {
    directoryCard: [
      ".book-item",
      "div.bsx",
      ".page-item-detail"
    ],
    directoryTitle: [
      ".book-title",
      ".tt",
      "a[title]"
    ],
    directoryCover: [
      "img[data-src]",
      "img[src]"
    ],
    directoryLink: [
      "a[href]"
    ],
    contentTitle: [
      ".post-title h1",
      "h1.entry-title",
      "h1"
    ],
    contentCover: [
      ".summary_image img",
      ".info-image img",
      ".thumb img",
      "img[src]"
    ],
    contentSummary: [
      ".summary__content",
      ".description-summary",
      ".entry-content",
      "meta[name='description']"
    ],
    chapterRow: [
      ".chapter-list li",
      "li.wp-manga-chapter"
    ],
    chapterLink: [
      "a[href]"
    ],
    chapterTitle: [
      "a",
      ".chapter-name",
      ".chapternum"
    ],
    pageImage: [
      ".chapter-content img",
      ".reading-content img",
      "img[data-src]"
    ]
  }
};
