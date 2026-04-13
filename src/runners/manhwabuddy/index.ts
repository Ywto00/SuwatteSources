import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import { ManhwaBuddyTemplate } from "./template";

const info: RunnerInfo = {
  id: "org.manhwabuddy",
  name: "ManhwaBuddy",
  version: 1.0,
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

export const Target: ContentSource = new ManhwaBuddyTemplate({
  info,
  config,
});
