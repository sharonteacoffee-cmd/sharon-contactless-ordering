# 04 — Demo UPI Pilot Flow & Production Payment Upgrade Architecture

---

## 1. Why This Architecture Exists
Before onboarding Razorpay or Cashfree KYC for production, the client is testing the contactless ordering flow at a real small-shop counter using their Paytm UPI QR.

### Pilot Shop UPI Details (From Client's Counter QR)
- **Payee Name (`pn`)**: `MUNISWAMY JOSHVA`
- **UPI ID (`pa`)**: `paytm.s211ne7@pty`

### Real-World Technical Constraint to Respect
- A raw `upi://pay` link **does not** trigger an automated bank webhook back to our server.
- On some Android phones, **Google Pay / PhonePe** can block or warn on browser `upi://pay` intents directed to non-PG-signed `@pty` VPAs, whereas **scanning a Dynamic QR Code** works reliably across GPay, PhonePe, Paytm, and desktop testing.
- Therefore, the Demo checkout provides **both** an **"Open UPI App"** button and a **Dynamic Scannable QR Code** generated from the exact same server-computed URI.

---

## 2. End-to-End Demo Flow (With 3-Second Notification & Counter Verification)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Mobile
    participant API as Contactless API (EC2)
    participant DB as PostgreSQL (UTC)
    actor Counter as Counter Staff KDS

    Customer->>API: POST /api/v1/Public/Order/CreatePublicOrder
    API->>DB: Compute prices server-side, insert Order (ORD2611120001 / #SH-IND-101, status: PAYMENT_PENDING)
    API-->>Customer: Return orderBusinessId, token #SH-IND-101, dynamic upiUri
    Note over Customer: Shows "Open UPI App" + Dynamic QR<br/>tn="Order SH-IND-101"

    Customer->>Customer: Pays in Paytm/GPay & returns to browser (visibilitychange / "I Have Paid")
    Note over Customer: Runs 3-second confirmation loader<br/>Displays "Payment Submitted" Notification

    Customer->>API: POST /api/v1/Public/Order/SubmitDemoPayment/:orderBusinessId
    API->>DB: Set payment_status = 'UPI_CLAIMED_DEMO' (only if outlet is DEMO_UPI_INTENT)
    API-->>Counter: Socket.io "order:new" 🔔 (Card tag: "UPI CLAIMED • Check ₹50 • Note: SH-IND-101")

    alt Mode A: Real Small Shop Test (demo_auto_verify_payment = false)
        Note over Counter: Hears Paytm Soundbox / checks GPay history for "SH-IND-101"
        Counter->>API: PATCH /api/v1/Private/Order/VerifyOrderPayment/:orderBusinessId ("Verify & Start Brewing")
        API->>DB: Set payment_status = 'PAID_VERIFIED', order_status = 'PREPARING'
        API-->>Customer: Socket.io "order:status_updated" ("Brewing in Kitchen")
    else Mode B: Boardroom Client Demo Showcase (demo_auto_verify_payment = true)
        Note over API: After 3s demo timer, emits verification event automatically
        API-->>Customer: Socket.io "order:payment_verified" ("Payment Confirmed ✅")
    end
```

### Dynamic UPI URI Specification
Generated strictly by the backend from server-calculated totals (never trust client price):
```text
upi://pay?pa=paytm.s211ne7@pty&pn=MUNISWAMY%20JOSHVA&am=50.00&cu=INR&tn=Order%20SH-IND-101&tr=SHIND101
```
- The `tn` parameter ensures **`Order SH-IND-101`** appears inside the customer's and shopkeeper's GPay/Paytm transaction history for 1-second visual/soundbox matching at the counter.

---

## 3. Security Rules for Payment States
- **Never allow frontend to set `PAID_VERIFIED`**.
- Keep statuses strictly separated:
  - `PAYMENT_PENDING`: Order created, awaiting payment.
  - `UPI_CLAIMED_DEMO`: Only allowed when outlet `payment_provider === 'DEMO_UPI_INTENT'`. Displays Counter Verification Pass on customer phone until staff approves.
  - `PAID_VERIFIED`: Only set by authenticated Counter Staff (`MD` / `OUTLET_STAFF`) in Demo mode, **OR** by a cryptographically verified HMAC Webhook from Razorpay/Cashfree in Production mode.

---

## 4. Zero-Rewrite Upgrade to Production (Razorpay / Cashfree)

Using a `PaymentStrategy` interface in `services/contactless-api/src/strategies/payment/`:
```ts
export type PaymentProvider = 'DEMO_UPI_INTENT' | 'RAZORPAY' | 'CASHFREE';
```
When moving to production:
1. Add Razorpay/Cashfree API Key ID, Secret, and Webhook Secret to backend `.env`.
2. Switch outlet setting `payment_provider` from `'DEMO_UPI_INTENT'` to `'RAZORPAY'` or `'CASHFREE'`.
3. Same customer "Pay" flow now opens Razorpay/Cashfree UPI checkout; verified bank webhook at `POST /api/v1/Public/Webhook/PaymentCallback/:provider` sets `PAID_VERIFIED` and triggers KDS 🔔 automatically without manual counter verification.
