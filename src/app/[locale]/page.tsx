import { Header } from "@/components/Header";
import { Heading } from "@/components/Heading";
import { HomeContent } from "@/features/home";
import { HOME_MODE_COOKIE } from "@/features/home/constants";
import { Link } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { Suspense } from "react";

const TopPage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("HomePage");
  const cookieStore = await cookies();
  const initialMode =
    cookieStore.get(HOME_MODE_COOKIE)?.value === "battle" ? "battle" : "single";

  let dbUserName: string | null = null;
  if (user) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser) {
      dbUserName = dbUser.name;
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 pt-24 md:pt-28 pb-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10 w-full">
          <Heading
            as="h1"
            variant="gradient"
            className="text-4xl! md:text-7xl! mb-2 tracking-wider"
          >
            {t("title")}
          </Heading>
          <p className="text-xl md:text-2xl text-[#00f3ff] font-bold tracking-widest uppercase">
            {t("subtitle")}
          </p>
        </div>

        <Suspense fallback={null}>
          <HomeContent
            isLoggedIn={!!user}
            defaultUserName={dbUserName || undefined}
            initialMode={initialMode}
          />
        </Suspense>

        {/* Footer Links */}
        <footer className="w-full mt-12 mb-4 flex flex-col items-center justify-center gap-2 text-xs text-gray-500 font-cyber">
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link
              href="/terms"
              className="hover:text-[#00f3ff] transition-colors"
            >
              {t("terms")}
            </Link>
            <span>|</span>
            <Link
              href="/privacy"
              className="hover:text-[#00f3ff] transition-colors"
            >
              {t("privacy")}
            </Link>
          </div>
          <p className="text-gray-600 mt-1">
            Sound Effects by{" "}
            <a
              href="https://otologic.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#00f3ff] transition-colors underline"
            >
              OtoLogic
            </a>{" "}
            (CC BY 4.0)
          </p>
          <p className="text-gray-600">© 2026 Speed is Everything</p>
        </footer>
      </main>
    </div>
  );
};

export default TopPage;
