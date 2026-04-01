import { Form, RunnerPreferenceProvider, UITextField } from "@suwatte/daisuke";
import { MadBuddyStore } from "../store";

export const MadBuddyPreferenceProvider: RunnerPreferenceProvider = {
  getPreferenceMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "MangaBuddy.com Settings",
          footer: "Optional: configure cookie and user-agent for accessing the site.",
          children: [
            UITextField({
              id: "cookie",
              title: "Cookie",
              value: await MadBuddyStore.cookie(),
              placeholder: "cf_clearance=...; session=...",
              async didChange(value: string) {
                await MadBuddyStore.setCookie(value);
              },
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent",
              value: await MadBuddyStore.userAgent(),
              placeholder: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
              async didChange(value: string) {
                await MadBuddyStore.setUserAgent(value);
              },
            }),
          ],
        },
      ],
    };
  },
};
