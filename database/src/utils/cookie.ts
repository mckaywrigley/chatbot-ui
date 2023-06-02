export class CookieParser {
  // Parses cookies into a Map
  public static parse(cookieString: string): Map<string, string> {
    const cookies: Map<string, string> = new Map();

    cookieString?.split(";").forEach((cookie) => {
      const [key, value] = cookie.split("=").map((part) => part.trim());
      cookies.set(decodeURIComponent(key), decodeURIComponent(value));
    });

    return cookies;
  }

  // Converts a Map back to a cookie string
  public static serialize(cookies: Map<string, string>): string {
    const serializedCookies: string[] = [];

    cookies.forEach((value, key) => {
      serializedCookies.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      );
    });

    return serializedCookies.join("; ");
  }
}
