import type { Page } from '@playwright/test';

export function watchBrowserErrors(page: Page) {
  page.on('pageerror', error => { throw error; });
  page.on('console', message => { if (message.type() === 'error') throw new Error(message.text()); });
  page.on('requestfailed', request => { throw new Error(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`); });
  page.on('response', response => { if (response.status() >= 400) throw new Error(`HTTP ${response.status()}: ${response.url()}`); });
}
