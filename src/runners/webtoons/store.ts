export const WebtoonsStore = {
  baseUrl: async (): Promise<string> => {
    const value = await ObjectStore.string("webtoons_baseUrl");
    const raw = (value ?? "https://www.webtoons.com/en").trim();
    try {
      const parsed = new URL(raw);
      const first = parsed.pathname.split("/").filter(Boolean)[0] || "en";
      const lang = /^[a-z]{2}(?:-[a-z]+)?$/i.test(first) ? first.toLowerCase() : "en";
      return `${parsed.protocol}//${parsed.host}/${lang}`;
    } catch {
      return "https://www.webtoons.com/en";
    }
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
