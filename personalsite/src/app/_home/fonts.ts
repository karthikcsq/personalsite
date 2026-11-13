import { Fraunces, IBM_Plex_Mono } from "next/font/google";

// The site's two faces. Upright only.
export const display = Fraunces({ subsets: ["latin"], style: ["normal"], axes: ["opsz"], variable: "--st-display", display: "swap" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--st-mono", display: "swap" });
