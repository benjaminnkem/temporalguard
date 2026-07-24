import type { Metadata, Viewport } from "next";
import "@fontsource/kalam/400.css";
import "@fontsource/kalam/700.css";
import "@fontsource/patrick-hand/400.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "TemporalGuard",
    template: "%s · TemporalGuard",
  },
  description:
    "Business workflow observability for time-bound promises and violations.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
