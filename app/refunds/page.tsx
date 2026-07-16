import LegalPage, { H } from '@/components/LegalPage'

export const metadata = { title: 'Refund Policy — HONE' }

export default function RefundsPage() {
  return (
    <LegalPage title="Refund Policy" updated="13 July 2026">
      <p>
        We want you to pay for HONE Pro only if it&rsquo;s genuinely working
        for you. That&rsquo;s why the core experience — including your baseline
        assessment and daily training on free muscle groups — costs nothing,
        and why subscriptions come with a free trial before any charge.
      </p>

      <H>1. Free trials</H>
      <p>
        Monthly and annual subscriptions include a free trial (as shown at
        checkout). Cancel during the trial and you pay nothing. We recommend
        using the trial to confirm HONE fits your routine before the first
        charge.
      </p>

      <H>2. 14-day refund guarantee</H>
      <p>
        If you&rsquo;re unhappy with a purchase, contact us within 14 days of
        the charge and we will refund it in full — subscriptions and lifetime
        purchases alike. This mirrors your statutory rights under UK and EU
        consumer law.
      </p>

      <H>3. Subscription cancellations</H>
      <p>
        You can cancel any time from the payment provider&rsquo;s customer
        portal (linked in your purchase receipt email). Cancelling stops future
        charges; you keep Pro access until the end of the period you&rsquo;ve
        already paid for. No partial-period refunds are issued after the 14-day
        window, but you lose nothing you&rsquo;ve paid for.
      </p>

      <H>4. Renewal charges</H>
      <p>
        Renewals are charged automatically. If you forgot to cancel and
        contact us within 14 days of an unwanted renewal, we&rsquo;ll refund
        it. Reminder emails for annual renewals are sent by our payment
        provider in advance where required by law.
      </p>

      <H>5. How to request a refund</H>
      <p>
        Email{' '}
        <a href="mailto:office@appsplosh.com" className="text-hone-green underline">
          office@appsplosh.com
        </a>{' '}
        with the email address used at checkout (or your receipt). Refunds are
        processed by our payment provider back to your original payment method,
        typically within 5–10 business days. You can also request refunds
        directly through the payment provider&rsquo;s support where offered.
      </p>

      <H>6. Abuse</H>
      <p>
        We reserve the right to refuse refunds in cases of demonstrable abuse
        (e.g. repeated purchase-and-refund cycles), except where a refund is
        required by law.
      </p>
    </LegalPage>
  )
}
