export const WebtoonsStore = {
  baseUrl: async (): Promise<string> => {
    const value = await ObjectStore.string("webtoons_baseUrl");
    return (value ?? "https://www.webtoons.com").trim();
  },
  setBaseUrl: async (url: string): Promise<void> => {
    await ObjectStore.set("webtoons_baseUrl", url.trim());
  },
  cookie: async (): Promise<string> => {
    const value = await ObjectStore.string("webtoons_cookie");
    return (value ?? "").trim();
  },
  setCookie: async (cookie: string): Promise<void> => {
    await ObjectStore.set("webtoons_cookie", cookie.trim());
  },
  userAgent: async (): Promise<string> => {
    const value = await ObjectStore.string("webtoons_userAgent");
    return (value ?? "").trim();
  },
  setUserAgent: async (userAgent: string): Promise<void> => {
    await ObjectStore.set("webtoons_userAgent", userAgent.trim());
  },
};
