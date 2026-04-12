import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FlowAutónomos | Marketing consciente para autónomos",
  description:
    "Plataforma gratuita para autónomos y pequeños comercios con marketing consciente y low-cost. Recupera ventas, ilusión y autoestima. Herramientas, sinergias con IA y recursos gratuitos.",
  keywords: [
    "FlowAutónomos",
    "marketing consciente",
    "autónomos",
    "herramientas gratis",
    "marketing low-cost",
    "sinergias IA",
    "negocios locales",
  ],
  openGraph: {
    title: "FlowAutónomos | Sube tu negocio sin bajar la moral",
    description:
      "Ideas gratis, reales y hechas para que el flow vuelva a tu negocio.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${oswald.variable} antialiased`}
        style={{ backgroundColor: '#020202', color: '#eaecee' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
