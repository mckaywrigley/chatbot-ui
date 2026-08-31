import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Shadow AI privacy policy - how we collect, use, and protect your data. We take the privacy of life sciences researchers seriously.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true }
}

const EFFECTIVE_DATE = "1 June 2025"
const CONTACT_EMAIL = "privacy@shadowai.work"
const SITE_URL = "https://www.shadowai.work"

export default function PrivacyPage() {
  return (
    <div className="bg-paper min-h-dvh">
      {/* Nav */}
      <div className="border-ink-200/40 border-b px-6 py-5">
        <div className="mx-auto flex max-w-[760px] items-center justify-between">
          <Link
            href="/"
            className="text-ink-500 hover:text-ink-900 text-[13px] transition-colors"
          >
            ← Shadow AI
          </Link>
          <Link
            href="/terms"
            className="text-ink-400 hover:text-ink-700 text-[13px] transition-colors"
          >
            Terms of Service →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[760px] px-6 py-12">
        <p className="text-brick mb-2 text-[11px] font-bold uppercase tracking-[0.14em]">
          Legal
        </p>
        <h1 className="text-ink-900 mb-2 text-[32px] font-extrabold tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-ink-400 mb-10 text-[13px]">
          Effective date: {EFFECTIVE_DATE}
        </p>
        <hr className="border-ink-200 mb-10" />

        <div className="prose-custom space-y-8 text-[15px] leading-[1.75]">
          <section>
            <p className="text-ink-600">
              Shadow AI (&quot;Shadow AI&quot;, &quot;we&quot;, &quot;us&quot;,
              or &quot;our&quot;) operates the website at{" "}
              <a href={SITE_URL} className="text-brick hover:underline">
                {SITE_URL}
              </a>{" "}
              and the Shadow AI application (collectively, the
              &quot;Service&quot;). This Privacy Policy explains how we collect,
              use, disclose, and protect information about you when you use the
              Service.
            </p>
            <p className="text-ink-600 mt-3">
              By using the Service, you agree to the collection and use of
              information as described in this policy. If you do not agree,
              please do not use the Service.
            </p>
          </section>

          {[
            {
              title: "1. Information We Collect",
              content: null,
              subsections: [
                {
                  title: "1.1 Information you provide directly",
                  items: [
                    "Account information: name, email address, and password when you create an account",
                    "Profile information: your role (e.g. PhD scholar, postdoc), research field, and use-case preferences collected during onboarding",
                    "Content you create: research questions, experiment designs, hypotheses, protocols, and reports you create in the Service",
                    "Communications: emails or messages you send to us"
                  ]
                },
                {
                  title: "1.2 Information collected automatically",
                  items: [
                    "Usage data: pages viewed, features used, buttons clicked, and time spent in the Service",
                    "Device and browser information: browser type and version, operating system, screen resolution",
                    "Log data: IP address, access times, referring URLs, and error logs",
                    "Cookies and similar technologies: we use cookies to maintain your session and remember preferences (see Section 5)"
                  ]
                },
                {
                  title: "1.3 Information from third parties",
                  items: [
                    "Google OAuth: if you sign in with Google, we receive your name, email address, and profile picture from Google",
                    "Payment processors: if you subscribe to a paid plan, payment is processed by our payment provider (RevenueCat / Stripe). We do not store your full card details",
                    "Referral codes: if you arrive via an influencer or affiliate referral, we associate your account with that referral"
                  ]
                }
              ]
            },
            {
              title: "2. How We Use Your Information",
              items: [
                "To provide and operate the Service, including running AI-powered experiment design, literature search, and protocol generation",
                "To personalise the Service based on your research field, role, and usage patterns",
                "To send service-related communications (account confirmations, security alerts, important policy updates)",
                "To send product and marketing communications where you have opted in (you can opt out at any time)",
                "To analyse usage and improve the Service",
                "To detect and prevent fraud, abuse, and security incidents",
                "To comply with legal obligations"
              ]
            },
            {
              title: "3. AI Processing of Your Content",
              paragraphs: [
                "Shadow AI uses large language models (LLMs) and other AI systems to process the research questions, problem statements, and other content you provide in order to generate experiment designs, hypotheses, and protocols.",
                "Your content is sent to AI model providers (including Microsoft Azure OpenAI Service) to generate responses. These providers process your content as a data processor on our behalf and are contractually restricted from using your content to train their models.",
                "We do not use your research content to train our own AI models without your explicit consent.",
                "You retain ownership of the content you create in the Service. By using the Service, you grant us a limited licence to process that content for the purpose of providing the Service to you."
              ]
            },
            {
              title: "4. How We Share Your Information",
              paragraphs: [
                "We do not sell your personal information. We share your information only in the following circumstances:"
              ],
              items: [
                "Service providers: we share information with third-party vendors who provide infrastructure, analytics, AI processing, and payment services on our behalf. These providers are bound by contractual data processing terms",
                "AI model providers: your content is processed by AI model providers (e.g. Microsoft Azure) as described in Section 3",
                "Analytics: we use Vercel Analytics to understand usage patterns. This data is aggregated and does not identify you individually",
                "Legal requirements: we may disclose information if required by law, court order, or to protect the rights and safety of Shadow AI, our users, or others",
                "Business transfers: if Shadow AI is acquired, merged, or its assets are transferred, your information may be transferred as part of that transaction. We will notify you before your information is subject to a materially different privacy policy",
                "With your consent: we may share your information for other purposes with your explicit consent"
              ]
            },
            {
              title: "5. Cookies",
              paragraphs: ["We use the following types of cookies:"],
              items: [
                "Essential cookies: required for the Service to function (e.g. session authentication). These cannot be disabled",
                "Preference cookies: remember your settings and preferences (e.g. theme, notification preferences)",
                "Analytics cookies: help us understand how the Service is used (via Vercel Analytics)",
                "Referral cookies: track affiliate or influencer referral codes so we can attribute signups correctly"
              ],
              trailing:
                "You can control non-essential cookies through your browser settings. Note that disabling cookies may affect Service functionality."
            },
            {
              title: "6. Data Retention",
              paragraphs: [
                "We retain your account information and content for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete or anonymise your personal information within 30 days, except where we are required to retain it for legal, compliance, or fraud-prevention purposes.",
                "Aggregated, anonymised usage data may be retained indefinitely for product improvement purposes."
              ]
            },
            {
              title: "7. Security",
              paragraphs: [
                "We implement industry-standard security measures to protect your information, including encryption in transit (TLS), encryption at rest, access controls, and regular security reviews.",
                "No method of transmission or storage is 100% secure. If you become aware of a security vulnerability or incident, please contact us immediately at " +
                  CONTACT_EMAIL +
                  "."
              ]
            },
            {
              title: "8. Your Rights",
              paragraphs: [
                "Depending on your jurisdiction, you may have the following rights regarding your personal information:"
              ],
              items: [
                "Access: request a copy of the personal information we hold about you",
                "Correction: request correction of inaccurate or incomplete information",
                "Deletion: request deletion of your personal information (subject to legal retention requirements)",
                "Portability: request your information in a structured, machine-readable format",
                "Objection: object to certain processing of your information",
                "Withdrawal of consent: where processing is based on your consent, you may withdraw it at any time"
              ],
              trailing:
                "To exercise these rights, contact us at " +
                CONTACT_EMAIL +
                ". We will respond within 30 days."
            },
            {
              title: "9. Children's Privacy",
              paragraphs: [
                "The Service is not intended for anyone under the age of 18. We do not knowingly collect personal information from children under 18. If we become aware that we have collected such information, we will delete it promptly."
              ]
            },
            {
              title: "10. International Data Transfers",
              paragraphs: [
                "Shadow AI operates globally. Your information may be transferred to and processed in countries other than the country in which you reside, including the United States. We ensure that any such transfers comply with applicable data protection law through appropriate safeguards (such as standard contractual clauses)."
              ]
            },
            {
              title: "11. Changes to This Policy",
              paragraphs: [
                "We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a prominent notice in the Service. Your continued use of the Service after the effective date of the updated policy constitutes your acceptance of the changes."
              ]
            },
            {
              title: "12. Contact Us",
              paragraphs: [
                "If you have questions about this Privacy Policy or how we handle your information, please contact us at:"
              ],
              contact: {
                email: CONTACT_EMAIL,
                address: "Shadow AI\nhello@shadowai.work"
              }
            }
          ].map(section => (
            <section key={section.title}>
              <h2 className="text-ink-900 mb-3 mt-8 text-[18px] font-bold">
                {section.title}
              </h2>
              {"paragraphs" in section &&
                section.paragraphs?.map((p, i) => (
                  <p key={i} className="text-ink-600 mb-3">
                    {p}
                  </p>
                ))}
              {"content" in section && section.content}
              {"subsections" in section &&
                section.subsections?.map(sub => (
                  <div key={sub.title} className="mb-4">
                    <h3 className="text-ink-800 mb-2 text-[14px] font-semibold">
                      {sub.title}
                    </h3>
                    <ul className="space-y-1.5 pl-1">
                      {sub.items.map((item, i) => (
                        <li
                          key={i}
                          className="text-ink-600 flex gap-2.5 text-[14px]"
                        >
                          <span className="text-brick mt-[6px] shrink-0 text-[8px]">
                            ●
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              {"items" in section && section.items && (
                <ul className="space-y-1.5 pl-1">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-ink-600 flex gap-2.5 text-[14px]"
                    >
                      <span className="text-brick mt-[6px] shrink-0 text-[8px]">
                        ●
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {"trailing" in section && section.trailing && (
                <p className="text-ink-600 mt-3 text-[14px]">
                  {section.trailing}
                </p>
              )}
              {"contact" in section && section.contact && (
                <div className="border-ink-200 mt-3 rounded-lg border bg-white p-4 text-[14px]">
                  <p className="text-ink-700">
                    Email:{" "}
                    <a
                      href={`mailto:${section.contact.email}`}
                      className="text-brick hover:underline"
                    >
                      {section.contact.email}
                    </a>
                  </p>
                  <p className="text-ink-500 mt-1 whitespace-pre-line">
                    {section.contact.address}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
