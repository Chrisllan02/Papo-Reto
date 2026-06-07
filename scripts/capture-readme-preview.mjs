import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'readme');
const APP_URL = process.env.README_APP_URL || 'https://papo-reto-beige.vercel.app';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const getLaunchOptions = async () => {
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    return { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH };
  }

  try {
    await access(CHROME_PATH);
    return { executablePath: CHROME_PATH };
  } catch {
    return {};
  }
};

const waitForApp = async (page) => {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.getByText('Últimas Atividades', { exact: true }).waitFor({ timeout: 45_000 });
  await page.waitForTimeout(2_000);
};

const capture = async (page, name) => {
  await page.screenshot({
    path: path.join(OUT_DIR, `preview-${name}.png`),
    fullPage: false,
  });
};

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(await getLaunchOptions()) });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    colorScheme: 'light',
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    globalThis.localStorage.setItem('paporeto_user_location', 'SP');
    globalThis.localStorage.setItem('paporeto_location_auto_prompt_at', String(Date.now()));
    globalThis.localStorage.setItem('paporeto_dark_mode', 'false');
  });

  await waitForApp(page);
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
  await capture(page, 'mural');

  await page.getByRole('button', { name: 'Políticos' }).first().click();
  await page.getByText('Direita', { exact: true }).first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_000);
  await capture(page, 'partidos');

  await page.getByRole('button', { name: /CANDIDATOS/i }).click();
  await page.getByText('Adriana ventura', { exact: true }).waitFor({ timeout: 30_000 });
  await page.getByText('Adriana ventura', { exact: true }).click();
  await page.getByText('Ficha Parlamentar', { exact: true }).waitFor({ timeout: 45_000 });
  await page.waitForTimeout(3_000);
  await capture(page, 'perfil');

  await page.getByRole('button', { name: 'Gráficos' }).first().click();
  await page.getByText('Cenário Político', { exact: true }).waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1_000);
  await capture(page, 'graficos');

  await browser.close();
};

await main();
