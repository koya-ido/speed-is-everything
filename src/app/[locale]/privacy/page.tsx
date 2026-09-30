import { Header } from "@/components/Header";
import { Heading } from "@/components/Heading";
import { getTranslations } from "next-intl/server";

const PrivacyPage = async (props: { params: Promise<{ locale: string }> }) => {
  const { locale } = await props.params;
  const t = await getTranslations("HomePage");

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col p-4 pt-24 md:pt-28 pb-8 max-w-4xl mx-auto w-full text-gray-300">
        <Heading
          as="h1"
          variant="purple"
          className="!text-3xl md:!text-5xl tracking-wider mb-8 uppercase"
        >
          {t("privacy")}
        </Heading>

        <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6 text-sm md:text-base leading-relaxed border border-[#bc13fe]/20 shadow-[0_0_15px_rgba(188,19,254,0.1)]">
          {locale === "ja" ? (
            <>
              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2"
              >
                1. 収集する情報
              </Heading>
              <p>本サービスでは、以下の情報を収集する場合があります。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  認証プロバイダー（Google、X等）から提供される基本的なプロフィール情報（ユーザーID等）
                </li>
                <li>ユーザーが設定したプレイヤー名、国・地域情報</li>
                <li>
                  本サービス内でのゲームプレイデータ（スコア、反応時間など）
                </li>
                <li>アクセスログ情報（IPアドレス、ブラウザ情報など）</li>
              </ul>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                2. 情報の利用目的
              </Heading>
              <p>収集した情報は、以下の目的で利用されます。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>ゲームのランキングシステムの運用およびスコアの記録</li>
                <li>本サービスの提供、維持、保護および改善</li>
                <li>不正行為の監視と防止</li>
              </ul>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                3. 情報の第三者提供
              </Heading>
              <p>
                本サービスは、ユーザーの同意がない限り、収集した個人情報を第三者に提供することはありません。ただし、法令に基づく場合や、ユーザーが本サービスの規約に違反し、運営者または第三者の権利を保護するために必要な場合を除きます。
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                4. お問い合わせ
              </Heading>
              <p>
                本プライバシーポリシーに関するご質問や、ご自身のデータに関するお問い合わせは、開発者までご連絡ください。
              </p>
            </>
          ) : (
            <>
              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2"
              >
                1. Information We Collect
              </Heading>
              <p>
                We may collect the following information when you use the
                Service:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Basic profile information (e.g., User ID) provided by
                  third-party authentication services (Google, X, etc.).
                </li>
                <li>
                  Player name and country/region settings configured by you.
                </li>
                <li>
                  Gameplay data within the Service (scores, reaction times,
                  etc.).
                </li>
                <li>
                  Access log information (IP address, browser type, etc.).
                </li>
              </ul>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                2. How We Use Information
              </Heading>
              <p>
                The collected information is used for the following purposes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Operating the game ranking system and saving user scores.
                </li>
                <li>
                  Providing, maintaining, protecting, and improving the Service.
                </li>
                <li>Monitoring and preventing fraudulent activities.</li>
              </ul>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                3. Third-Party Disclosure
              </Heading>
              <p>
                We do not share your personal information with third parties
                without your consent, except as required by law or to protect
                the rights of the operators or other users if you violate our
                Terms of Service.
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                4. Contact Us
              </Heading>
              <p>
                If you have any questions about this Privacy Policy or your
                data, please contact the developer.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
