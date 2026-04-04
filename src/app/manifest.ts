import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Attendance System",
    short_name: "Attendance",
    description: "Offline-capable secretary attendance for EduAttend Pro.",
    start_url: "/dashboard/secretary/dashboard",
    display: "standalone",
    background_color: "#F5F3FA",
    theme_color: "#1e3a5f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/attendance icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
