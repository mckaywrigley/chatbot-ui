import { test, expect } from '@playwright/test';

  test('check button new-workspace-button exists', async ({ page }) => {
    await page.goto('localhost:3000/*/chat');

    // Wait for the network to be idle
    await page.waitForLoadState('networkidle');

    const button = page.locator('#new-workspace-button');
    expect(button).toBeTruthy();
  });


  test('Profile button exist', async ({ page }) => {
    // Navigate to the page containing the button and the side panel
    await page.goto('localhost:3000/*/chat"', { waitUntil: 'networkidle' }); // replace with your actual URL
  
    const locator = await page.getByTestId('#userButtonOpenMenu');
  
    expect(locator).toBeTruthy();
});


test('Cancel and save buttons exist', async ({ page }) => {
  await page.goto('localhost:3000/*/chat"', { waitUntil: 'networkidle' }); 

  const CancelButtons = await page.getByText('Cancel');
  const SaveButtons = await page.getByText('Save');

  expect(CancelButtons).toBeTruthy();
  expect(SaveButtons).toBeTruthy();
});



//   test('profile button open side panel', async ({ page }) => {
//     await page.goto("localhost:3000/*/chat");
//     await page.waitForLoadState('networkidle');
  
//   const button = await page.getByTestId('#userButtonOpenMenu');

//   let State = await expect(button).toHaveAttribute('aria-expanded', "")
//   console.log('Initial aria-expanded:', State);

//   await expect(button).toHaveAttribute('aria-expanded', 'false', { timeout: 10000 });


//   await button.click();

//   const finalAriaExpanded = await button.getAttribute('aria-expanded');
//   console.log('Final aria-expanded:', finalAriaExpanded);

//   await expect(button).toHaveAttribute('aria-expanded', 'true', { timeout: 10000 });
// });
