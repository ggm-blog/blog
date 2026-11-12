/* Run against a rendered site: PLAYWRIGHT_MODULE=/path/to/playwright node
   tests/cite-browser.cjs http://127.0.0.1:4317 staging /tmp/ggm-cite-shots */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const [base = 'http://127.0.0.1:4317', profile = 'staging', shots = '/tmp/ggm-cite-shots'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  fs.mkdirSync(shots, { recursive: true });
  async function localOnly(context) {
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === new URL(base).origin) return route.continue();
      return route.abort(); // Keep third-party embeds out of deterministic UI checks.
    });
  }
  for (const width of [1280, 390]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, colorScheme: theme,
      permissions: ['clipboard-read', 'clipboard-write'] });
    await localOnly(context);
    const page = await context.newPage();
    for (const slug of ['2026-12-parser-grammar', '2026-11-ggm-origin-story']) {
      await page.goto(`${base}/posts/${slug}/`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((dark) => {
        const isDark = document.body.classList.contains('quarto-dark');
        if (isDark !== dark) window.quartoToggleColorScheme();
      }, theme === 'dark');
      assert.equal(await page.locator('#cite').getAttribute('open'), null);
      assert.equal(await page.locator('.quarto-appendix-citeas').count(), 1);
      assert.equal(await page.locator('.quarto-appendix-bibtex').count(), 1);
      assert.equal(await page.locator('#quarto-reuse').count(), 1);
      assert.equal(await page.getByText('For attribution, please cite this work as:').count(), 0);
      const order = await page.evaluate(() => {
        const cite = document.getElementById('cite'), comments = document.getElementById('comments');
        const appendix = document.getElementById('quarto-appendix');
        return Boolean(cite.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING)
          && (!appendix || Boolean(appendix.compareDocumentPosition(cite) & Node.DOCUMENT_POSITION_FOLLOWING));
      });
      assert(order);
      await page.locator('#cite').scrollIntoViewIfNeeded();
      if (width === 1280 && theme === 'light') await page.screenshot({path:`${shots}/${profile}-footer-collapsed.png`});
      await page.locator('#title-block-header .ggm-title-cite a').click();
      assert.equal(new URL(page.url()).hash, '#cite');
      assert.equal(await page.locator('#cite').getAttribute('open'), '');
      assert(await page.locator('#quarto-reuse a[rel=license]').isVisible());
      for (const [label, source] of [['Copy citation', 'ggm-citation-text'], ['Copy BibTeX', 'ggm-bibtex-text']]) {
        const button = page.getByRole('button', { name: label, exact: true });
        await button.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelector('.ggm-copy-status').textContent === 'Copied');
        const copied = await page.evaluate(() => navigator.clipboard.readText());
        assert(copied.includes('https://ggmblog.org/posts/'));
        assert(!/tim-hunter|brian-dillon|ming-xiang/.test(copied));
        assert(copied.includes(slug.includes('parser') ? (source.includes('bibtex') ? 'Hunter, Tim' : 'Hunter, T.') : 'Dillon'));
      }
      assert(await page.locator('footer').innerText().then(t => t.includes('© 2026 the authors.') && t.includes('CC BY 4.0')));
      await page.locator('.ggm-bibtex > summary').click();
      const bibtexText = await page.locator('#ggm-bibtex-text').textContent();
      const title = await page.locator('h1.title').textContent();
      assert(bibtexText.includes(`title = {{${title.trim()}}}`));
      const dimensions = await page.locator('#cite').evaluate(el => ({
        width: el.getBoundingClientRect().width, scroll: el.scrollWidth, client: el.clientWidth,
        pageScroll: document.documentElement.scrollWidth, pageClient: document.documentElement.clientWidth
      }));
      assert(dimensions.scroll <= dimensions.client + 1, JSON.stringify(dimensions));
      assert(dimensions.pageScroll <= dimensions.pageClient + 1, JSON.stringify(dimensions));
      await page.locator('#cite').screenshot({ path: `${shots}/${profile}-${slug}-${width}-${theme}.png` });
      await page.goto(`${base}/posts/${slug}/#cite`, {waitUntil:'domcontentloaded'});
      await page.waitForFunction(() => document.getElementById('cite').open);
      await page.locator('#cite > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cite').getAttribute('open'), null);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cite').getAttribute('open'), '');
      await page.emulateMedia({media:'print'});
      await page.evaluate(() => { document.getElementById('cite').open = false; document.querySelector('.ggm-bibtex').open = false; });
      assert(await page.locator('#ggm-citation-text').isVisible());
      assert(await page.locator('#ggm-bibtex-text').isVisible());
      await page.emulateMedia({media:'screen'});
      console.log(`PASS ${profile} ${slug} ${width}px ${theme}: single collapsed panel, Cite/hash, keyboard copy, casing, print, layout/order`);
    }
    await context.close();
  }
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await localOnly(context);
  const page = await context.newPage();
  await page.goto(`${base}/posts/2026-12-parser-grammar/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new Error('Force textarea fallback'); };
    const original = document.execCommand.bind(document);
    document.execCommand = (...args) => { window.fallbackUsed = true; return original(...args); };
  });
  await page.locator('#cite > summary').click();
  await page.getByRole('button', { name: 'Copy citation', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.ggm-copy-status').textContent === 'Copied');
  assert(await page.evaluate(() => window.fallbackUsed));
  assert((await page.evaluate(() => navigator.clipboard.readText())).includes('Hunter, T.'));
  console.log(`PASS ${profile} textarea fallback copies actual citation`);
  await context.close();
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  await localOnly(nojs);
  const staticPage = await nojs.newPage();
  await staticPage.goto(`${base}/posts/2026-12-parser-grammar/`, { waitUntil: 'domcontentloaded' });
  await staticPage.locator('#cite > summary').click();
  assert(await staticPage.locator('#ggm-citation-text').isVisible());
  await staticPage.locator('.ggm-bibtex > summary').click();
  assert(await staticPage.locator('#ggm-bibtex-text').isVisible());
  assert.equal(await staticPage.locator('#cite button:visible').count(), 0);
  assert.equal(await staticPage.locator('#cite a[download]').getAttribute('href'), 'citation.bib');
  console.log(`PASS ${profile} JavaScript-off citation/BibTeX readability and download`);
  await nojs.close();
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
