import { test, expect } from '@playwright/test';

test('setup page form title', async ({ page }) => {
  await page.goto('http://localhost:3000/setup');
// Wait for the div element to appear
const divElement = await page.waitForSelector('div');

// Get the text content of the div element
const textContent = await divElement.textContent();

// Log the text content
// console.log('Text Content:', textContent);

// Check if the text content contains the expected text
expect(textContent).toContain('Welcome to Chatbot UI');
});

test('Setup page API keys form title', async ({ page }) => {
  await page.goto('http://localhost:3000/setup');
  
 // Wait for the h3 element with the specified class to appear
 const h3Element = await page.waitForSelector('h3.text-2xl.font-semibold.leading-none.tracking-tight.flex.justify-between');

 // Get the text content of the h3 element
 const textContent = await h3Element.textContent();

 // Log the text content for debugging purposes
 console.log('Text Content:', textContent);

 // Check if the text content contains the expected text
 expect(textContent).toContain('Set API Keys (optional)');
});

test('Check if text exists in a p element', async ({ page }) => {
  await page.goto('http://localhost:3000/setup');

  // Wait for the p element with the specified class to appear
  const paragraphElement = await page.waitForSelector('p.text-muted-foreground.text-sm');

  // Get the text content of the p element
  const textContent = await paragraphElement.textContent();

  // Log the text content for debugging purposes
  console.log('Text Content:', textContent);

  // Check if the text content contains the expected text
  expect(textContent).toContain("Let's create your profile.");
});

test('Display name input', async ({ page }) => {
  await page.goto('http://localhost:3000/setup');

  // Fill in the display name input
  await page.fill('input[placeholder="Your name"]', 'DisplayName');

  const inputValue = await page.$eval('input[placeholder="Your name"]', input => input.value);
  expect(inputValue).toBe('DisplayName');
});