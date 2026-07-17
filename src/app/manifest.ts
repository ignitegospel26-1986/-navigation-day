import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "導航日 Navigation Day",
    short_name: "導航日",
    description:
      "一個給自己的長期覺察空間。所有紀錄只存在你自己的 Google 帳號裡。",
    id: "/",
    start_url: "/dashboard",
    // Whole-site scope so the Android TWA keeps landing / privacy / dashboard
    // in-app instead of opening them in an external browser.
    scope: "/",
    display: "standalone",
    background_color: "#f4efe4",
    theme_color: "#f4efe4",
    lang: "zh-Hant",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
