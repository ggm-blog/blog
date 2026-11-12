/* PLAYWRIGHT_MODULE=/path/to/playwright node tests/home-browser.cjs BASE PROFILE SHOTS */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const [base='http://127.0.0.1:4317', profile='production', shots='/tmp/ggm-home-shots'] = process.argv.slice(2);
(async()=>{
 const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 fs.mkdirSync(shots,{recursive:true});
 for(const [width,height] of [[1440,900],[1366,768],[390,844]]) for(const theme of ['light','dark']) {
  const context=await browser.newContext({viewport:{width,height},colorScheme:theme});
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.evaluate(d=>{if(document.body.classList.contains('quarto-dark')!==d)window.quartoToggleColorScheme()},theme==='dark');
  await page.waitForFunction(n=>window['quarto-listings']?.['listing-posts']?.visibleItems.length===n,profile==='staging'?4:2);
  const geometry=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
   return {hero:rect('.home-latest .home-post-content'),sidebar:rect('.home-sidebar'),posts:rect('.home-listing'),title:rect('.quarto-title-banner'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(!geometry.overflow,JSON.stringify(geometry));
  if(width>=992){
   assert(geometry.hero.top<height/2,JSON.stringify(geometry));
   assert(geometry.title.height<125,JSON.stringify(geometry));
   assert(geometry.sidebar.left>=geometry.posts.right,JSON.stringify(geometry));
   assert(geometry.sidebar.width>=288 && geometry.sidebar.width<=330,JSON.stringify(geometry));
   assert(Math.abs(geometry.sidebar.top-geometry.posts.top)<2,JSON.stringify(geometry));
   assert(await page.locator('.home-search').isVisible());
  }else{
   assert(geometry.sidebar.top>=geometry.posts.bottom-1,JSON.stringify(geometry));
   assert(!await page.locator('.home-search').isVisible());
   assert(await page.locator('.quarto-navbar-tools').isVisible());
  }
  const links=await page.locator('.home-topics a').allTextContents();
  assert(links.includes(`All topics (${profile==='staging'?4:2})`));
  await page.screenshot({path:`${shots}/${profile}-home-${width}-${theme}.png`});
  console.log(`Checking ${profile} ${width}px ${theme}: topic filter`);
  await page.locator('.home-topics a[href$="#category=about"]').click();
  await page.waitForFunction(()=>window['quarto-listings']?.['listing-posts']?.visibleItems.length===1);
  assert((await page.locator('.home-post:visible .listing-title').innerText()).includes('Welcome'));
  await page.locator('.home-topics a[href$="#category="]').click();
  await page.waitForFunction(n=>window['quarto-listings']?.['listing-posts']?.visibleItems.length===n,profile==='staging'?4:2);
  await page.evaluate(()=>location.hash='category=nonexistent-topic');
  await page.waitForFunction(()=>window['quarto-listings']?.['listing-posts']?.visibleItems.length===0);
  assert(await page.locator('.listing-no-matching').isVisible());
  await page.evaluate(()=>location.hash='category=');
  await page.waitForFunction(()=>window['quarto-listings']?.['listing-posts']?.visibleItems.length>0);
  assert(!await page.locator('.listing-no-matching').isVisible());
  if(width<992) await page.locator('.navbar-toggler').click();
  await page.getByRole('link',{name:'Posts',exact:true}).click();
  const menu=page.locator('.navbar .dropdown-menu.show');
  assert.equal(await menu.locator('hr.dropdown-divider').count(),1);
  const text=await menu.innerText();
  assert(text.includes('Welcome')&&text.includes('parser'));
  assert(!text.includes('Tensor Tension')&&!text.includes('surprising riposte'));
  const feed=await page.request.get(new URL('index.xml',base).href);
  assert.equal(feed.status(),200);
  const count=await page.evaluate(xml=>new DOMParser().parseFromString(xml,'text/xml').querySelectorAll('item').length,await feed.text());
  assert.equal(count,profile==='staging'?4:2);
  console.log(`Checking ${profile} ${width}px ${theme}: search`);
  if(width>=992){
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('#home-search-query').fill('parser');
   await page.locator('.home-search button').click();
   await page.waitForURL('**/search.html?query=parser');
   await page.locator('.pagefind-ui__result-link[href*="2026-12-parser-grammar"]').first().waitFor({state:'visible'});
  }
  console.log(`PASS ${profile} home ${width}x${height} ${theme}: layout, topics/counts/filter/reset/no-match, RSS, dropdown, search`);
  await context.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
