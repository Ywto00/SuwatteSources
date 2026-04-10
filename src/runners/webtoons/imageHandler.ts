import { ImageRequestHandler, NetworkRequest } from "@suwatte/daisuke";
import { WebtoonsStore } from "./store";

export const WebtoonsImageHandler: ImageRequestHandler = {
  willRequestImage: async function (url: string): Promise<NetworkRequest> {
    const baseUrl = await WebtoonsStore.baseUrl();
    const cookie = await WebtoonsStore.cookie();

    const headers: Record<string, string> = {
      Accept: "image/*",
      Referer: baseUrl,
      Origin: "https://www.webtoons.com",
    };

    if (cookie) {
      headers.Cookie = cookie;
    }

    return {
      url,
      headers,
    };
  },
};
