import "@/app/globals.css";
import { Host_Grotesk, Source_Serif_4 } from "next/font/google";
import { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import ConditionalChrome from "@/app/components/ConditionalChrome";

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-host-grotesk",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Karthik Thyagarajan",
    default: "Karthik Thyagarajan",
  },
  description:
    "Karthik Thyagarajan — builder, researcher, engineer. Ask the site anything about his work, writing, and photography.",
  keywords: [
    "Karthik Thyagarajan",
    "Machine Learning",
    "Robotics",
    "Portfolio",
    "Purdue",
    "Engineer",
  ],
  authors: [{ name: "Karthik Thyagarajan" }],
  creator: "Karthik Thyagarajan",
  metadataBase: new URL("https://karthikthyagarajan.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.karthikthyagarajan.com",
    title: "Karthik Thyagarajan",
    description:
      "Karthik Thyagarajan — builder, researcher, engineer. Ask the site anything.",
    siteName: "Karthik Thyagarajan",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${sourceSerif.variable} h-full`}
    >
      <body className="h-full m-0 p-0 bg-surface text-ink antialiased">
        <ConditionalChrome>{children}</ConditionalChrome>
        <Analytics />
      </body>
    </html>
  );
}
