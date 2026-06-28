import { chromium, devices } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext(devices['iPhone 13']);
  const page = await context.newPage();

  // Test Index
  console.log('Testing index.html...');
  await page.goto('http://localhost:8000/index.html');
  await page.screenshot({ path: 'screenshots/index-mobile.png' });

  // Open mobile menu
  await page.click('#mobile-menu-toggle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/index-mobile-menu.png' });

  // Test Melanin Map
  console.log('Testing melanin-map.html...');
  await page.goto('http://localhost:8000/melanin-map.html');
  await page.screenshot({ path: 'screenshots/map-mobile.png' });

  // Test Login
  console.log('Testing login.html...');
  await page.goto('http://localhost:8000/login.html');
  await page.screenshot({ path: 'screenshots/login-mobile.png' });

  await browser.close();
  console.log('Screenshots saved to screenshots/');
})();
