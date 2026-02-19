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

export default function PrivacyPage() {
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
                Privacy Policy
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
                <div>
                  <p>
                    TaskSpace (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the platform available at{" "}
                    <a
                      href="https://trytaskspace.com"
                      className="text-black underline hover:text-gray-700 transition-colors"
                    >
                      trytaskspace.com
                    </a>
                    . This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our Service.
                  </p>
                </div>

                {/* 1. Information We Collect */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">1. Information We Collect</h2>

                  <h3 className="text-lg font-medium text-black mt-4 mb-2">Account Data</h3>
                  <p>
                    When you create an account, we collect information such as your name, email address, organization name, and role. If you sign up using a third-party authentication provider, we receive basic profile information from that provider.
                  </p>

                  <h3 className="text-lg font-medium text-black mt-4 mb-2">Usage Data</h3>
                  <p>
                    We automatically collect information about how you interact with the Service, including pages visited, features used, actions taken, timestamps, browser type, device information, and IP address.
                  </p>

                  <h3 className="text-lg font-medium text-black mt-4 mb-2">User Content</h3>
                  <p>
                    We store the content you create within the Service, including tasks, goals, scorecard data, meeting notes, issues, and any other information you input into the platform.
                  </p>

                  <h3 className="text-lg font-medium text-black mt-4 mb-2">Cookies and Similar Technologies</h3>
                  <p>
                    We use cookies and similar tracking technologies to maintain your session, remember your preferences, and understand how the Service is used. See Section 7 below for more details.
                  </p>
                </div>

                {/* 2. How We Use Information */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">2. How We Use Information</h2>
                  <p>We use the information we collect to:</p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>Provide, maintain, and improve the Service</li>
                    <li>Authenticate users and manage accounts</li>
                    <li>Process payments and manage subscriptions</li>
                    <li>Send transactional communications (e.g., account confirmations, billing notices, security alerts)</li>
                    <li>Send product updates and announcements (you can opt out at any time)</li>
                    <li>Monitor and analyze usage trends to improve the user experience</li>
                    <li>Detect, prevent, and address technical issues, fraud, or security concerns</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>

                {/* 3. Data Sharing */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">3. Data Sharing</h2>
                  <p>
                    <strong className="text-black">We do not sell your personal information.</strong> We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>
                      <strong className="text-black">Service providers:</strong> We work with trusted third-party services for authentication, email delivery, payment processing, hosting, and analytics. These providers only access your data as necessary to perform their functions and are contractually obligated to protect it.
                    </li>
                    <li>
                      <strong className="text-black">Within your organization:</strong> Information you add to TaskSpace (such as tasks, goals, and meeting notes) is visible to other members of your organization as determined by your team&apos;s settings and permissions.
                    </li>
                    <li>
                      <strong className="text-black">Legal requirements:</strong> We may disclose information if required by law, subpoena, court order, or government request, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
                    </li>
                    <li>
                      <strong className="text-black">Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.
                    </li>
                  </ul>
                </div>

                {/* 4. Data Security */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">4. Data Security</h2>
                  <p>
                    We implement industry-standard security measures to protect your data, including encryption in transit (TLS/SSL), secure data storage, access controls, and regular security reviews. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                  </p>
                  <p className="mt-3">
                    If we become aware of a security breach that affects your personal information, we will notify you and any applicable regulatory authorities as required by law.
                  </p>
                </div>

                {/* 5. Data Retention */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">5. Data Retention</h2>
                  <p>
                    We retain your personal information for as long as your account is active or as needed to provide the Service. If you delete your account, we will delete or anonymize your personal data within 90 days, except where we are required to retain it for legal, accounting, or compliance purposes.
                  </p>
                  <p className="mt-3">
                    Aggregated, anonymized data that cannot be used to identify you may be retained indefinitely for analytics and product improvement purposes.
                  </p>
                </div>

                {/* 6. User Rights */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">6. Your Rights</h2>
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>
                      <strong className="text-black">Access:</strong> Request a copy of the personal information we hold about you
                    </li>
                    <li>
                      <strong className="text-black">Correction:</strong> Request that we correct inaccurate or incomplete personal information
                    </li>
                    <li>
                      <strong className="text-black">Deletion:</strong> Request that we delete your personal information, subject to certain legal exceptions
                    </li>
                    <li>
                      <strong className="text-black">Export:</strong> Request a portable copy of your data in a standard machine-readable format
                    </li>
                    <li>
                      <strong className="text-black">Opt out:</strong> Unsubscribe from marketing communications at any time
                    </li>
                  </ul>
                  <p className="mt-3">
                    To exercise any of these rights, contact us at{" "}
                    <a
                      href="mailto:team@trytaskspace.com"
                      className="text-black underline hover:text-gray-700 transition-colors"
                    >
                      team@trytaskspace.com
                    </a>
                    . We will respond to your request within 30 days.
                  </p>
                </div>

                {/* 7. Cookies and Tracking */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">7. Cookies and Tracking</h2>
                  <p>We use the following types of cookies:</p>
                  <ul className="list-disc pl-6 mt-3 space-y-2">
                    <li>
                      <strong className="text-black">Essential cookies:</strong> Required for the Service to function (e.g., authentication, session management). These cannot be disabled.
                    </li>
                    <li>
                      <strong className="text-black">Analytics cookies:</strong> Help us understand how users interact with the Service so we can improve it. We use privacy-respecting analytics tools.
                    </li>
                    <li>
                      <strong className="text-black">Preference cookies:</strong> Remember your settings and preferences for a better experience.
                    </li>
                  </ul>
                  <p className="mt-3">
                    You can control cookie settings through your browser. Note that disabling essential cookies may prevent the Service from functioning properly.
                  </p>
                </div>

                {/* 8. Children's Privacy */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">8. Children&apos;s Privacy</h2>
                  <p>
                    The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information promptly. If you believe a child has provided us with personal information, please contact us at{" "}
                    <a
                      href="mailto:team@trytaskspace.com"
                      className="text-black underline hover:text-gray-700 transition-colors"
                    >
                      team@trytaskspace.com
                    </a>
                    .
                  </p>
                </div>

                {/* 9. Changes to Policy */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">9. Changes to This Policy</h2>
                  <p>
                    We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or through a notice within the Service at least 30 days before the changes take effect. The &quot;Last updated&quot; date at the top of this page reflects when the policy was most recently revised.
                  </p>
                </div>

                {/* 10. Contact Information */}
                <div>
                  <h2 className="text-2xl font-semibold text-black mb-3">10. Contact Information</h2>
                  <p>
                    If you have questions or concerns about this Privacy Policy or our data practices, please contact us at{" "}
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
