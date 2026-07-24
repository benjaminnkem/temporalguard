import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, inter.className, "font-sans antialiased")}
    >
      <body className={cn(inter.className, "font-sans antialiased")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
