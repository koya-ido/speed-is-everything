import { expect, test } from "@playwright/test";

test.describe("Profile Update API Integration Test (Mocked Login State)", () => {
  test("Should send correct data to /api/user/profile and navigate on success", async ({
    page,
  }) => {
    // リクエストがインターセプトされたかを記録する変数
    let requestPayload: { name?: string; country?: string } = {} as {
      name?: string;
      country?: string;
    };

    // /api/user/profile へのPATCHリクエストをモックする
    // ログイン済みの状態としてAPIがサクセスを返すように振る舞わせる
    await page.route("**/api/user/profile", async (route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        requestPayload = request.postDataJSON();
        // 成功時のレスポンスを返す
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // オンボーディング画面にアクセス
    await page.goto("/en/onboarding");

    // フォームへの入力
    const testName = "Agent 47";
    const nameInput = page.getByPlaceholder(/Player Name/i);
    await nameInput.fill(testName);

    // 国の選択
    const countrySelect = page.locator("select");
    await countrySelect.selectOption("US");

    // Submitボタンのクリック
    const submitButton = page.getByRole("button", { name: /Start Game/i });
    await submitButton.click();

    // 画面遷移を待機 (成功時は /game へ遷移する)
    await page.waitForURL(/.*\/game/);

    // インターセプトしたリクエストペイロードのアサーション
    expect(requestPayload).not.toBeNull();
    expect(requestPayload?.name).toBe(testName);
    expect(requestPayload?.country).toBe("US");

    // 遷移後の画面確認
    const gameHeading = page.locator("h1").filter({ hasText: /INITIALIZE/i });
    await expect(gameHeading).toBeVisible();
  });

  test('Should handle custom country "Other" correctly in API request', async ({
    page,
  }) => {
    let requestPayload: { name?: string; country?: string } = {} as {
      name?: string;
      country?: string;
    };

    await page.route("**/api/user/profile", async (route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        requestPayload = request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/en/onboarding");

    await page.getByPlaceholder(/Player Name/i).fill("Custom Agent");
    await page.locator("select").selectOption("OTHER");
    await page.getByPlaceholder(/Please enter specific/i).fill("Atlantis");

    await page.getByRole("button", { name: /Start Game/i }).click();

    await page.waitForURL(/.*\/game/);

    expect(requestPayload).not.toBeNull();
    expect(requestPayload?.name).toBe("Custom Agent");
    // "OTHER" を選択した場合はカスタムフィールドの値が country として送られる仕様
    expect(requestPayload?.country).toBe("Atlantis");
  });

  test("Should show error message when API returns failure (e.g. Session Expired)", async ({
    page,
  }) => {
    // APIがエラーを返すようにモック
    await page.route("**/api/user/profile", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Unauthorized user" }),
      });
    });

    await page.goto("/en/onboarding");

    await page.getByPlaceholder(/Player Name/i).fill("Agent 47");
    await page.getByRole("button", { name: /Start Game/i }).click();

    // apiClient の仕様上、HTTPエラーは catch に落ちて t('error_network') が表示される
    const errorMessage = page.getByText(/Network error/i);
    await expect(errorMessage).toBeVisible();
  });
});
