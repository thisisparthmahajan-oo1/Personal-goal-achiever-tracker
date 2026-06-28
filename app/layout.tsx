import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { PrivacyProvider } from "@/components/privacy/PrivacyProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tracker",
  description: "Personal progress tracker",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  const isBareScreen = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <html
      lang="en"
      data-privacy="hidden"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-hidden">
        <AmbientBackground />
        <PrivacyProvider>
          {isBareScreen ? children : <AppShell>{children}</AppShell>}
        </PrivacyProvider>
      </body>
    </html>
  );
}
