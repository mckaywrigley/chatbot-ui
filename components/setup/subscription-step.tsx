import React, { useEffect } from "react"
// At the top of your file, declare the new property on the global Window interface
declare global {
  interface Window {
    StripePricingTable: any // Replace 'any' with a more specific type if possible
  }
}

const StripePricingTableComponent = ({
  customerSession,
  email,
  userId
}: {
  customerSession: { client_secret?: "" }
  email: string
  userId: string
}) => {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://js.stripe.com/v3/pricing-table.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return React.createElement("stripe-pricing-table", {
    "pricing-table-id": process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID,
    "publishable-key": process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    "customer-session-client-secret": customerSession?.client_secret,
    "customer-email": email,
    "client-reference-id": userId
  })
}

function StripePricingTable({
  customerSession,
  email,
  userId
}: {
  customerSession: { client_secret?: "" }
  email: string
  userId: string
}) {
  console.log(customerSession)

  return (
    <div className="your-component-styles">
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <label>Sign Up</label>
        </div>
      </div>

      <div className="relative">
        {/* The script will programmatically insert the Stripe pricing table here */}
        <StripePricingTableComponent
          customerSession={customerSession}
          email={email}
          userId={userId}
        />
      </div>
    </div>
  )
}

export default StripePricingTable
