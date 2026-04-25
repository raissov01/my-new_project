"use client";

import { useState } from "react";
import { Crown, Tag } from "lucide-react";

export function PromoCheckout({ baseCheckoutURL }: { baseCheckoutURL: string }) {
  const [code, setCode] = useState("");

  const checkoutURL = code.trim()
    ? `${baseCheckoutURL}&checkout[discount_code]=${encodeURIComponent(code.trim())}`
    : baseCheckoutURL;

  return (
    <div className="space-y-4">
      {/* Promo code input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Промокод (міндетті емес)"
            className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-yellow-400/40"
          />
        </div>
      </div>

      <a
        href={checkoutURL}
        className="lemonsqueezy-button inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-yellow-400 hover:bg-yellow-500 px-4 py-3 text-base font-bold text-yellow-900 transition-colors"
        rel="noopener noreferrer"
      >
        <Crown className="h-4 w-4" />
        Pro-ға жазылу
      </a>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Kaspi Gold, Visa, Mastercard, Apple Pay, Google Pay
      </p>
    </div>
  );
}
