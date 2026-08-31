/**
 * Client-side RevenueCat Web Billing helper. Lazily imports the SDK so it's
 * only pulled into the bundle when a user actually starts a checkout, and so a
 * missing/misconfigured setup degrades to a thrown error the UI can toast
 * rather than a hard crash. The dashboard setup + env vars are the user's job
 * (see BILLING.md).
 */

export interface StartCheckoutArgs {
  publicApiKey: string
  appUserId: string
  /** Package identifier configured in the RevenueCat offering. */
  packageId: string
}

let configuredKey: string | null = null

export async function startRevenueCatCheckout(
  args: StartCheckoutArgs
): Promise<void> {
  const mod = await import("@revenuecat/purchases-js")
  const Purchases = (mod as any).Purchases

  let purchases: any = null
  try {
    purchases = Purchases.getSharedInstance?.()
  } catch {
    purchases = null
  }
  if (!purchases || configuredKey !== args.publicApiKey) {
    purchases = Purchases.configure({
      apiKey: args.publicApiKey,
      appUserId: args.appUserId
    })
    configuredKey = args.publicApiKey
  }

  const offerings = await purchases.getOfferings()
  const candidates: any[] = []
  if (offerings?.current?.availablePackages) {
    candidates.push(...offerings.current.availablePackages)
  }
  for (const off of Object.values(offerings?.all || {})) {
    const pkgs = (off as any)?.availablePackages
    if (Array.isArray(pkgs)) candidates.push(...pkgs)
  }

  const pkg = candidates.find(
    p =>
      p?.identifier === args.packageId ||
      p?.webBillingProduct?.identifier === args.packageId ||
      p?.rcBillingProduct?.identifier === args.packageId
  )
  if (!pkg) {
    throw new Error(
      `Plan "${args.packageId}" isn't available in RevenueCat offerings yet.`
    )
  }

  // Opens RevenueCat's hosted checkout; resolves once the purchase completes.
  await purchases.purchase({ rcPackage: pkg })
}
