import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-8 flex items-center justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Legal</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
            </div>
            <Link href="/product" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
              Back to product
            </Link>
          </div>

          <div className="space-y-6 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of terms</h2>
              <p>
                By creating an account or using iTapIn, you agree to these Terms of Service. If you do not agree,
                you must not access or use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. Service description</h2>
              <p>
                iTapIn provides HR, attendance, leave, payroll, employee management, and collaboration tools for
                organizations and their teams. The platform is intended to help businesses manage workforce data
                and internal operations efficiently.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Account responsibilities</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all
                activity under your account. You must provide accurate information and ensure your access is limited
                to authorized users within your organization.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Organization and admin use</h2>
              <p>
                Company administrators may create and manage employee profiles, permissions, departments, attendance
                records, and related HR workflows using the platform. Administrators must ensure their use complies
                with applicable laws and their organization’s internal policies.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Acceptable use</h2>
              <p>
                You agree not to use the platform for unlawful activity, abusive behavior, unauthorized access,
                data scraping, malicious code, or any action that interferes with the operation, security, or
                reliability of the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Data accuracy</h2>
              <p>
                You are responsible for the accuracy and timeliness of information submitted to the platform,
                including employee records, attendance data, payroll inputs, and organizational content.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. Service availability</h2>
              <p>
                We aim to provide reliable access to the service, but no system is guaranteed to be available without
                interruption. We may suspend or limit access for maintenance, security, legal compliance, or other
                operational reasons.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">8. Intellectual property</h2>
              <p>
                The iTapIn platform, branding, content, and software remain the property of iTapIn or its licensors.
                You may use the service only for authorized business purposes permitted by these terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">9. Termination</h2>
              <p>
                We may suspend or terminate access to the platform if a user violates these terms, abuses the
                service, or creates a material security or legal risk. Upon termination, access to the service may be
                discontinued, although applicable data retention obligations may still apply.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">10. Limitation of liability</h2>
              <p>
                To the maximum extent permitted by law, iTapIn is not liable for indirect, incidental, or
                consequential damages arising from your use of the service, including loss of data, business
                interruption, or inability to access the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">11. Changes to terms</h2>
              <p>
                We may revise these Terms of Service from time to time. Continued use of the platform after changes
                are posted means you accept the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">12. Contact</h2>
              <p>
                For questions about these terms, contact{' '}
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
