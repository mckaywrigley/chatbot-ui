import { test, expect } from '@playwright/test';

test('button Main exists', async ({ page }) => {

  const locator = await page.getByText('Main');

  expect(locator).toBeTruthy();
});

test('button Defaults exists', async ({ page }) => {

  const locator = await page.getByText('Defaults');

  expect(locator).toBeTruthy();
});

test('button Chatbot UI exists and redirect on target link', async ({ page }) => {
    await page.goto('localhost:3000/*/chat');

   // Locate the link
   const locator = await page.getByRole('link', { name: 'Chatbot UI' });
  
   // Verify link 
   expect(locator).toBeTruthy();
 
   // Click the link
   const [newPage] = await Promise.all([
     page.waitForEvent('popup'),
     locator.click() 
   ]);
 
   // Check the URL of the new tab
   await newPage.waitForLoadState();
   expect(newPage.url()).toBe('https://www.chatbotui.com/');
});