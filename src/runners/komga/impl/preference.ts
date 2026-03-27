import { Form, RunnerPreferenceProvider, UIToggle } from "@suwatte/daisuke";
import { KomgaStore } from "../store";

export const KomgaPreferenceProvider: RunnerPreferenceProvider = {
  getPreferenceMenu: async function (): Promise<Form> {
    return {
      sections: [
        {
          header: "Core",
          footer:
            "Recommended ON: each Komga series opens as one title and books are treated as chapters.",
          children: [
            UIToggle({
              id: "openAsTitle",
              title: "Treat Books as Chapters",
              value: await KomgaStore.openSeriesAsTitle(),
              async didChange(value) {
                await ObjectStore.set("openAsTitle", value);
              },
            }),
          ],
        },
      ],
    };
  },
};
