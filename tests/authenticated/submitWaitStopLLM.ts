async function submitWaitStopLLM(page: any): Promise<void> {
  await page.locator(".absolute > .bg-primary").first().click()

  // Check if the update is processed or handle error
  const updateResponse = await page.waitForResponse(
    (response: { url: () => string | string[]; status: () => number }) =>
      response.url().includes("/api/chat/functions") &&
      (response.status() === 200 || response.status() === 401),
    { timeout: 45000 }
  )

  if (updateResponse.status() === 401) {
    const updateError = await updateResponse.text()
    console.error("Update error:", updateError)
    throw new Error("401 status code error occurred during topic update.")
  }
  await page.keyboard.press("ControlOrMeta+Shift+0")
}

export default submitWaitStopLLM
