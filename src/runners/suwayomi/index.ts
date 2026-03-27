import {
  CatalogRating,
  ContentSource,
  RunnerInfo,
  SourceConfig,
} from "@suwatte/daisuke";
import {
  SuwayomiAuthentication,
  SuwayomiChapterEvent,
  SuwayomiContentSource,
  SuwayomiDirectoryHandler,
  SuwayomiImageHandler,
  SuwayomiPageProvider,
  SuwayomiPreferenceProvider,
  SuwayomiProgressProvider,
  SuwayomiSetupProvider,
} from "./impl";

// Define
type Suwayomi = ContentSource;

// Info
const info: RunnerInfo = {
  id: "org.suwayomi",
  name: "Suwayomi",
  version: 2.0,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "suwayomi.png",
  website: "https://github.com/Suwayomi",
  supportedLanguages: ["UNIVERSAL"],
  rating: CatalogRating.SAFE,
};

// Config
const config: SourceConfig = {
  disableChapterDataCaching: true, // Refetch image list each time
  // disableLibraryActions: false,
  // disableContentLinking: false,
  // disableMigrationDestination: false,
  // disableUpdateChecks: false,
  disableCustomThumbnails: true,
  disableLanguageFlags: true,
  disableTrackerLinking: false,
  allowsMultipleInstances: true,
  requiresAuthenticationToAccessContent: false, // Authentication is optional and configurable
};

export const Target: Suwayomi = {
  info,
  config,
  ...SuwayomiAuthentication,
  ...SuwayomiContentSource,
  ...SuwayomiDirectoryHandler,
  ...SuwayomiPageProvider,
  ...SuwayomiPreferenceProvider,
  ...SuwayomiImageHandler,
  ...SuwayomiChapterEvent,
  ...SuwayomiSetupProvider,
  ...SuwayomiProgressProvider,
};
