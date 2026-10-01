import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Siesie | Car help, wherever you are",
  description: "Trusted mechanics, sent to you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
