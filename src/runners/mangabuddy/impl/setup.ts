import { BooleanState, Form, RunnerSetupProvider, UITextField } from "@suwatte/daisuke";
import { MadBuddyStore } from "../store";

type SetupForm = {
  baseUrl: string;
  cookie?: string;
  userAgent?: string;
};

export const MadBuddySetupProvider: RunnerSetupProvider = {
  getSetupMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "MangaBuddy.com Configuration",
          children: [
            UITextField({
              id: "baseUrl",
              title: "Base URL",
              value: await MadBuddyStore.baseUrl(),
              placeholder: "https://mangabuddy.com",
            }),
            UITextField({
              id: "cookie",
              title: "Cookie (optional)",
              value: await MadBuddyStore.cookie(),
              placeholder: "cf_clearance=...; other_cookie=...",
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent (optional)",
              value: await MadBuddyStore.userAgent(),
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
    await MadBuddyStore.setBaseUrl(url);
    await MadBuddyStore.setCookie(String(form.cookie ?? ""));
    await MadBuddyStore.setUserAgent(String(form.userAgent ?? ""));
  },
  isRunnerSetup: async function (): Promise<BooleanState> {
    return {
      state: !!(await MadBuddyStore.baseUrl()),
    };
  },
};
