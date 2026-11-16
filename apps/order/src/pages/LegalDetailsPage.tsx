import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, CheckCircle2, Mail, MapPin, Phone, ShieldCheck, UserCheck } from 'lucide-react';
import { SharonLogo } from '@/components/common/SharonLogo';
import { CustomerLayout } from '@/layouts/CustomerLayout';

export function LegalDetailsPage() {
  return (
    <CustomerLayout maxWidthClass="max-w-2xl">
      {/* Top Header */}
      <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3 pb-2">
        <div className="glass-light rounded-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              aria-label="Back to home"
              className="w-9 h-9 rounded-full bg-white/90 border border-brand-border flex items-center justify-center text-brand-black hover:bg-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-brand-forest truncate">
                Legal &amp; Merchant Information
              </h1>
              <p className="text-xs text-brand-muted truncate">
                SHARON TEA STALL &bull; Compliance &amp; Policies
              </p>
            </div>
          </div>
          <SharonLogo size="sm" variant="badge" className="rounded-full shadow-xs shrink-0" />
        </div>
      </header>

      <main className="flex-1 px-3 sm:px-4 pt-2 pb-16 space-y-5">
        {/* Merchant Identification Card (Matches Cashfree KYC 100%) */}
        <section className="glass-light rounded-3xl p-5 sm:p-6 space-y-4 border border-brand-border/80">
          <div className="flex items-center gap-2 text-brand-forest">
            <Building2 className="w-5 h-5 shrink-0" />
            <h2 className="font-display text-lg font-bold text-brand-black">
              Official Business &amp; Merchant Details
            </h2>
          </div>

          <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-brand-border/60 divide-y divide-brand-border/40 text-xs">
            <div className="py-2.5 first:pt-0 flex items-start justify-between gap-2">
              <span className="text-brand-muted font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-forest" />
                Legal Trade Name:
              </span>
              <strong className="text-brand-black font-bold uppercase text-right">
                SHARON TEA STALL
              </strong>
            </div>

            <div className="py-2.5 flex items-start justify-between gap-2">
              <span className="text-brand-muted font-medium flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-forest" />
                Authorized Signatory / Proprietor:
              </span>
              <strong className="text-brand-black font-bold uppercase text-right">
                MUNISWAMY JOSHVA
              </strong>
            </div>

            <div className="py-2.5 flex items-start justify-between gap-2">
              <span className="text-brand-muted font-medium">Brand Operating As:</span>
              <span className="text-brand-black font-semibold text-right">
                Sharon Tea &amp; Coffee
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-brand-muted font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-forest" />
                Registered Phone / Support:
              </span>
              <a href="tel:+919380835651" className="text-brand-forest font-bold hover:underline text-right">
                +91 93808 35651
              </a>
            </div>

            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-brand-muted font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-brand-forest" />
                Registered Official Email:
              </span>
              <a href="mailto:sharonteacoffee@gmail.com" className="text-brand-forest font-semibold hover:underline text-right">
                sharonteacoffee@gmail.com
              </a>
            </div>

            <div className="py-2.5 last:pb-0 flex items-start justify-between gap-2">
              <span className="text-brand-muted font-medium flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-forest shrink-0 mt-0.5" />
                Registered &amp; Operating Address:
              </span>
              <span className="text-brand-black text-right max-w-xs font-medium">
                #34, 2nd Main Road, 1st Stage, Indiranagar, Bangalore - 560038, Karnataka, India
              </span>
            </div>
          </div>
        </section>

        {/* Refund & Cancellation Policy */}
        <section className="glass-light rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-brand-forest">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <h2 className="font-display text-base font-bold text-brand-black">
              Refund &amp; Cancellation Policy
            </h2>
          </div>
          <div className="text-xs text-brand-muted leading-relaxed space-y-2">
            <p>
              <strong>1. Fresh Beverage Preparation:</strong> Because beverages (Irani Chai, South Indian Filter Coffee) and snacks are fresh and prepared immediately upon order confirmation at the counter, orders cannot be cancelled once brewing has started.
            </p>
            <p>
              <strong>2. Failed or Duplicate UPI Transactions:</strong> If money is debited from your bank account but the order is not generated due to network failure, the full transaction amount will be automatically refunded back to your original payment source (bank / UPI ID) within <strong>24 to 48 business hours</strong>.
            </p>
            <p>
              <strong>3. Quality Guarantee:</strong> If an item served does not meet our quality standards, counter staff will replace the item immediately or issue a full refund upon reporting at the counter. For any payment disputes, contact <strong>sharonteacoffee@gmail.com</strong> or call <strong>+91 93808 35651</strong>.
            </p>
          </div>
        </section>

        {/* Terms of Service & Fulfillment */}
        <section className="glass-light rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-brand-forest">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <h2 className="font-display text-base font-bold text-brand-black">
              Terms of Service &amp; Pickup Fulfillment
            </h2>
          </div>
          <div className="text-xs text-brand-muted leading-relaxed space-y-2">
            <p>
              <strong>1. Contactless Counter Pickup:</strong> Orders placed on <code>order.sharonteastall.com</code> are fulfilled directly for counter pickup at our physical Sharon branches. Customers are notified on their screen when their order token is "Ready for Pickup" (estimated preparation time: 3–7 minutes).
            </p>
            <p>
              <strong>2. Prices &amp; Taxes:</strong> All item prices are displayed in Indian Rupees (INR ₹) inclusive of applicable taxes. Pricing is set directly by <strong>SHARON TEA STALL</strong>.
            </p>
            <p>
              <strong>3. Privacy &amp; Customer Data:</strong> Customer phone numbers and names collected during ordering are used solely for order notifications and token callouts. We never sell or share customer data with third parties.
            </p>
          </div>
        </section>
      </main>
    </CustomerLayout>
  );
}
