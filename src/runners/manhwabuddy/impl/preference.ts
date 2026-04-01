import { Form, RunnerPreferenceProvider, UITextField } from "@suwatte/daisuke";
import { ManhwaBuddyStore } from "../store";

export const ManhwaBuddyPreferenceProvider: RunnerPreferenceProvider = {
  getPreferenceMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "ManhwaBuddy.com Settings",
          footer: "Optional: configure cookie and user-agent.",
          children: [
            UITextField({
              id: "cookie",
              title: "Cookie",
              value: await ManhwaBuddyStore.cookie(),
              placeholder: "session=...; cf_clearance=...",
              async didChange(value: string) {
                await ManhwaBuddyStore.setCookie(value);
              },
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent",
              value: await ManhwaBuddyStore.userAgent(),
              placeholder: "Mozilla/5.0 ...",
              async didChange(value: string) {
                await ManhwaBuddyStore.setUserAgent(value);
              },
            }),
          ],
        },
      ],
    };
  },
};
