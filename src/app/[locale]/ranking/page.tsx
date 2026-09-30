import { RankingClient } from "@/app/[locale]/ranking/RankingClient";
import { Header } from "@/components/Header";
import { DeviceType } from "@/features/game";
import { RankingLoginRequired } from "@/features/ranking";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { userAgent } from "next/server";

const RankingPage = async (_props?: {
  params?: Promise<{ locale?: string }>;
}) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen relative text-white flex flex-col">
        <Header />
        <main className="pt-24 md:pt-28 px-4 max-w-5xl mx-auto pb-12 w-full flex-1 flex flex-col items-center justify-center">
          <RankingLoginRequired />
        </main>
      </div>
    );
  }

  const reqHeaders = await headers();
  const { device } = userAgent({ headers: reqHeaders });
  const isMobile = device.type === "mobile" || device.type === "tablet";
  const initialDeviceType: DeviceType = isMobile ? "MOBILE" : "PC";

  return (
    <RankingClient
      currentUserId={user.id}
      initialDeviceType={initialDeviceType}
    />
  );
};

export default RankingPage;
