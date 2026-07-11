const QUEUE_SELECTOR = '[aria-label="行动队列"]';
const CARD_SELECTOR = '[role="button"][aria-label]';

function extractCity(card: HTMLElement) {
  const absolutePanels = Array.from(card.querySelectorAll<HTMLElement>('div'))
    .filter((node) => node.style.position === 'absolute' && node.style.inset === '0px');

  for (const panel of absolutePanels) {
    const details = Array.from(panel.querySelectorAll<HTMLElement>('div'))
      .find((node) => node.textContent?.includes('·'));
    const firstLine = details?.innerText?.split('\n')[0]?.trim();
    if (firstLine) return firstLine.split('·')[0]?.trim() || '';
  }

  return '';
}

function enhanceCard(card: HTMLElement) {
  if (card.dataset.aqPreviewEnhanced === 'true') return;

  const visiblePanel = Array.from(card.children)
    .find((node) => node instanceof HTMLElement && node.style.position !== 'absolute') as HTMLElement | undefined;
  if (!visiblePanel) return;

  const companyNode = visiblePanel.children.item(1);
  const positionNode = visiblePanel.children.item(2);
  if (!(companyNode instanceof HTMLElement) || !(positionNode instanceof HTMLElement)) return;

  const city = extractCity(card);
  if (!city) return;

  const cityNode = document.createElement('div');
  cityNode.className = 'aq-preview-city';
  cityNode.textContent = city;
  visiblePanel.insertBefore(cityNode, positionNode);
  card.dataset.aqPreviewEnhanced = 'true';
}

function enhanceQueue() {
  const queue = document.querySelector<HTMLElement>(QUEUE_SELECTOR);
  if (!queue) return;
  queue.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(enhanceCard);
}

if (typeof window !== 'undefined') {
  const observer = new MutationObserver(enhanceQueue);
  const start = () => {
    enhanceQueue();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
