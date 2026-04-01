import { BooleanState, Form, RunnerSetupProvider, UITextField } from "@suwatte/daisuke";
import { WebtoonsStore } from "../store";

type SetupForm = {
  baseUrl: string;
  cookie?: string;
  userAgent?: string;
};

export const WebtoonsSetupProvider: RunnerSetupProvider = {
  getSetupMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "Webtoons.com Configuration",
          children: [
            UITextField({
              id: "baseUrl",
              title: "Base URL",
              value: await WebtoonsStore.baseUrl(),
              placeholder: "https://www.webtoons.com",
            }),
            UITextField({
              id: "cookie",
              title: "Cookie (optional)",
              value: await WebtoonsStore.cookie(),
              placeholder: "NEO_SES=...; ageGatePass=true; locale=en",
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent (optional)",
              value: await WebtoonsStore.userAgent(),
              placeholder: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...",
            }),
          ],
        },
      ],
    };
  },
  validateSetupForm: async function (form: SetupForm): Promise<void> {
    const url = form.baseUrl.trim();
    if (!url) {
      throw new Error("Base URL is required");
    }
    await WebtoonsStore.setBaseUrl(url);
    await WebtoonsStore.setCookie(String(form.cookie ?? ""));
    await WebtoonsStore.setUserAgent(String(form.userAgent ?? ""));
  },
  isRunnerSetup: async function (): Promise<BooleanState> {
    return {
      state: !!(await WebtoonsStore.baseUrl()),
    };
  },
};
