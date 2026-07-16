import LegalPage, { H } from '@/components/LegalPage'

export const metadata = { title: 'Terms of Service — HONE' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="13 July 2026">
      <p>
        These terms govern your use of HONE (the &ldquo;Service&rdquo;), a
        cognitive training application operated by Appsplosh
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;), available at hone.appsplosh.com
        and app.hone.appsplosh.com. By using HONE you agree to these terms.
      </p>

      <H>1. The Service</H>
      <p>
        HONE provides structured cognitive training exercises across six skill
        areas (focus, speed, memory, logic, words, and self-control), progress
        tracking, and a composite performance metric (the &ldquo;HONE
        Score&rdquo;). A free tier is available; additional features require a
        paid subscription (&ldquo;HONE Pro&rdquo;).
      </p>

      <H>2. What HONE is — and is not</H>
      <p>
        HONE is a training and self-improvement tool. It is <strong>not</strong>{' '}
        a medical device, does not diagnose, treat, or prevent any medical
        condition, and makes no claims regarding IQ, clinical outcomes, or
        protection against cognitive decline. Performance improvements shown in
        the app reflect your performance on the app&rsquo;s exercises. If you
        have concerns about your cognitive health, consult a qualified medical
        professional.
      </p>

      <H>3. Accounts</H>
      <p>
        You can start using HONE without creating an account; progress is then
        stored on your device. Creating an account (e.g. via Google sign-in)
        lets your progress sync across devices. You are responsible for
        activity under your account. You must be at least 16 years old to use
        the Service.
      </p>

      <H>4. Subscriptions and billing</H>
      <p>
        HONE Pro is offered as a monthly subscription, an annual subscription,
        or a one-time lifetime purchase. Payments are processed by our payment
        provider acting as Merchant of Record, who handles the transaction,
        applicable taxes (including VAT), and payment security. Prices are
        shown at checkout. Subscriptions renew automatically until cancelled;
        you can cancel at any time and retain access until the end of the paid
        period. Refunds are handled per our{' '}
        <a href="/refunds" className="text-hone-green underline">Refund Policy</a>.
      </p>

      <H>5. Acceptable use</H>
      <p>
        You agree not to misuse the Service — including attempting to bypass
        payment, interfere with other users&rsquo; data, reverse-engineer,
        scrape, or use the Service in violation of applicable law.
      </p>

      <H>6. Intellectual property</H>
      <p>
        The Service, including its games, design, branding, scoring system, and
        content, is owned by Appsplosh. You receive a personal,
        non-transferable licence to use it. Your training data remains yours.
      </p>

      <H>7. Availability and changes</H>
      <p>
        We aim for high availability but do not guarantee uninterrupted
        service. We may update, add, or remove features. If we materially
        reduce what a paid plan includes, you may contact us for a
        proportionate remedy.
      </p>

      <H>8. Liability</H>
      <p>
        To the maximum extent permitted by law, the Service is provided
        &ldquo;as is&rdquo; and our total liability to you is limited to the
        amount you paid us in the 12 months before the claim. Nothing in these
        terms limits liability that cannot be limited by law, including under
        UK consumer protection law.
      </p>

      <H>9. Termination</H>
      <p>
        You may stop using the Service or delete your account at any time. We
        may suspend or terminate accounts that violate these terms.
      </p>

      <H>10. Governing law</H>
      <p>
        These terms are governed by the laws of England and Wales. Disputes are
        subject to the jurisdiction of the courts of England and Wales, without
        prejudice to mandatory consumer protections in your country of
        residence.
      </p>

      <H>11. Contact</H>
      <p>
        Appsplosh — email:{' '}
        <a href="mailto:office@appsplosh.com" className="text-hone-green underline">
          office@appsplosh.com
        </a>
      </p>
    </LegalPage>
  )
}
