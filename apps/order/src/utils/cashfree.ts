interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_self' | '_modal' | '_blank';
}

interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => Promise<void>;
}

declare global {
  interface Window {
    Cashfree?: (config: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

let cashfreeSdkPromise: Promise<CashfreeInstance> | null = null;

export function loadCashfree(mode: 'sandbox' | 'production' = 'production'): Promise<CashfreeInstance> {
  if (typeof window !== 'undefined' && window.Cashfree) {
    return Promise.resolve(window.Cashfree({ mode }));
  }

  if (cashfreeSdkPromise) {
    return cashfreeSdkPromise;
  }

  cashfreeSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="cashfree.com"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Cashfree) {
          resolve(window.Cashfree({ mode }));
        } else {
          reject(new Error('Cashfree SDK object not found after load.'));
        }
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => {
      if (window.Cashfree) {
        resolve(window.Cashfree({ mode }));
      } else {
        reject(new Error('Cashfree SDK initialized without window.Cashfree'));
      }
    };
    script.onerror = () => {
      cashfreeSdkPromise = null;
      reject(new Error('Failed to load Cashfree payment script.'));
    };
    document.head.appendChild(script);
  });

  return cashfreeSdkPromise;
}

export async function launchCashfreeCheckout(paymentSessionId: string): Promise<void> {
  const cashfree = await loadCashfree('production');
  await cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_self',
  });
}
