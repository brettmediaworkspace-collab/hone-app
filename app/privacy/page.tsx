import LegalPage, { H } from '@/components/LegalPage'

export const metadata = { title: 'Privacy Policy — HONE' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="13 July 2026">
      <p>
        This policy explains what data HONE collects, why, and your rights.
        HONE is operated by Appsplosh, based in the United Kingdom. We keep
        data collection deliberately minimal.
      </p>

      <H>1. What we collect</H>
      <p><strong>Without an account:</strong> your training data (scores,
        session results, streaks, preferences) is stored locally on your
        device and, linked to an anonymous identifier, in our database so the
        app functions. No name or email is collected.</p>
      <p><strong>With an account (Google sign-in):</strong> we additionally
        receive your name and email address from Google, used solely to
        identify your account and sync your progress across devices.</p>
      <p><strong>Payments:</strong> handled entirely by our payment provider
        acting as Merchant of Record. We never see or store your card details.
        We receive confirmation of your subscription status only.</p>

      <H>2. What we don&rsquo;t do</H>
      <p>
        We do not sell your data. We do not share your training data with
        advertisers. We do not use your cognitive performance data for any
        purpose other than showing you your own progress.
      </p>

      <H>3. Where data lives</H>
      <p>
        Training data and account data are stored in Google Firebase
        (Firestore), with industry-standard encryption in transit and at rest.
        Local data is stored in your browser&rsquo;s storage on your device.
      </p>

      <H>4. Legal basis (UK/EU GDPR)</H>
      <p>
        We process account and training data to perform our contract with you
        (providing the Service), and subscription data to meet legal and
        accounting obligations. Anonymous usage of the free tier relies on
        legitimate interest in operating the Service.
      </p>

      <H>5. Retention and deletion</H>
      <p>
        Data is retained while your account is active. You can request
        deletion of your account and all associated data at any time by
        emailing us; we complete deletion within 30 days. Clearing your
        browser data removes local-only progress immediately.
      </p>

      <H>6. Your rights</H>
      <p>
        Under UK/EU data protection law you may request access to, correction
        of, export of, or deletion of your personal data, and you may complain
        to the ICO (UK) or your local supervisory authority.
      </p>

      <H>7. Cookies and tracking</H>
      <p>
        The app uses only functional storage (authentication state and your
        training data). No third-party advertising cookies or cross-site
        trackers are used within the app.
      </p>

      <H>8. Children</H>
      <p>The Service is not directed at children under 16.</p>

      <H>9. Changes</H>
      <p>
        We will update this page when our practices change and revise the date
        above. Material changes will be flagged in the app.
      </p>

      <H>10. Contact</H>
      <p>
        Data controller: Appsplosh —{' '}
        <a href="mailto:office@appsplosh.com" className="text-hone-green underline">
          office@appsplosh.com
        </a>
      </p>
    </LegalPage>
  )
}
