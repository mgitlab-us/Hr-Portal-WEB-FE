import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Legal</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
            </div>
            <Link href="/product" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
              Back to product
            </Link>
          </div>

          <div className="space-y-6 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Overview</h2>
              <p>
                iTapIn (“we”, “our”, or “us”) is committed to protecting the privacy of employees, administrators,
                and organizations using our HR platform. This Privacy Policy explains what information we collect,
                how we use it, and the choices available to you.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. Information we collect</h2>
              <p>We may collect information such as:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Account details such as name, email address, phone number, and job title.</li>
                <li>Company profile information, departments, locations, and employee records.</li>
                <li>Attendance, leave, payroll, documents, and other HR-related data relevant to your organization.</li>
                <li>Device, browser, IP address, usage data, and activity logs needed to secure and improve the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. How we use your information</h2>
              <p>
                We use personal and organizational data to provide the platform, manage access and permissions,
                process attendance and leave requests, generate reports, support employees, and improve product
                reliability and security. We may also use information to communicate operational updates, security
                notices, and service-related messages.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Data storage and security</h2>
              <p>
                We store HR data in secure systems and apply appropriate administrative, technical, and physical
                safeguards. Access is restricted based on role and company permissions, and sensitive data is only
                disclosed to authorized users when necessary for their job functions.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Sharing of information</h2>
              <p>
                We do not sell personal data. We may share information with trusted service providers that help us
                operate the platform, maintain infrastructure, or provide support, subject to confidentiality
                obligations. We may also disclose information when required by law or necessary to protect legal
                rights, security, and user safety.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Your rights</h2>
              <p>
                Depending on your jurisdiction, you may have the right to access, correct, export, delete, or
                restrict the processing of your personal information. If you believe your data is inaccurate or no
                longer needed, you may contact us using the details below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. Retention</h2>
              <p>
                We retain data only as long as necessary to fulfill business, legal, and regulatory obligations.
                When data is no longer needed, we delete or anonymize it in a reasonable and secure manner.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">8. Cookies and analytics</h2>
              <p>
                We may use cookies or similar technologies to remember login sessions, improve platform
                performance, and understand product usage patterns. You may manage cookie settings in your browser,
                although some core features may not function properly if cookies are disabled.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">9. Changes to this policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect legal, product, or operational
                changes. Continued use of the platform after updates are posted indicates acceptance of the revised
                policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">10. Contact</h2>
              <p>
                For privacy questions, requests, or concerns, please contact us at{' '}
                <a href="mailto:hello@itapin.com" className="font-medium text-blue-600 underline underline-offset-2">
                  hello@itapin.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
