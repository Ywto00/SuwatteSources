import { CatalogRating, ContentSource, RunnerInfo, SourceConfig } from "@suwatte/daisuke";
import { MadThemeTemplate, MadThemeContext } from "../../template/madtheme";

const info: RunnerInfo = {
  id: "org.mangabuddyme",
  name: "MangaBuddyme",
  version: 0.4,
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

const context: MadThemeContext = {
  storeKeyPrefix: "mangabuddyme",
  displayName: "MangaBuddy.me",
  defaultBaseUrl: "https://mangabuddy.me",
  
};

export const Target: ContentSource = new MadThemeTemplate({
  context,
  info,
  config,
});
