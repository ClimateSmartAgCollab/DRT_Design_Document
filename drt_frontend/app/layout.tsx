import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="antialiased">
      <head>{/* metadata… */}</head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
