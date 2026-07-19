import React from 'react';

/**
 * Formats coupon codes with unified luxury typography using OpenType lining figures (lnum).
 * Ensures numbers (e.g. 101 in WELCOME101) stand full-height on the baseline matching capital letters,
 * maintaining seamless font family, weight, and stroke harmony across the entire code.
 */
export function renderFormattedCouponCode(code) {
  if (!code) return null;
  return (
    <span
      className="font-heading uppercase tracking-wider inline-block"
      style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontVariantNumeric: 'lining-nums proportional-nums',
        fontFeatureSettings: '"lnum" 1, "pnum" 1',
        letterSpacing: '0.08em'
      }}
    >
      {code}
    </span>
  );
}
