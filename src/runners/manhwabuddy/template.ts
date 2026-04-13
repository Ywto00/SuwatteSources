import {
  BooleanState,
  Chapter,
  ChapterData,
  Content,
  ContentSource,
  DirectoryConfig,
  DirectoryRequest,
  Form,
  PagedResult,
  RunnerInfo,
  SourceConfig,
} from "@suwatte/daisuke";
import { ManhwaBuddyContentSource } from "./contentSource";
import { ManhwaBuddyDirectoryHandler } from "./directoryHandler";
import { ManhwaBuddyPreferenceProvider } from "./preference";
import { ManhwaBuddySetupProvider } from "./setup";

type SetupForm = {
  baseUrl: string;
  cookie?: string;
  userAgent?: string;
};

export type ManhwaBuddyTemplateConfig = {
  info: RunnerInfo;
  config: SourceConfig;
};

export class ManhwaBuddyTemplate implements ContentSource {
  info;
  config;

  constructor(conf: ManhwaBuddyTemplateConfig) {
    this.info = conf.info;
    this.config = conf.config;
  }

  async getContent(contentId: string): Promise<Content> {
    // Delegate to content source parser
    return ManhwaBuddyContentSource.getContent(contentId);
  }

  async getChapters(contentId: string): Promise<Chapter[]> {
    return ManhwaBuddyContentSource.getChapters(contentId);
  }

  async getChapterData(contentId: string, chapterId: string): Promise<ChapterData> {
    return ManhwaBuddyContentSource.getChapterData(contentId, chapterId);
  }

  async getDirectory(request: DirectoryRequest): Promise<PagedResult> {
    // Delegate to directory handler which builds search/catalog URLs
    return ManhwaBuddyDirectoryHandler.getDirectory(request);
  }

  async getDirectoryConfig(): Promise<DirectoryConfig> {
    return ManhwaBuddyDirectoryHandler.getDirectoryConfig();
  }

  async getPreferenceMenu(): Promise<Form> {
    return ManhwaBuddyPreferenceProvider.getPreferenceMenu();
  }

  async getSetupMenu(): Promise<Form> {
    return ManhwaBuddySetupProvider.getSetupMenu();
  }

  async validateSetupForm(form: SetupForm): Promise<void> {
    return ManhwaBuddySetupProvider.validateSetupForm(form);
  }

  async isRunnerSetup(): Promise<BooleanState> {
    return ManhwaBuddySetupProvider.isRunnerSetup();
  }
}
