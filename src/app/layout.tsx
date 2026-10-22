import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siesie | Car help, wherever you are",
  description: "Request car servicing, washes, and roadside assistance in Accra. A Siesie dispatcher confirms service coverage and timing.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
