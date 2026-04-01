import { Form, RunnerPreferenceProvider, UITextField } from "@suwatte/daisuke";
import { WebtoonsStore } from "../store";

export const WebtoonsPreferenceProvider: RunnerPreferenceProvider = {
  getPreferenceMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "Webtoons.com Settings",
          footer: "Optional: configure cookie and user-agent.",
          children: [
            UITextField({
              id: "cookie",
              title: "Cookie",
              value: await WebtoonsStore.cookie(),
              placeholder: "NEO_SES=...; ageGatePass=true",
              async didChange(value: string) {
                await WebtoonsStore.setCookie(value);
              },
            }),
            UITextField({
              id: "userAgent",
              title: "User-Agent",
              value: await WebtoonsStore.userAgent(),
              placeholder: "Mozilla/5.0 ...",
              async didChange(value: string) {
                await WebtoonsStore.setUserAgent(value);
              },
            }),
          ],
        },
      ],
    };
  },
};
