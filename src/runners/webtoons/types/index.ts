export type WebtoonsDirectoryItem = {
  id: string;
  title: string;
  cover?: string;
  genre?: string;
  rating?: string;
  episodeCount?: number;
};

export type EpisodeListResponse = {
  result: {
    episodeList: Array<{
      episodeTitle: string;
      episodeId: number;
      viewerLink: string;
      exposureDateMillis: number;
    }>;
  };
};

export type WebtoonsSelectors = {
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

export type WebtoonsOverride = {
  template: string;
  searchPath: string;
  headers: Record<string, string>;
  selectors: WebtoonsSelectors;
};
