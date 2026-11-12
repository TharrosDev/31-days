import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const description = "744 hours. One countdown. An idiot in motion goes farther than a genius at rest.";

export const metadata = {
  metadataBase: new URL("https://31-days-weld.vercel.app"),
  title: "31 Days to Tomorrow",
  description,
  openGraph: { type: "website", url: "/", title: "31 days to tomorrow", description },
  twitter: { card: "summary", title: "31 days to tomorrow", description }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050505",
  colorScheme: "dark"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
