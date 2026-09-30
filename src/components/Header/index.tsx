"use client";

import { Button } from "@/components/Button";
import { Dropdown, DropdownItem } from "@/components/Dropdown";
import { Avatar } from "@/features/user";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";

export const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      },
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  const toggleLanguage = () => {
    const nextLocale = locale === "ja" ? "en" : "ja";
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <header className="absolute top-0 left-0 w-full p-2 md:p-4 flex justify-between items-center z-50 pointer-events-auto border-b border-[#00f3ff]/20 bg-black/40 backdrop-blur-md">
      <Link
        href="/"
        className="font-cyber flex flex-col items-center justify-center group flex-shrink-0"
      >
        <span className="font-bold text-lg md:text-xl text-white tracking-widest group-hover:text-[#00f3ff] transition-colors leading-tight">
          S.I.E
        </span>
        <span className="text-[8px] md:text-[10px] text-gray-300 tracking-widest uppercase leading-tight mt-0.5 whitespace-nowrap">
          <span className="text-[#00f3ff]">S</span>peed{" "}
          <span className="text-[#00f3ff]">I</span>s{" "}
          <span className="text-[#00f3ff]">E</span>verything
        </span>
      </Link>
      <div className="flex gap-2 md:gap-4 items-center">
        <Button
          variant="ghost"
          size="none"
          onClick={toggleLanguage}
          className="text-xs md:text-sm px-2 py-1 md:px-3 md:py-1"
        >
          {locale === "ja" ? "EN" : "JA"}
        </Button>

        {user ? (
          <Dropdown
            align="right"
            trigger={
              user.user_metadata?.avatar_url && (
                <Button
                  variant="icon"
                  size="none"
                  aria-label="User Menu"
                  className="block"
                >
                  <Avatar
                    src={user.user_metadata.avatar_url}
                    className="w-6 h-6 md:w-8 md:h-8 rounded-full border border-[#bc13fe] hover:shadow-[0_0_10px_rgba(188,19,254,0.6)] cursor-pointer object-cover"
                  />
                </Button>
              )
            }
          >
            <Link
              href="/profile"
              className="px-4 py-3.5 hover:bg-white/10 text-white font-cyber text-sm md:text-base font-bold tracking-widest transition-colors text-left flex items-center gap-3 w-full border-b border-white/5"
            >
              PROFILE SETTINGS
            </Link>
            <DropdownItem
              onClick={handleLogout}
              className="hover:bg-red-500/20 text-red-400 border-none"
            >
              LOGOUT
            </DropdownItem>
          </Dropdown>
        ) : (
          <Dropdown
            align="right"
            trigger={
              <Button
                variant="success"
                size="none"
                className="text-xs md:text-sm px-2 py-1 md:px-4 md:py-2"
              >
                LOGIN
              </Button>
            }
          >
            <DropdownItem
              onClick={() => {
                supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/${locale}${pathname}`,
                    queryParams: { hl: "ja" },
                  },
                });
              }}
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              GOOGLE
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                supabase.auth.signInWithOAuth({
                  provider: "x",
                  options: {
                    redirectTo: `${window.location.origin}/auth/callback?next=/${locale}${pathname}`,
                    queryParams: { lang: "ja" },
                  },
                });
              }}
              className="border-none"
            >
              <svg
                className="w-4 h-4 shrink-0 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X
            </DropdownItem>
          </Dropdown>
        )}
      </div>
    </header>
  );
};
