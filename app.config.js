import "dotenv/config";

export default ({ config }) => {
  // Always include /api at the end
  const apiBase = (process.env.EXPO_PUBLIC_API_BASE || "https://api.hubrr.com/api").replace(/\/$/, "");

  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_PUBLIC_API_BASE: apiBase,
    },
  };
};
