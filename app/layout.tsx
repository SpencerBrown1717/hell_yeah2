import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Hellyeah · Dashboard",
  description:
    "A working preview of the Hellyeah dashboard: Brand, Studio, Campaigns, Wallet, and Tracking.",
  icons: { icon: "/assets/icon-orange.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* The same stylesheet serves both the Worker shell and standalone fixture harness. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/styles.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/product.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/foundation.css" />
        <link
          rel="preload"
          href="/assets/general-sans.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/lastik.otf"
          as="font"
          type="font/otf"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
