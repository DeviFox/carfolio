import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { YandexMetrika } from "@/components/yandex-metrika";
import { GoogleTag } from "@/components/google-tag";
import GarageSync from "@/components/garage-sync";
import "./globals.css";

const TITLE = "carvisio — учёт обслуживания автомобиля, запчастей и расходников";
const DESCRIPTION =
  "Ведите историю обслуживания автомобиля, учитывайте пробег, контролируйте ресурс деталей и получайте напоминания о замене расходников.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "carvisio",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        <GarageSync />
        <YandexMetrika />
        <GoogleTag />
      </body>
    </html>
  );
}
