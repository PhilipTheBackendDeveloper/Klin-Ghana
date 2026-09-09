import { chromium } from '@playwright/test';

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto('https://klin-ghana.vercel.app/#/admin');
  await desktop.waitForTimeout(3000);
  await desktop.screenshot({ path: 'C:/Users/odame/.gemini/antigravity-ide/brain/db2bcb40-debb-4850-a577-60d5274b25ea/admin_responsive_desktop.png' });

  // 2. Mobile
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('https://klin-ghana.vercel.app/#/admin');
  await mobile.waitForTimeout(3000);
  await mobile.screenshot({ path: 'C:/Users/odame/.gemini/antigravity-ide/brain/db2bcb40-debb-4850-a577-60d5274b25ea/admin_responsive_mobile.png' });

  // 3. Mobile with Menu Opened
  const menuBtn = await mobile.$('button[aria-label="Open menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await mobile.waitForTimeout(600);
    await mobile.screenshot({ path: 'C:/Users/odame/.gemini/antigravity-ide/brain/db2bcb40-debb-4850-a577-60d5274b25ea/admin_responsive_mobile_menu.png' });
  }

  // 4. Citizen Report View on Mobile
  const citizen = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await citizen.goto('https://klin-ghana.vercel.app/#/user/report');
  await citizen.waitForTimeout(3000);
  await citizen.screenshot({ path: 'C:/Users/odame/.gemini/antigravity-ide/brain/db2bcb40-debb-4850-a577-60d5274b25ea/citizen_responsive_mobile.png' });

  console.log('All responsive screenshots captured successfully!');
  await browser.close();
}

capture();
