import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/theme-provider";
import { Shell } from "@/components/layout/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recruiter AI — Enterprise",
  description: "Enterprise AI-powered recruitment platform with candidate ranking, analytics, and intelligent matching.",
  keywords: ["AI recruiting", "candidate ranking", "talent analytics", "hiring platform"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  );
}
