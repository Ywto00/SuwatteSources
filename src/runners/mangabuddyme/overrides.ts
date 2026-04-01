//import { OverrideStore } from "./store";

export const runnerOverrides = {
  getOverrides: async () => {
    return {
      selectors: {
        directoryCard: [".book-item", ".page-item-detail", ".listupd .bs .bsx", "div.bsx", ".card-item"],
        directoryTitle: [".book-title", ".tt", "h3", "a[title]"],
        directoryCover: ["img[data-src]", "img[data-lazy-src]", "img[src]"],
        directoryLink: ["a[href*='/manga/']", "a[href]"],

        contentTitle: [".post-title h1", "h1.entry-title", "h1"],
        contentCover: [".summary_image img", ".info-image img", "meta[property='og:image']"],
        contentSummary: [".summary__content", ".description-summary", ".entry-content p"],

        chapterRow: ["li.wp-manga-chapter", ".chapter-list li", ".chapter-list-item"],
        chapterLink: ["a[href*='/chapter-']", "a"],
        chapterTitle: [".chapter-title", ".title"],

        pageImage: [
          ".chapter-content img",
          ".reading-content img",
          ".container-chapter-reader img",
          ".page-break img",
          "#chapter-images img",
          ".chapter-image img"
        ],
      },
    };
  },
};
