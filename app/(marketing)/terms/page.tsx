"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function TermsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-white pt-20">
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center mb-16"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-white text-gray-600 border-gray-200 mb-6">
                  Legal
                </Badge>
              </motion.div>
              <motion.h1
                variants={fadeInUp}
                className="text-5xl font-bold text-black mb-6"
              >
                Terms of Service
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-sm text-gray-400"
              >
                Last updated: February 18, 2026
              </motion.p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="prose prose-lg max-w-none"
            >
              <motion.div variants={fadeInUp} className="space-y-8 text-gray-600">
                {/* 1. Acceptance of Terms */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">1. Acceptance of Terms</h2>
                  <p>
                    By accessing or using TaskSpace (&quot;Service&quot;), available at{" "}
                    <a
                      href="https://trytaskspace.com"
                      className="text-black underline hover:text-gray-700 transition-colors"
                    >
                      trytaskspace.com
                    </a>
                    , you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. These Terms constitute a legally binding agreement between you and TaskSpace.
                  </p>
                  <p className="mt-3">
                    If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
                  </p>
                </div>

                {/* 2. Description of Service */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">2. Description of Service</h2>
                  <p>
                    TaskSpace is a team management and accountability platform designed to help teams track goals, manage tasks, run structured meetings, and maintain organizational alignment. The Service includes features such as scorecards, to-do management, issue tracking, meeting facilitation, and reporting tools.
                  </p>
                  <p className="mt-3">
                    We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice to users.
                  </p>
                </div>

                {/* 3. User Accounts and Registration */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">3. User Accounts and Registration</h2>
                  <p>
                    To use the Service, you must create an account and provide accurate, complete information. You are responsible for:
                  </p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activity that occurs under your account</li>
                    <li>Notifying us immediately of any unauthorized use of your account</li>
                    <li>Ensuring that your account information remains current and accurate</li>
                  </ul>
                  <p className="mt-3">
                    You must be at least 18 years of age to create an account. We reserve the right to suspend or terminate accounts that violate these Terms.
                  </p>
                </div>

                {/* 4. Acceptable Use Policy */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">4. Acceptable Use Policy</h2>
                  <p>You agree not to:</p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                    <li>Attempt to gain unauthorized access to the Service or its related systems</li>
                    <li>Interfere with or disrupt the integrity or performance of the Service</li>
                    <li>Upload or transmit viruses, malware, or other harmful code</li>
                    <li>Use the Service to send spam or unsolicited communications</li>
                    <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                    <li>Resell, sublicense, or redistribute access to the Service without our written consent</li>
                  </ul>
                </div>

                {/* 5. Intellectual Property */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">5. Intellectual Property</h2>
                  <p>
                    The Service, including its design, features, code, and content, is owned by TaskSpace and protected by intellectual property laws. You retain ownership of all data and content you submit to the Service (&quot;User Content&quot;).
                  </p>
                  <p className="mt-3">
                    By using the Service, you grant TaskSpace a limited, non-exclusive license to use your User Content solely for the purpose of providing and improving the Service. We will not use your User Content for any other purpose without your consent.
                  </p>
                </div>

                {/* 6. Payment Terms */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">6. Payment Terms</h2>
                  <p>
                    Certain features of the Service require a paid subscription. By subscribing to a paid plan, you agree to the following:
                  </p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>Subscription fees are billed in advance on a recurring basis (monthly or annually, depending on your selected plan)</li>
                    <li>All fees are non-refundable except as required by law or as explicitly stated in these Terms</li>
                    <li>We may change subscription pricing with at least 30 days&apos; notice before the start of your next billing cycle</li>
                    <li>You are responsible for providing valid and current payment information</li>
                    <li>Failure to pay may result in suspension or termination of your access to paid features</li>
                  </ul>
                  <p className="mt-3">
                    Free plans or trial periods may be offered at our discretion and may be modified or discontinued at any time.
                  </p>
                </div>

                {/* 7. Data Privacy */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">7. Data Privacy</h2>
                  <p>
                    Your use of the Service is also governed by our{" "}
                    <a
                      href="/privacy"
                      className="text-black underline hover:text-gray-700 transition-colors"
                    >
                      Privacy Policy
                    </a>
                    , which describes how we collect, use, and protect your personal information. By using the Service, you consent to the data practices described in our Privacy Policy.
                  </p>
                </div>

                {/* 8. Termination */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">8. Termination</h2>
                  <p>
                    You may terminate your account at any time by contacting us or using the account settings within the Service. We may terminate or suspend your account if you violate these Terms or for any other reason with reasonable notice.
                  </p>
                  <p className="mt-3">
                    Upon termination, your right to use the Service will cease immediately. We will make your data available for export for a reasonable period (at least 30 days) following termination, after which we may delete your data in accordance with our Privacy Policy.
                  </p>
                </div>

                {/* 9. Limitation of Liability */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">9. Limitation of Liability</h2>
                  <p>
                    To the maximum extent permitted by law, TaskSpace and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising out of or related to your use of the Service.
                  </p>
                  <p className="mt-3">
                    Our total liability for any claim arising out of or related to these Terms or the Service shall not exceed the amount you paid to TaskSpace in the twelve (12) months preceding the claim.
                  </p>
                  <p className="mt-3">
                    The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
                  </p>
                </div>

                {/* 10. Changes to Terms */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">10. Changes to Terms</h2>
                  <p>
                    We may update these Terms from time to time. When we make material changes, we will notify you by email or through a notice within the Service at least 30 days before the changes take effect. Your continued use of the Service after changes become effective constitutes acceptance of the updated Terms.
                  </p>
                </div>

                {/* 11. Contact Information */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">11. Contact Information</h2>
                  <p>
                    If you have questions about these Terms of Service, please contact us at{" "}
                    <a
                      href="mailto:team@trytaskspace.com"
                      className="text-black underline hover:text-gray-700 transition-colors"
                    >
                      team@trytaskspace.com
                    </a>
                    .
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
