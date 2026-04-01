import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import { ManhwaBuddyContentSource } from "./impl/contentSource";
import { ManhwaBuddyDirectoryHandler } from "./impl/directoryHandler";
import { ManhwaBuddyPreferenceProvider } from "./impl/preference";
import { ManhwaBuddySetupProvider } from "./impl/setup";

const info: RunnerInfo = {
  id: "org.manhwabuddy",
  name: "ManhwaBuddy",
  version: 0.1,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "manhwabuddy.png",
  website: "https://manhwabuddy.com",
  supportedLanguages: ["en"],
  rating: CatalogRating.NSFW,
};

const config: SourceConfig = {
  allowsMultipleInstances: true,
  disableLibraryActions: false,
  disableTrackerLinking: false,
};

export const Target: ContentSource = {
  info,
  config,
  ...ManhwaBuddyContentSource,
  ...ManhwaBuddyDirectoryHandler,
  ...ManhwaBuddyPreferenceProvider,
  ...ManhwaBuddySetupProvider,
};
