import { ImageRequestHandler, NetworkRequest } from "@suwatte/daisuke";
import { MadBuddyStore } from "../store";

export const MadBuddyImageHandler: ImageRequestHandler = {
  willRequestImage: async function (url: string): Promise<NetworkRequest> {
    const baseUrl = await MadBuddyStore.baseUrl();
    const cookie = await MadBuddyStore.cookie();
    const userAgent = await MadBuddyStore.userAgent();

    const headers: Record<string, string> = {
      Accept: "image/*",
      Referer: baseUrl,
    };

    if (userAgent) {
      headers["User-Agent"] = userAgent;
    }

    if (cookie) {
      headers.Cookie = cookie;
    }

    return {
      url,
      headers,
    };
  },
};
