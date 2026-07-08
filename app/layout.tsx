import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USMLE Practice Block",
  description: "Interactive NBME-style USMLE practice block.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--bg-0)] text-[var(--ink-0)]">
        {children}
      </body>
    </html>
  );
}
