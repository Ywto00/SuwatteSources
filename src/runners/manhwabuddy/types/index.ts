export type ManhwaBuddyDirectoryItem = {
  id: string;
  title: string;
  cover?: string;
  subtitle?: string;
};

export type ManhwaBuddySelectors = {
  directoryCard: string[];
  directoryTitle: string[];
  directoryCover: string[];
  directoryLink: string[];
  contentTitle: string[];
  contentCover: string[];
  contentSummary: string[];
  chapterRow: string[];
  chapterLink: string[];
  chapterTitle: string[];
  chapterDate: string[];
  pageImage: string[];
};

export type ManhwaBuddyOverride = {
  template: string;
  selectors: ManhwaBuddySelectors;
};
