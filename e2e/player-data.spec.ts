import { expect, test } from "@playwright/test";

test.describe("Player Data & Mode Selection E2E Tests", () => {
  test("Top page shows reorganized Solo and PvP mode sections", async ({
    page,
  }) => {
    await page.goto("/en");

    // SOLO MODE セクションが存在すること
    const soloModeHeading = page.getByText(/SOLO MODE/i).first();
    await expect(soloModeHeading).toBeVisible();

    // 1vs1 BATTLE (PVP MODE) セクションが存在すること
    const pvpModeHeading = page.getByText(/PVP MODE/i).first();
    await expect(pvpModeHeading).toBeVisible();

    // ゲーム開始ボタンとランキングボタンが存在すること
    const startButton = page.getByRole("link", {
      name: /INITIALIZE GAME|ゲームスタート/i,
    });
    await expect(startButton).toBeVisible();

    const rankingLink = page.getByRole("link", { name: /RANKING|ランキング/i });
    await expect(rankingLink).toBeVisible();
  });

  test("Mode switching and battle lobby dialog flow", async ({ page }) => {
    await page.goto("/ja");

    // 初期状態はシングルモードでゲーム説明が表示
    await expect(page.getByText("ゲーム説明")).toBeVisible();
    await expect(page.getByText("3000ms", { exact: true })).toBeVisible();

    // バトルモードに切り替え
    const battleTab = page.getByRole("button", { name: /バトルモード/i });
    await battleTab.click();

    // 対戦ルールに切り替わる
    await expect(page.getByText("対戦ルール")).toBeVisible();
    await expect(page.getByText("即敗北")).toBeVisible();

    // バトルモードのゲームスタートボタンを押下
    const startBattleBtn = page.getByRole("button", {
      name: /ゲームスタート/i,
    });
    await startBattleBtn.click();

    // 部屋を作る / 部屋に参加 を選択するダイアログが開く
    await expect(page.getByText("対戦ロビー")).toBeVisible();
    const createRoomBtn = page.getByRole("button", { name: /部屋を作る/i });
    const joinRoomBtn = page.getByRole("button", { name: /部屋に参加/i });
    await expect(createRoomBtn).toBeVisible();
    await expect(joinRoomBtn).toBeVisible();

    // 「部屋を作る」をクリックすると作成モーダルへ
    await createRoomBtn.click();
    await expect(
      page.getByRole("button", { name: /部屋を作成して待機する/i }),
    ).toBeVisible();
  });

  test("Unauthorized access to /player-data redirects to home", async ({
    page,
  }) => {
    // 認証されていない状態で /en/player-data に直接アクセス
    await page.goto("/en/player-data");

    // ログインしていないため、トップページ（/en）へリダイレクトされる
    await expect(page).toHaveURL(/\/en$/);
  });
});
