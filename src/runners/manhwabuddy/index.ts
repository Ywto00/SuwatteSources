import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import { ManhwaBuddyTemplate } from "./template";

const info: RunnerInfo = {
  id: "org.manhwabuddy",
  name: "ManhwaBuddy",
  version: 0.3,
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

export const Target: ContentSource = new ManhwaBuddyTemplate({
  info,
  config,
});
