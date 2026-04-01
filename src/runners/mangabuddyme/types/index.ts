export type MadBuddyDirectoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  cover?: string;
};

export type MadBuddySelectors = {
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
  pageImage: string[];
};

export type MadBuddyOverride = {
  template: string;
  searchPath: string;
  headers: Record<string, string>;
  selectors: MadBuddySelectors;
};
