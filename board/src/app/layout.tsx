import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Brand fonts (match docs/assets/_tokens.css): Inter (UI), JetBrains Mono (mono),
// Orbitron (display / wordmark).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Escrowa — TEE-secured Autonomous Escrow Agent",
  description: "Get paid the moment the work is done. A did:t3n escrow agent that secures funds in a TEE and releases them when both sides agree.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Escrowa — TEE-secured Autonomous Escrow Agent",
    description: "Get paid the moment the work is done. A did:t3n escrow agent that secures funds in a TEE and releases them when both sides agree.",
    url: "https://escrowa.edycu.dev",
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
