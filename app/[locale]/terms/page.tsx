import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Shadow AI terms of service - the terms governing your use of the Shadow AI experiment design platform.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true }
}

const EFFECTIVE_DATE = "1 June 2025"
const CONTACT_EMAIL = "legal@shadowai.work"

export default function TermsPage() {
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
            href="/privacy"
            className="text-ink-400 hover:text-ink-700 text-[13px] transition-colors"
          >
            Privacy Policy →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-[760px] px-6 py-12">
        <p className="text-brick mb-2 text-[11px] font-bold uppercase tracking-[0.14em]">
          Legal
        </p>
        <h1 className="text-ink-900 mb-2 text-[32px] font-extrabold tracking-tight">
          Terms of Service
        </h1>
        <p className="text-ink-400 mb-10 text-[13px]">
          Effective date: {EFFECTIVE_DATE}
        </p>
        <hr className="border-ink-200 mb-10" />

        <div className="space-y-8 text-[15px] leading-[1.75]">
          <section>
            <p className="text-ink-600">
              These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of Shadow AI&apos;s website and application (the
              &quot;Service&quot;), operated by Shadow AI (&quot;Shadow
              AI&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
              Please read these Terms carefully before using the Service.
            </p>
            <p className="text-ink-600 mt-3">
              By creating an account or using the Service, you agree to be bound
              by these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          {[
            {
              title: "1. Eligibility",
              paragraphs: [
                "You must be at least 18 years old to use the Service. By using the Service, you represent that you meet this requirement.",
                "If you are using the Service on behalf of an organisation, you represent that you have authority to bind that organisation to these Terms."
              ]
            },
            {
              title: "2. Account Registration",
              items: [
                "You must provide accurate, current, and complete information when creating an account",
                "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account",
                "You must notify us immediately if you become aware of any unauthorised use of your account",
                "You may not create more than one account per person or share your account with others"
              ]
            },
            {
              title: "3. The Service",
              paragraphs: [
                "Shadow AI provides an AI-powered platform for experiment design, hypothesis generation, literature synthesis, protocol creation, and lab report generation, primarily for life sciences researchers.",
                "The Service uses artificial intelligence to process your inputs and generate outputs. AI-generated content may contain errors, omissions, or inaccuracies. All AI-generated content (experiment designs, protocols, hypotheses, reports) must be reviewed and validated by a qualified scientist before use in any research or clinical context.",
                "Shadow AI does not provide medical advice, clinical guidance, or regulatory submissions. The Service is a research productivity tool, not a substitute for professional scientific judgment."
              ]
            },
            {
              title: "4. Acceptable Use",
              paragraphs: [
                "You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:"
              ],
              items: [
                "Use the Service to design, develop, or produce weapons, bioweapons, or other materials capable of causing harm to persons",
                "Attempt to reverse-engineer, decompile, or extract the underlying AI models or proprietary systems of the Service",
                "Use the Service to generate content that is defamatory, fraudulent, or violates the intellectual property rights of others",
                "Attempt to gain unauthorised access to any part of the Service or its infrastructure",
                "Use automated means to access or scrape the Service without our written permission",
                "Resell, sublicense, or otherwise commercialise access to the Service without our written agreement",
                "Violate any applicable law or regulation in your use of the Service"
              ]
            },
            {
              title: "5. Your Content",
              paragraphs: [
                "You retain ownership of the research questions, designs, protocols, and other content you create using the Service (&quot;Your Content&quot;).",
                "By using the Service, you grant Shadow AI a limited, non-exclusive, royalty-free licence to process Your Content for the sole purpose of providing the Service to you.",
                "You represent that You Content does not violate any third-party intellectual property rights, confidentiality obligations, or applicable law.",
                "We do not use Your Content to train AI models without your explicit consent."
              ]
            },
            {
              title: "6. AI-Generated Output",
              paragraphs: [
                "Outputs generated by the Service (&quot;AI Outputs&quot;) are provided for informational and productivity purposes only. AI Outputs are not a substitute for professional scientific expertise.",
                "You are solely responsible for reviewing, validating, and taking responsibility for any AI Outputs you use in your research. Shadow AI makes no warranty that AI Outputs are accurate, complete, or fit for any particular scientific purpose.",
                "Shadow AI does not claim copyright in AI Outputs. You may use AI Outputs subject to applicable law and the terms of this agreement."
              ]
            },
            {
              title: "7. Intellectual Property",
              paragraphs: [
                "The Service, including its software, design, trademarks, and underlying technology, is owned by Shadow AI and protected by intellectual property laws. These Terms do not transfer any ownership rights in the Service to you.",
                "Shadow AI, the Shadow AI logo, and related marks are trademarks of Shadow AI. You may not use our trademarks without our prior written consent."
              ]
            },
            {
              title: "8. Subscription and Payment",
              paragraphs: [
                "Shadow AI offers a free tier and paid subscription plans. Details of current plans and pricing are available at www.shadowai.work/pricing.",
                "Paid subscriptions are billed in advance on a monthly or annual basis. All fees are non-refundable except where required by applicable law or as expressly stated in these Terms.",
                "We reserve the right to change pricing with 30 days' notice. Your continued use of the Service after the effective date of a pricing change constitutes your acceptance of the new pricing.",
                "If a payment fails, we may suspend your access to paid features until the outstanding amount is settled."
              ]
            },
            {
              title: "9. Disclaimers",
              paragraphs: [
                'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.',
                "SHADOW AI DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. AI-GENERATED CONTENT MAY CONTAIN ERRORS AND IS NOT VERIFIED BY SHADOW AI.",
                "YOU USE THE SERVICE AT YOUR OWN RISK. ANY RELIANCE ON AI OUTPUTS FOR RESEARCH, CLINICAL, OR REGULATORY PURPOSES IS SOLELY YOUR RESPONSIBILITY."
              ]
            },
            {
              title: "10. Limitation of Liability",
              paragraphs: [
                "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SHADOW AI AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOST PROFITS, OR RESEARCH RESULTS, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.",
                "SHADOW AI'S TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID TO SHADOW AI IN THE THREE MONTHS PRECEDING THE CLAIM, OR USD $100, WHICHEVER IS GREATER."
              ]
            },
            {
              title: "11. Indemnification",
              paragraphs: [
                "You agree to indemnify, defend, and hold harmless Shadow AI and its officers, directors, employees, and agents from any claims, liabilities, damages, costs, and expenses (including reasonable legal fees) arising from your use of the Service, Your Content, or your violation of these Terms."
              ]
            },
            {
              title: "12. Term and Termination",
              paragraphs: [
                "These Terms are effective from the date you first access the Service and remain in effect until terminated.",
                "You may terminate your account at any time by deleting it through the Service settings. Shadow AI may suspend or terminate your account if you violate these Terms, with or without notice.",
                "Upon termination, your right to use the Service ceases immediately. Sections that by their nature should survive termination (including Sections 5, 7, 9, 10, 11, and 14) will survive."
              ]
            },
            {
              title: "13. Changes to These Terms",
              paragraphs: [
                "We may update these Terms from time to time. We will notify you of material changes by email or prominent notice in the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes your acceptance of the updated Terms."
              ]
            },
            {
              title: "14. Governing Law and Disputes",
              paragraphs: [
                "These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict-of-law principles.",
                "Any dispute arising from these Terms or the Service will first be subject to good-faith negotiation. If not resolved within 30 days, disputes will be resolved by binding arbitration under the rules of the American Arbitration Association, conducted in English.",
                "You waive any right to participate in a class action or class-wide arbitration."
              ]
            },
            {
              title: "15. Contact",
              paragraphs: ["For questions about these Terms, contact us at:"],
              contact: { email: CONTACT_EMAIL }
            }
          ].map(section => (
            <section key={section.title}>
              <h2 className="text-ink-900 mb-3 mt-8 text-[18px] font-bold">
                {section.title}
              </h2>
              {"paragraphs" in section &&
                section.paragraphs?.map((p, i) => (
                  <p
                    key={i}
                    className="text-ink-600 mb-3"
                    dangerouslySetInnerHTML={{ __html: p }}
                  />
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
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
