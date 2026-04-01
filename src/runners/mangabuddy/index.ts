import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import {
  MadBuddyContentSource,
  MadBuddyDirectoryHandler,
  MadBuddyImageHandler,
  MadBuddyPreferenceProvider,
  MadBuddySetupProvider,
} from "./impl";

const info: RunnerInfo = {
  id: "org.mangabuddy",
  name: "MangaBuddy",
  version: 0.2,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "mangabuddy.png",
  website: "https://mangabuddy.com",
  supportedLanguages: ["en"],
  rating: CatalogRating.MIXED,
};

const config: SourceConfig = {
  allowsMultipleInstances: true,
  disableLibraryActions: false,
  disableTrackerLinking: false,
};

export const Target: ContentSource = {
  info,
  config,
  ...MadBuddyContentSource,
  ...MadBuddyDirectoryHandler,
  ...MadBuddyImageHandler,
  ...MadBuddyPreferenceProvider,
  ...MadBuddySetupProvider,
};
