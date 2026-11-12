/* The citation and BibTeX remain readable without JavaScript. */
(() => {
  const box = document.getElementById('cite-this-post');
  if (!box) return;
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
  for (const button of box.querySelectorAll('button[data-copy-source]')) {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const source = document.getElementById(button.dataset.copySource);
      const text = source.innerText.replace(/\s*\n\s*/g,
        button.dataset.copySource === 'ggm-citation-text' ? ' ' : '\n').trim();
      const status = box.querySelector('.ggm-copy-status');
      status.textContent = '';
      try {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(text);
        } catch (_) {
          fallbackCopy(text);
        }
        status.textContent = 'Copied';
      } catch (_) {
        status.textContent = 'Could not copy. Select and copy the text above.';
      } finally {
        button.focus({ preventScroll: true });
      }
    });
  }
})();
