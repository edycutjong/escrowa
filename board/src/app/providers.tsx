"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Real RainbowKit + WalletConnect config. Set NEXT_PUBLIC_WC_PROJECT_ID to a
// projectId from https://cloud.reown.com (free) to enable the WalletConnect relay;
// injected wallets (MetaMask, etc.) work regardless.
const config = getDefaultConfig({
  appName: "Escrowa",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "ESCROWA_DEV_WC_PROJECT_ID",
  chains: [mainnet, sepolia],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#10b981", borderRadius: "medium" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
