import { ProfileClient } from "@/app/[locale]/profile/ProfileClient";
import { redirect } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const ProfilePage = async (props: { params: Promise<{ locale: string }> }) => {
  const { locale } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect({ href: "/", locale });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return redirect({ href: "/", locale });
  }

  return <ProfileClient dbUser={dbUser} />;
};

export default ProfilePage;
