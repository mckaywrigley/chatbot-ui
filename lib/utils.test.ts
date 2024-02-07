import { epochTimeToNaturalLanguage } from "./utils"

describe("epochTimeToNaturalLanguage", () => {
  test("Accurately converts milliseconds to natural language", () => {
    expect(epochTimeToNaturalLanguage(1000)).toBe("1 second")
    expect(epochTimeToNaturalLanguage(60000)).toBe("1 minute")
    expect(epochTimeToNaturalLanguage(3600000)).toBe("1 hour")
  })

  test("Correctly converts when involving multiple time units", () => {
    expect(epochTimeToNaturalLanguage(3661000)).toBe("1 hour 1 minute 1 second")
  })

  test("Returns an empty string for 0 milliseconds", () => {
    expect(epochTimeToNaturalLanguage(0)).toBe("")
  })

  test("Correctly handles plural", () => {
    expect(epochTimeToNaturalLanguage(2000)).toBe("2 seconds")
    expect(epochTimeToNaturalLanguage(120000)).toBe("2 minutes")
    expect(epochTimeToNaturalLanguage(7200000)).toBe("2 hours")
  })
})
