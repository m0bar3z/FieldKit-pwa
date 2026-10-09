import type { MetadataRoute } from "next";

export default function manifes(): MetadataRoute.Manifest {
  return {
    name: "FieldKit Planner",
    short_name: "FieldKit",
    description:
      "Keep your projects, tasks, and field notes organized in one simple workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
