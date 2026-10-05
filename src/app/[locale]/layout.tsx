import "@/app/globals.css";
import { HeaderAuthProvider } from "@/components/Header/AuthContext";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> => {
  const { locale } = await params;

  const title =
    locale === "en"
      ? "SIE | Reaction Time Test & Battle"
      : "SIE | 反射神経テスト・測定バトル";

  const description =
    locale === "en"
      ? "An online reaction time test and reflex measurement game challenging the 3000ms limit. Battle and compete with players worldwide to achieve the highest score."
      : "持ち時間3000msの限界に挑むオンライン反射神経テスト＆計測ゲーム。世界中のプレイヤーと対戦・対決バトルで最高クリア回数を叩き出せ。";

  const keywords =
    locale === "en"
      ? [
          "Reaction Time Test",
          "Reflex Test",
          "Measurement",
          "Multiplayer",
          "Battle",
          "Match",
          "Game",
          "Online Browser Game",
        ]
      : [
          "反射神経",
          "測定",
          "計測",
          "テスト",
          "対戦",
          "対決",
          "バトル",
          "ゲーム",
          "無料",
          "ブラウザ",
        ];

  const host =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  return {
    metadataBase: new URL(host),
    title: {
      template: "%s | SIE",
      default: title,
    },
    description,
    keywords,
    verification: {
      google: "BSsGBvhIoBkRqw9xooK0YyFrtEDS_8JO-nvEbxMDmqI",
    },
    openGraph: {
      title,
      description,
      url: "/",
      siteName: "SIE",
      locale: locale === "ja" ? "ja_JP" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const RootLayout = async ({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) => {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialUser = user
    ? {
        id: user.id,
        avatarUrl:
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null,
      }
    : null;

  return (
    <html lang={locale}>
      <body className="bg-neutral-900 text-white antialiased">
        <NextIntlClientProvider messages={messages}>
          <HeaderAuthProvider initialUser={initialUser}>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "SIE",
                  url: "https://speed-is-everything.vercel.app/",
                }),
              }}
            />
            {children}
          </HeaderAuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
