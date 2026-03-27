export const KomgaStore = {
  host: () => ObjectStore.string("host"),
  credentials: () => SecureStore.string("credentials"),
  authenticated: () => ObjectStore.get("authenticated"),
  openSeriesAsTitle: async () => {
    const value = await ObjectStore.boolean("openAsTitle");
    return value ?? true;
  },
};
