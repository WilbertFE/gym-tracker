import type { Metadata, Viewport } from "next";
import { Chakra_Petch, IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["muscles leveling", "gym tracker", "workout rpg", "workout log", "muscle heatmap"],
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark h-full antialiased ${plexSans.variable} ${jetbrainsMono.variable} ${chakra.variable}`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
