export const MadBuddyStore = {
  baseUrl: async (): Promise<string> => {
    const value = await ObjectStore.string("mangabuddyme_baseUrl");
    return (value ?? "https://mangabuddy.me").trim();
  },
  setBaseUrl: async (url: string): Promise<void> => {
    await ObjectStore.set("mangabuddyme_baseUrl", url.trim());
  },
  cookie: async (): Promise<string> => {
    const value = await ObjectStore.string("mangabuddyme_cookie");
    return (value ?? "").trim();
  },
  setCookie: async (cookie: string): Promise<void> => {
    await ObjectStore.set("mangabuddyme_cookie", cookie.trim());
  },
  userAgent: async (): Promise<string> => {
    const value = await ObjectStore.string("mangabuddyme_userAgent");
    return (value ?? "").trim();
  },
  setUserAgent: async (userAgent: string): Promise<void> => {
    await ObjectStore.set("mangabuddyme_userAgent", userAgent.trim());
  },
};
