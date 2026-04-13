import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import { WebtoonsContentSource } from "./contentSource";
import { WebtoonsDirectoryHandler } from "./directoryHandler";
import { WebtoonsImageHandler } from "./imageHandler";

const info: RunnerInfo = {
  id: "org.webtoons.en",
  name: "Webtoons(EN)",
  version: 1.0,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "webtoons.png",
  website: "https://www.webtoons.com",
  supportedLanguages: ["en"],
  rating: CatalogRating.SAFE,
};

const config: SourceConfig = {
  allowsMultipleInstances: true,
  disableLibraryActions: false,
  disableTrackerLinking: false,
  disableChapterDataCaching: false,
  disableChapterDates: false,
  disableLanguageFlags: false,
  disableTagNavigation: false,
  disableUpdateChecks: false,
  disableCustomThumbnails: false,
  disableContentLinking: false,
  disableMigrationDestination: false,
  requiresAuthenticationToAccessContent: false,
};

export const Target: ContentSource = {
  info,
  config,
  ...WebtoonsContentSource,
  ...WebtoonsDirectoryHandler,
  ...WebtoonsImageHandler,
};
