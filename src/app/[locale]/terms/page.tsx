/* eslint-disable react/no-unescaped-entities */
import { Header } from "@/components/Header";
import { Heading } from "@/components/Heading";
import { getTranslations } from "next-intl/server";

const TermsPage = async (props: { params: Promise<{ locale: string }> }) => {
  const { locale } = await props.params;
  const t = await getTranslations("HomePage");

  return (
    <div className="min-h-screen relative flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col p-4 pt-24 md:pt-28 pb-8 max-w-4xl mx-auto w-full text-gray-300">
        <Heading
          as="h1"
          variant="cyan"
          className="!text-3xl md:!text-5xl tracking-wider mb-8 uppercase"
        >
          {t("terms")}
        </Heading>

        <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-6 text-sm md:text-base leading-relaxed border border-[#00f3ff]/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]">
          {locale === "ja" ? (
            <>
              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2"
              >
                1. はじめに
              </Heading>
              <p>
                本利用規約は、「SPEED IS
                EVERYTHING」（以下「本サービス」）の利用条件を定めるものです。本サービスを利用することにより、本規約に同意したものとみなされます。
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                2. 利用環境・アカウント
              </Heading>
              <p>
                本サービスは個人が無料で利用することができます。スコアの記録には各種プロバイダー（Google、X等）を通じた認証（ログイン）が必要です。
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                3. 禁止事項
              </Heading>
              <p>本サービスの利用にあたり、以下の行為を禁止します。</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Botやプログラム等を用いた自動化ツールによるスコアの不正操作
                </li>
                <li>
                  本サービスのサーバーやネットワークシステムに過度な負担をかける行為
                </li>
                <li>他のユーザーや第三者に不利益、損害、不快感を与える行為</li>
                <li>その他、運営が不適切と判断する行為</li>
              </ul>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                4. 免責事項
              </Heading>
              <p>
                本サービスは現状有姿で提供され、いかなる保証も行いません。本サービスの利用により発生した損害について、運営者は一切の責任を負いません。
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                5. 規約の変更
              </Heading>
              <p>
                運営者は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              </p>
            </>
          ) : (
            <>
              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2"
              >
                1. Introduction
              </Heading>
              <p>
                These Terms of Service govern your use of "SPEED IS EVERYTHING"
                (the "Service"). By using the Service, you agree to these terms.
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                2. User Accounts
              </Heading>
              <p>
                The Service is free for personal use. Authentication (login) via
                providers like Google or X is required to save and submit
                scores.
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                3. Prohibited Actions
              </Heading>
              <p>
                You agree not to engage in any of the following prohibited
                activities:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Using bots, scripts, or automated tools to manipulate scores
                  or gameplay.
                </li>
                <li>
                  Imposing an unreasonable load on the Service's infrastructure
                  or network.
                </li>
                <li>
                  Causing harm, damage, or discomfort to other users or third
                  parties.
                </li>
                <li>Any other action deemed inappropriate by the operators.</li>
              </ul>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                4. Disclaimer of Warranties
              </Heading>
              <p>
                The Service is provided "as is" without any warranties of any
                kind. The operators shall not be liable for any damages arising
                out of or in connection with the use of the Service.
              </p>

              <Heading
                as="h2"
                variant="none"
                className="!text-xl text-white font-bold border-b border-gray-700 pb-2 mt-8"
              >
                5. Changes to Terms
              </Heading>
              <p>
                We reserve the right to modify these Terms at any time without
                prior notice.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
