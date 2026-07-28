import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173');
  await page.waitForSelector('#thought-input', { timeout: 10000 });
  await page.type('#thought-input', 'test');
  await page.keyboard.press('Enter');
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
