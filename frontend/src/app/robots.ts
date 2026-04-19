import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://studywithraissov.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/(auth)/",
          "/student/",
          "/teacher/",
          "/profile/edit",
          "/settings",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
