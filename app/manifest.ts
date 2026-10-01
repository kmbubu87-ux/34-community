import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "34사랑",
    short_name: "34사랑",
    description: "34공동체 기도운동, 심방신청, 기도요청, 공지",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/56-heart-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/56-heart-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/56-heart-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
