import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tironi Tech Control",
  description: "Gestão financeira, comercial, operacional e estratégica da Tironi Tech.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
