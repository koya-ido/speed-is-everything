import { test, expect } from '@playwright/test';

test.describe('Speed is Everything E2E Tests', () => {

  test('Should load top page and show titles (Japanese)', async ({ page }) => {
    // Top page
    await page.goto('/ja');
    // Title is "SPEED IS EVERYTHING" (capitalized via CSS or actual text)
    await expect(page).toHaveTitle(/Speed/i);
    // ページ上に "SPEED IS EVERYTHING" などの見出しがあるか
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/SPEED IS EVERYTHING/i);
  });

  test('Should load top page and show titles (English)', async ({ page }) => {
    // English page
    await page.goto('/en');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/SPEED IS EVERYTHING/i);
  });

  test('Game flow: False start results in Game Over', async ({ page }) => {
    await page.goto('/en/game');

    // "INITIALIZE" 状態の画面が表示されるのを待つ
    const gameContainer = page.locator('h1').filter({ hasText: /INITIALIZE/i });
    await expect(gameContainer).toBeVisible();

    // ゲーム開始（最初のクリック）
    await page.mouse.click(100, 100);

    // "STAND BY..." (WAITING) 状態になるはず
    const waitingText = page.locator('h1').filter({ hasText: /STAND BY/i });
    await expect(waitingText).toBeVisible();

    // シグナル前にクリックしてフライング(False Start)を発生させる
    await page.mouse.click(100, 100);

    // GAME OVER または MISSION FAILED が表示される ResultSection が出るはず
    // ResultSection には "RETRY MISSION" ボタンがあるはず
    const retryButton = page.locator('button').filter({ hasText: /RETRY/i });
    await expect(retryButton).toBeVisible();

    // RETRY をクリックすると、最初の状態に戻る
    await retryButton.click();
    await expect(gameContainer).toBeVisible();
  });

  test('Game flow: Return to top from Result Section', async ({ page }) => {
    await page.goto('/en/game');

    const gameContainer = page.locator('h1').filter({ hasText: /INITIALIZE/i });
    await expect(gameContainer).toBeVisible();

    await page.mouse.click(100, 100);

    const waitingText = page.locator('h1').filter({ hasText: /STAND BY/i });
    await expect(waitingText).toBeVisible();

    // フライング
    await page.mouse.click(100, 100);

    // ResultSection の "RETURN TO TOP" などのリンクをクリック
    const returnLink = page.locator('a').filter({ hasText: /RETURN/i });
    await expect(returnLink).toBeVisible();
    await returnLink.click();

    // トップページに戻る
    await expect(page).toHaveURL(/.*\/en/);
    const topHeading = page.locator('h1').first();
    await expect(topHeading).toContainText(/SPEED IS EVERYTHING/i);
  });
});
