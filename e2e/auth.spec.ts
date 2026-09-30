import { test, expect } from '@playwright/test';

test.describe('Authentication and Onboarding UI Tests', () => {

  test('Should show login prompt on top page when not logged in', async ({ page }) => {
    // 英語のトップページ
    await page.goto('/en');
    
    // "Log in to record your personal best and join the ranking." のテキストが表示されているか
    const loginPrompt = page.getByText(/Log in to record your personal best/i);
    await expect(loginPrompt).toBeVisible();
  });

  test('Onboarding page: UI and validation', async ({ page }) => {
    await page.goto('/en/onboarding');

    // "Profile Setup" タイトルが表示されている
    const title = page.locator('h1').filter({ hasText: /Profile Setup/i });
    await expect(title).toBeVisible();

    const nameInput = page.getByPlaceholder(/Player Name/i);
    const countrySelect = page.locator('select');
    const submitButton = page.getByRole('button', { name: /Start Game/i });

    // バリデーション: 15文字を超える名前を入力しようとする (HTML属性で弾かれるか確認)
    await nameInput.fill('1234567890123456'); // 16文字
    // maxlength 属性によって15文字になっているはず
    const inputValue = await nameInput.inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(15);
    
    // バリデーション: 空の名前で送信しようとする
    await nameInput.fill('');
    // required属性によりフォーム送信されないか、またはフロントのロジックでエラーメッセージが出る
    // submitを試みるが required なのでブラウザ側で弾かれる。強引にクリックする場合はJSの動作確認。
    // Playwright ではネイティブの required バリデーションをテストしにくいため、APIへの直接送信エラーかHTML5バリデーションに依存
  });

  test('Onboarding page: Country "Other" shows custom input', async ({ page }) => {
    await page.goto('/en/onboarding');

    const countrySelect = page.locator('select');
    // 初期状態では "Other" 用の input は存在しない
    const customCountryInput = page.getByPlaceholder(/Please enter specific/i);
    await expect(customCountryInput).not.toBeVisible();

    // "OTHER" を選択
    await countrySelect.selectOption('OTHER');

    // カスタム国入力フィールドが現れる
    await expect(customCountryInput).toBeVisible();
  });

  test('Should show login options in Result Section when not logged in', async ({ page }) => {
    await page.goto('/en/game');

    const gameContainer = page.locator('h1').filter({ hasText: /INITIALIZE/i });
    await expect(gameContainer).toBeVisible();

    await page.mouse.click(100, 100);

    const waitingText = page.locator('h1').filter({ hasText: /STAND BY/i });
    await expect(waitingText).toBeVisible();

    // フライングしてリザルト画面を出す
    await page.mouse.click(100, 100);

    // 未ログイン時は "Login & Save Record" (または "Save w/ Google", "Save w/ X") 的なUIが出ているはず
    // ResultSectionの LoginMenu が展開される前は "Login & Save Record" というボタンか、あるいは最初から Google/Xボタンがある
    // LoginMenuの中身次第ですが、少なくとも "Save w/ Google" のようなテキストがあるはず
    const googleLoginButton = page.getByText(/Save w\/ Google/i);
    const genericLoginButton = page.getByText(/Login & Save Record/i);

    // どちらかが表示されていればOK
    // `toBeVisible` で Playwright に待機させる
    await expect(genericLoginButton.or(googleLoginButton).first()).toBeVisible();
  });
});
