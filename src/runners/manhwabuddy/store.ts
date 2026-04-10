// ObjectStore is globally available, no import needed

export const ManhwaBuddyStore = {
  baseUrl: async (): Promise<string> => {
    return (await ObjectStore.string("manhwabuddy_baseUrl")) ??
      "https://manhwabuddy.com";
  },
  setBaseUrl: async (url: string): Promise<void> => {
    await ObjectStore.set("manhwabuddy_baseUrl", url);
  },
  cookie: async (): Promise<string> => {
    return (await ObjectStore.string("manhwabuddy_cookie")) ?? "";
  },
  setCookie: async (cookie: string): Promise<void> => {
    await ObjectStore.set("manhwabuddy_cookie", cookie);
  },
  userAgent: async (): Promise<string> => {
    return (await ObjectStore.string("manhwabuddy_userAgent")) ?? "";
  },
  setUserAgent: async (userAgent: string): Promise<void> => {
    await ObjectStore.set("manhwabuddy_userAgent", userAgent);
  },
};
