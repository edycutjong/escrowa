import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Escrowa — TEE-secured Autonomous Escrow Agent",
  description: "Get paid the moment the work is done. A did:t3n escrow agent that secures funds in a TEE and releases them when both sides agree.",
  icons: {
    icon: "/icon.png",
  },
  openGraph: {
    title: "Escrowa — TEE-secured Autonomous Escrow Agent",
    description: "Get paid the moment the work is done. A did:t3n escrow agent that secures funds in a TEE and releases them when both sides agree.",
    url: "https://escrowa.vercel.app",
    siteName: "Escrowa",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Escrowa Banner",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Escrowa — TEE-secured Autonomous Escrow Agent",
    description: "Get paid the moment the work is done. A did:t3n escrow agent that secures funds in a TEE and releases them when both sides agree.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
