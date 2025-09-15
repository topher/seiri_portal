import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query-provider";
import { NuqsProvider } from "@/components/nuqs-provider";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seiri Studio",
  description: "Professional initiative management and collaboration platform",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={cn(inter.className, "antialiased min-h-screen")}
        >
          <QueryProvider>
            <NuqsProvider>
              <Toaster />
              {children}
            </NuqsProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
