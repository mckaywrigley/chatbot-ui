import { test, expect } from '@playwright/test';

test('start chatting is displayed', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  //expect the start chatting link to be visible
  await expect (page.getByRole('link', { name: 'Start Chatting' })).toBeVisible();
});

test('No password error message', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  //fill in dummy email
  await page.getByPlaceholder('you@example.com').fill('dummyemail@gmail.com');
  await page.getByRole('button', { name: 'Login' }).click();
  //wait for netwrok to be idle
  await page.waitForLoadState('networkidle');
  //validate that correct message is shown to the user
  await expect(page.getByText('Invalid login credentials')).toBeVisible();
  
});
test('No password for signup', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  
  await page.getByPlaceholder('you@example.com').fill('dummyEmail@Gmail.com');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  //validate appropriate error is thrown for missing password when signing up
  await expect(page.getByText('Signup requires a valid')).toBeVisible();
});
test('invalid username for signup', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  
  await page.getByPlaceholder('you@example.com').fill('dummyEmail');
  await page.getByPlaceholder('••••••••').fill('dummypassword');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  //validate appropriate error is thrown for invalid username when signing up
  await expect(page.getByText('Unable to validate email')).toBeVisible();
});
test('password reset message', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByPlaceholder('you@example.com').fill('demo@gmail.com');
  await page.getByRole('button', { name: 'Reset' }).click();
  //validate appropriate message is shown
  await expect(page.getByText('Check email to reset password')).toBeVisible();
});

//more tests can be added here