import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attendance System",
    short_name: "Attendance",
    description: "Offline-capable secretary attendance for SchoolSync.",
    start_url: "/dashboard/secretary/dashboard",
    display: "standalone",
    background_color: "#F5F3FA",
    theme_color: "#1e3a5f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
