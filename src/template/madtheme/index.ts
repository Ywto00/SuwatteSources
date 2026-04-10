import {
  BooleanState,
  Content,
  ContentSource,
  DirectoryConfig,
  DirectoryRequest,
  Form,
  ImageRequestHandler,
  NetworkRequest,
  PagedResult,
  RunnerPreferenceProvider,
  RunnerSetupProvider,
} from "@suwatte/daisuke";
import { MadThemeController } from "./controller";
import { MadThemeConfig } from "./types";

type SetupForm = {
  baseUrl: string;
  cookie?: string;
  userAgent?: string;
};

export class MadThemeTemplate
  implements
    ContentSource,
    ImageRequestHandler,
    RunnerPreferenceProvider,
    RunnerSetupProvider
{
  info;
  config;
  private readonly controller: MadThemeController;

  constructor(conf: MadThemeConfig) {
    this.info = conf.info;
    this.config = conf.config;
    this.controller = new MadThemeController(conf.context);
  }

  async getContent(contentId: string): Promise<Content> {
    return this.controller.getContent(contentId);
  }

  async getChapters(contentId: string) {
    return this.controller.getChapters(contentId);
  }

  async getChapterData(contentId: string, chapterId: string) {
    return this.controller.getChapterData(contentId, chapterId);
  }

  async getDirectory(request: DirectoryRequest): Promise<PagedResult> {
    return this.controller.getDirectory(request);
  }

  async getDirectoryConfig(_configID?: string): Promise<DirectoryConfig> {
    return this.controller.getDirectoryConfig();
  }

  async willRequestImage(url: string): Promise<NetworkRequest> {
    return this.controller.willRequestImage(url);
  }

  async getPreferenceMenu(): Promise<Form> {
    return this.controller.preferenceMenu();
  }

  async getSetupMenu(): Promise<Form> {
    return this.controller.setupMenu();
  }

  async validateSetupForm(form: SetupForm): Promise<void> {
    return this.controller.setSetup(form);
  }

  async isRunnerSetup(): Promise<BooleanState> {
    return this.controller.isSetup();
  }
}

export * from "./types";
