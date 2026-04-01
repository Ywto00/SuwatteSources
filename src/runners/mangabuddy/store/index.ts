export const MadBuddyStore = {
  baseUrl: async (): Promise<string> => {
    const value = await ObjectStore.string("mangabuddy_baseUrl");
    return (value ?? "https://mangabuddy.com").trim();
  },
  setBaseUrl: async (url: string): Promise<void> => {
    await ObjectStore.set("mangabuddy_baseUrl", url.trim());
  },
  cookie: async (): Promise<string> => {
    const value = await ObjectStore.string("mangabuddy_cookie");
    return (value ?? "").trim();
  },
  setCookie: async (cookie: string): Promise<void> => {
    await ObjectStore.set("mangabuddy_cookie", cookie.trim());
  },
  userAgent: async (): Promise<string> => {
    const value = await ObjectStore.string("mangabuddy_userAgent");
    return (value ?? "").trim();
  },
  setUserAgent: async (userAgent: string): Promise<void> => {
    await ObjectStore.set("mangabuddy_userAgent", userAgent.trim());
  },
};
