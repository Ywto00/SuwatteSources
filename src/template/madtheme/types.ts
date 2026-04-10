import { RunnerInfo, SourceConfig } from "@suwatte/daisuke";

export type MadThemeContext = {
  storeKeyPrefix: string;
  displayName: string;
  defaultBaseUrl: string;
  chapterSelectors?: string;
  pageSelectors?: string;
  directorySubtitle?: string;
  buildSearchUrl?: (baseUrl: string, query: string, page: number) => string;
  buildListUrl?: (baseUrl: string, listId: string | undefined, page: number) => string;
};

export type MadThemeRuntime = {
  baseUrl: string;
  cookie: string;
  userAgent: string;
};

export type MadThemeConfig = {
  context: MadThemeContext;
  info: RunnerInfo;
  config: SourceConfig;
};

export type DirectoryItem = {
  id: string;
  title: string;
  cover?: string;
};
