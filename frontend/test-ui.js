import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  await page.goto('http://localhost:5174/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.goto('http://localhost:5174/admin'); // Go to Reports
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
