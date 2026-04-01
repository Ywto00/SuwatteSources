import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import {
  WebtoonsContentSource,
  WebtoonsDirectoryHandler,
  WebtoonsImageHandler,
  WebtoonsPreferenceProvider,
  WebtoonsSetupProvider,
} from "./impl";

const info: RunnerInfo = {
  id: "org.webtoons",
  name: "Webtoons.com",
  version: 0.2,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "webtoons.png",
  website: "https://www.webtoons.com",
  supportedLanguages: ["en", "es", "fr", "de", "pt", "zh", "ko", "ja", "th", "id", "ru", "ar"],
  rating: CatalogRating.SAFE,
};

const config: SourceConfig = {
  allowsMultipleInstances: true,
  disableLibraryActions: false,
  disableTrackerLinking: false,
};

export const Target: ContentSource = {
  info,
  config,
  ...WebtoonsContentSource,
  ...WebtoonsDirectoryHandler,
  ...WebtoonsImageHandler,
  ...WebtoonsPreferenceProvider,
  ...WebtoonsSetupProvider,
};
