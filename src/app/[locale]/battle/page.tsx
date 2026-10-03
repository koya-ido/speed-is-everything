import { BattleClient } from "@/app/[locale]/battle/BattleClient";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export const metadata = {
  title: "Battle Arena | Speed is Everything",
  description: "リアルタイム1vs1対戦モード！反射神経HP削り合いバトル",
};

const BattlePage = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName: string | undefined = undefined;
  if (user) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.name) {
      userName = dbUser.name;
    }
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#050508] text-[#00f3ff] font-cyber">
          LOADING BATTLE ARENA...
        </div>
      }
    >
      <BattleClient
        initialUserName={userName}
        initialUserId={user?.id}
      />
    </Suspense>
  );
};

export default BattlePage;
