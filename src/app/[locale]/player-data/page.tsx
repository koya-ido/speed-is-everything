import { PlayerDataClient } from "@/app/[locale]/player-data/PlayerDataClient";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

const PlayerDataPage = async ({ params }: Props) => {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect({ href: "/", locale });
  }

  return <PlayerDataClient />;
};

export default PlayerDataPage;
