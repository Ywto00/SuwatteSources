import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import {
  MadBuddyContentSource,
  MadBuddyDirectoryHandler,
  MadBuddyImageHandler,
  MadBuddyPreferenceProvider,
  MadBuddySetupProvider,
} from "./impl";

const info: RunnerInfo = {
  id: "org.mangabuddyme",
  name: "MangaBuddyme",
  version: 0.1,
  minSupportedAppVersion: "6.0.0",
  thumbnail: "mangabuddyme.png",
  website: "https://mangabuddy.me",
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
