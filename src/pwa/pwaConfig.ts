export const PWA_THEME_COLOR = "#0A0B0D";
export const PWA_BACKGROUND_COLOR = "#0A0B0D";
export const PWA_APP_NAME = "企业员工考勤系统";
export const PWA_SHORT_NAME = "HR考勤";
export const PWA_DESCRIPTION = "面向企业员工的考勤、请假、加班、审批与工资管理系统";
export const PWA_ASSET_VERSION = "20260630";

function withAssetVersion(path: string) {
  return `${path}?v=${PWA_ASSET_VERSION}`;
}

export const PWA_ICON_ENTRIES = [
  { src: withAssetVersion("pwa-192x192-v2.png"), sizes: "192x192", type: "image/png" },
  { src: withAssetVersion("pwa-512x512-v2.png"), sizes: "512x512", type: "image/png" },
  {
    src: withAssetVersion("maskable-512x512-v2.png"),
    sizes: "512x512",
    type: "image/png",
    purpose: "maskable",
  },
] as const;

export function createWebManifest() {
  return {
    name: PWA_APP_NAME,
    short_name: PWA_SHORT_NAME,
    description: PWA_DESCRIPTION,
    lang: "th",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: PWA_THEME_COLOR,
    background_color: PWA_BACKGROUND_COLOR,
    icons: [...PWA_ICON_ENTRIES],
  };
}
