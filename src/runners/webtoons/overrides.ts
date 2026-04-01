import { WebtoonsOverride } from "./types";

export const PilotDefaultOverride: WebtoonsOverride = {
  template: "webtoons",
  searchPath: "/en/search",
  headers: {},
  selectors: {
    directoryCard: [
      "a.link._card_item",
      ".webtoon_list li a",
      ".card_item",
      ".challenge_lst li",
      ".daily_card_item",
      "._searchResultItem"
    ],
    directoryTitle: [
      "strong.title",
      ".subj",
      ".info .title",
      "a[title]"
    ],
    directoryCover: [
      "img[data-url]",
      "img[data-src]",
      "img[src]"
    ],
    directoryLink: [
      "a[href]"
    ],
    contentTitle: [
      "h1.subj",
      "h3.subj",
      ".info .title"
    ],
    contentCover: [
      ".detail_body img",
      "meta[property='og:image']"
    ],
    contentSummary: [
      "p.summary",
      ".detail .summary"
    ],
    chapterRow: [
      // Chapters from API, but these might be on page too
      "#_listUl li",
      ".episode_lst li"
    ],
    chapterLink: [
      "a[href]"
    ],
    chapterTitle: [
      ".subj",
      ".episode_cont",
      "a"
    ],
    pageImage: [
      "div#_imageList > img",
      "#_imageList img",
      ".viewer_lst img"
    ],
  },
};
