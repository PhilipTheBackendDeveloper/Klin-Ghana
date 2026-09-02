import { test, expect } from '@playwright/test';

test.describe('KlinGhana E2E Acceptance Suite', () => {
  test('complete browser click, navigation, and zero console error pass', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Visit Login Page
    await page.goto('/#/login');
    await expect(page.locator('text=Admin access')).toBeVisible();

    // 2. Verify Live Mode Guard: Attempt submit without configured cloud credentials
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[type="text"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@klinghana.gov.gh');
    }
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('KlinGhanaPass2026!');
    }
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();

    // 3. Admin Command Center Overview
    await page.goto('/#/admin');
    await expect(page.locator('text=Operations Command Center')).toBeVisible();

    // 4. Global Topbar Search
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('SB-024');
      await page.waitForTimeout(200);
      await searchInput.fill('');
    }

    // Theme Toggle
    const sunBtn = page.locator('button[aria-label="Light mode"]').first();
    const moonBtn = page.locator('button[aria-label="Dark mode"]').first();
    if (await sunBtn.isVisible()) await sunBtn.click();
    if (await moonBtn.isVisible()) await moonBtn.click();

    // Notifications Bell
    const bellBtn = page.locator('button[aria-label="Notifications"]').first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      await page.waitForTimeout(100);
      await bellBtn.click();
    }

    // 5. Sidebar Navigation Clicks
    // Bins
    const binsNav = page.locator('aside button:has-text("Bins")');
    if (await binsNav.isVisible()) {
      await binsNav.click();
      await expect(page.locator('input[placeholder*="Search asset register"]')).toBeVisible();
    }

    // Alerts
    const alertsNav = page.locator('aside button:has-text("Alerts")');
    if (await alertsNav.isVisible()) {
      await alertsNav.click();
      await expect(page.locator('text=Incident Board - Real-time Triage')).toBeVisible();
    }

    // Complaints
    const complaintsNav = page.locator('aside button:has-text("Complaints")');
    if (await complaintsNav.isVisible()) {
      await complaintsNav.click();
      await expect(page.locator('text=Complaints Workbench')).toBeVisible();
    }

    // Routes
    const routesNav = page.locator('aside button:has-text("Routes")');
    if (await routesNav.isVisible()) {
      await routesNav.click();
      await expect(page.locator('text=Collections & Routes')).toBeVisible();
    }

    // Analytics
    const analyticsNav = page.locator('aside button:has-text("Analytics")');
    if (await analyticsNav.isVisible()) {
      await analyticsNav.click();
      await expect(page.locator('text=WASTE VOLUME')).toBeVisible();
    }

    // Settings
    const settingsNav = page.locator('aside button:has-text("Settings")');
    if (await settingsNav.isVisible()) {
      await settingsNav.click();
      await expect(page.locator('text=Users, Roles & System Settings')).toBeVisible();
    }

    // 6. System Diagnostics View
    await page.goto('/#/dev/system');
    await expect(page.locator('text=SB-024 Hardware & Cloud Diagnostics')).toBeVisible();
    await expect(page.locator('text=DATA MODE').first()).toBeVisible();

    // 7. Citizen Views
    await page.goto('/#/user/bins');
    await expect(page.locator('text=Nearby SmartBins in Accra')).toBeVisible();

    await page.goto('/#/user/complaints');
    await expect(page.locator('text=No complaints')).toBeVisible();

    // 8. Logout
    await page.goto('/#/admin');
    const logoutBtn = page.locator('button[aria-label="Logout"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*#\/login/);
    }

    // Filter non-fatal network messages
    const fatalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('net::ERR') &&
        !err.includes('400') &&
        !err.includes('404') &&
        !err.includes('favicon') &&
        !err.includes('Failed to fetch') &&
        !err.includes('WebSocket')
    );
    expect(fatalErrors).toEqual([]);
  });
});
