import { BooleanState, Form, RunnerSetupProvider, UITextField } from "@suwatte/daisuke";
import { ManhwaBuddyStore } from "./store";

type SetupForm = {
  baseUrl: string;
  cookie?: string;
  userAgent?: string;
};

export const ManhwaBuddySetupProvider: RunnerSetupProvider = {
  getSetupMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "ManhwaBuddy.com Configuration",
          children: [
            UITextField({
              id: "baseUrl",
              title: "Base URL",
              value: await ManhwaBuddyStore.baseUrl(),
              placeholder: "https://manhwabuddy.com",
            }),
            UITextField({
              id: "cookie",
              title: "Cookie (optional)",
              value: await ManhwaBuddyStore.cookie(),
              placeholder: "session=...; cf_clearance=...",
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent (optional)",
              value: await ManhwaBuddyStore.userAgent(),
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
    // Normalize base URL: remove trailing slashes and optional /home suffix
    const normalized = url.replace(/\/+$/, "").replace(/\/home$/i, "");
    await ManhwaBuddyStore.setBaseUrl(normalized);
    await ManhwaBuddyStore.setCookie(String(form.cookie ?? ""));
    await ManhwaBuddyStore.setUserAgent(String(form.userAgent ?? ""));
  },
  isRunnerSetup: async function (): Promise<BooleanState> {
    return {
      state: !!(await ManhwaBuddyStore.baseUrl()),
    };
  },
};
