import path from 'path';
import puppeteer, { type LaunchOptions } from 'puppeteer';
import {
  getPort,
  killApp,
  launchApp,
  launchOptions,
} from '../../../utils/modernTestUtils';

const appDir = path.resolve(__dirname, '../');

describe('issue-8210 integration', () => {
  jest.setTimeout(25000);
  let app: unknown;
  let appPort: number;

  beforeAll(async () => {
    appPort = await getPort();
    app = await launchApp(appDir, appPort, {}, {});
  });

  afterAll(async () => {
    if (app) {
      await killApp(app);
    }
  });

  test('loads B page', async () => {
    const browser = await puppeteer.launch(launchOptions as LaunchOptions);
    const page = await browser.newPage();
    await page.goto(`http://localhost:${appPort}/B`, {
      waitUntil: ['networkidle0'],
    });
    await page.close();
    await browser.close();
  });
});
