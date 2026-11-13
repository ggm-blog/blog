/* The citation and BibTeX remain readable without JavaScript. */
(() => {
  const box = document.getElementById('cite');
  if (!box) return;
  function openCitation() {
    if (location.hash !== '#cite' && location.hash !== '#cite-this-post') return;
    box.open = true;
    requestAnimationFrame(() => box.scrollIntoView({ block: 'start' }));
  }
  window.addEventListener('hashchange', openCitation);
  document.querySelector('.ggm-title-cite a')?.addEventListener('click', () => {
    box.open = true;
    requestAnimationFrame(() => box.scrollIntoView({ block: 'start' }));
  });
  openCitation();
  let wasOpen = false;
  window.addEventListener('beforeprint', () => { wasOpen = box.open; box.open = true; });
  window.addEventListener('afterprint', () => { box.open = wasOpen; });
  function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('aria-label', 'Citation to copy');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try {
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      area.remove();
    }
  }
  function citationText(sourceId) {
    return document.getElementById(sourceId).textContent.replace(/\s*\n\s*/g,
      sourceId === 'ggm-citation-text' ? ' ' : '\n').trim();
  }
  async function copyText(text) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
    } catch (_) {
      fallbackCopy(text);
    }
  }
  for (const link of document.querySelectorAll('.ggm-floating-cite')) {
    const status = link.parentElement.querySelector('.ggm-floating-cite-status');
    let resetStatus;
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      clearTimeout(resetStatus);
      status.textContent = '';
      try {
        await copyText(citationText('ggm-citation-text'));
        status.textContent = 'Copied';
        link.focus({ preventScroll: true });
        resetStatus = setTimeout(() => { status.textContent = ''; }, 4000);
      } catch (_) {
        // Preserve a useful destination when clipboard access is unavailable.
        status.textContent = 'Citation opened below';
        location.hash = 'cite';
        box.open = true;
        box.querySelector('summary').focus({ preventScroll: true });
        requestAnimationFrame(() => box.scrollIntoView({ block: 'start' }));
      }
    });
  }
  for (const button of box.querySelectorAll('button[data-copy-source]')) {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const text = citationText(button.dataset.copySource);
      const status = box.querySelector('.ggm-copy-status');
      status.textContent = '';
      try {
        await copyText(text);
        status.textContent = 'Copied';
      } catch (_) {
        status.textContent = 'Could not copy. Select and copy the text above.';
      } finally {
        button.focus({ preventScroll: true });
      }
    });
  }
})();
