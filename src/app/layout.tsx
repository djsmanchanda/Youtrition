// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";


// Google fonts
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Rabbid Highway Sign IV (src/fonts)
const rabbid = localFont({
  variable: "--font-rabbid",
  display: "swap",
  src: [
    { path: "../fonts/RabbidHighwaySignIv-WdAG.otf", weight: "400", style: "normal" },
    { path: "../fonts/RabbidHighwaySignIvBold-OrKe.otf", weight: "700", style: "normal" },
    { path: "../fonts/RabbidHighwaySignIvBlack-aGDm.otf", weight: "900", style: "normal" },
    { path: "../fonts/RabbidHighwaySignIvOblique-3nx3.otf", weight: "400", style: "oblique" },
    { path: "../fonts/RabbidHighwaySignIvBoldOblique-ZXzB.otf", weight: "700", style: "oblique" },
    { path: "../fonts/RabbidHighwaySignIvBlackOblique-Eg6j.otf", weight: "900", style: "oblique" },
  ],
});

export const metadata: Metadata = {
  title: "Youtrition",
  description: "Personalized nutrition for you",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${rabbid.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
