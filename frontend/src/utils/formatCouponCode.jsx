import React from 'react';

/**
 * Renders coupon codes with hybrid luxury typography:
 * Letters in elegant serif (Cormorant Garamond) and digits in crisp sans-serif (Outfit SemiBold)
 * to prevent display serif old-style figures from appearing misaligned or subscript.
 */
export function renderFormattedCouponCode(code) {
  if (!code) return null;
  const parts = String(code).match(/([A-Za-z]+|\d+|[^A-Za-z0-9]+)/g) || [String(code)];
  return parts.map((part, index) => {
    if (/^\d+$/.test(part)) {
      return (
        <span
          key={index}
          className="font-body font-semibold inline-block"
          style={{
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: '0.04em'
          }}
        >
          {part}
        </span>
      );
    }
    return (
      <span
        key={index}
        className="font-heading"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          letterSpacing: '0.08em'
        }}
      >
        {part}
      </span>
    );
  });
}
