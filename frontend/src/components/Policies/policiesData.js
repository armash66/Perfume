import {
  ShieldCheckIcon,
  UsersIcon,
  TruckIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  LockClosedIcon,
} from './Icons';

const policiesData = [
  {
    id: 'authenticity',
    icon: ShieldCheckIcon,
    title: 'Authenticity & Sourcing',
    tagline: 'Every drop, verified.',
    sections: [
      {
        heading: 'Our Sourcing Promise',
        content:
          'Every fragrance at Decant Atelier is sourced exclusively from verified, authorized retailers, brand boutiques, and official distributors. We never procure from grey-market channels, unverified resellers, or bulk-discount suppliers.',
      },
      {
        heading: 'Batch Verification',
        content:
          'Each bottle that enters our decanting studio is batch-checked against the manufacturer\'s records. We verify batch codes, packaging integrity, and scent profile before a single drop is decanted.',
      },
      {
        heading: 'Decanting Process',
        content:
          'Our decants are hand-filled in a controlled, sanitized environment using sterile glass pipettes and medical-grade syringes. Cross-contamination is eliminated by using dedicated tools for each fragrance. Atomizers are leak-tested and sealed with tamper-evident closures.',
      },
      {
        heading: 'What You Receive',
        content:
          'Every order ships with a clearly labelled vial stating the fragrance name, concentration (EDP/EDT/Parfum), volume, and batch reference. Our packaging is our own — we do not replicate or imitate any brand\'s official packaging.',
      },
      {
        heading: 'Transparency Guarantee',
        content:
          'If you ever have questions about the authenticity of a fragrance, reach out to us. We are happy to share sourcing documentation, batch details, and decanting records for any product in our catalogue.',
      },
    ],
  },
  {
    id: 'about',
    icon: UsersIcon,
    title: 'About Us',
    tagline: 'The story behind the scent.',
    sections: [
      {
        heading: 'Who We Are',
        content:
          'Decant Atelier is an independent perfume decanting service based in India. We believe that exploring the world\'s finest fragrances shouldn\'t require committing to a full bottle. Our mission is to make niche and luxury scents accessible through hand-poured trial sizes — fairly priced, beautifully presented, and 100% genuine.',
      },
      {
        heading: 'Why Decants?',
        content:
          'A 100ml bottle of a luxury fragrance can cost anywhere from ₹5,000 to ₹50,000. That\'s a significant commitment for a scent you\'ve never worn. Our 5ml, 8ml, and 10ml decants let you experience a fragrance for days or weeks before deciding. No buyer\'s remorse, no shelf of regrets.',
      },
      {
        heading: 'Our Philosophy',
        content:
          'Fair pricing is at our core. If a 100ml bottle retails at ₹5,000, a 10ml decant should logically cost ₹500 — not ₹700 or ₹800 as commonly marked up elsewhere. We apply a transparent, proportional pricing model with minimal margins.',
      },
      {
        heading: 'Craftsmanship',
        content:
          'Every decant is hand-filled, labelled, and sealed in our studio. We use premium glass atomizer vials, high-quality crimp-seal closures, and minimal, elegant labelling. Each order is carefully packed to survive transit without leaks or damage.',
      },
    ],
  },
  {
    id: 'shipping',
    icon: TruckIcon,
    title: 'Shipping Policy',
    tagline: 'From our studio to your door.',
    sections: [
      {
        heading: 'Processing Time',
        content:
          'Orders are processed within 1–2 business days. During sale periods or new launches, processing may take up to 3 business days. You will receive a confirmation email with tracking details once your order ships.',
      },
      {
        heading: 'Domestic Shipping (India)',
        content:
          'We ship pan-India via trusted courier partners. Standard delivery takes 4–7 business days depending on your location. Metro cities typically receive orders within 3–5 business days. Shipping charges are calculated at checkout based on order weight and destination.',
      },
      {
        heading: 'Standard Delivery Rate',
        content:
          'Standard Atelier Delivery is available pan-India at a flat rate of ₹100.',
      },
      {
        heading: 'Packaging Standards',
        content:
          'All decants are sealed with tamper-proof closures, wrapped individually, and placed in cushioned, leak-proof packaging. We take extra care to ensure your fragrances arrive in perfect condition.',
      },
      {
        heading: 'Order Tracking',
        content:
          'Once dispatched, you\'ll receive a tracking link via email and WhatsApp. You can also track your order through the "Track Order" section on our website.',
      },
    ],
  },
  {
    id: 'returns',
    icon: ArrowPathIcon,
    title: 'Return Policy',
    tagline: 'Your confidence, our commitment.',
    sections: [
      {
        heading: 'Return Eligibility',
        content:
          'Due to the intimate nature of fragrances and hygiene considerations, we do not accept returns on opened or used decants. Returns are accepted only if the product arrives damaged, leaking, or is incorrect.',
      },
      {
        heading: 'Damaged or Incorrect Orders',
        content:
          'If your order arrives damaged, leaking, or you received the wrong fragrance, please contact us within 48 hours of delivery with photographs of the damage and your order details. We will arrange a replacement or full refund at no additional cost.',
      },
      {
        heading: 'Refund Process',
        content:
          'Approved refunds are processed within 5–7 business days to the original payment method. For UPI and bank transfers, the refund may take an additional 2–3 business days to reflect in your account.',
      },
      {
        heading: 'Cancellations',
        content:
          'Orders can be cancelled within 6 hours of placement, provided they have not already been dispatched. To cancel, contact us immediately via email or WhatsApp with your order number.',
      },
    ],
  },
  {
    id: 'terms',
    icon: DocumentTextIcon,
    title: 'Terms & Conditions',
    tagline: 'The fine print, made clear.',
    sections: [
      {
        heading: 'General',
        content:
          'By placing an order with Decant Atelier, you agree to these Terms & Conditions. We reserve the right to update these terms at any time. Continued use of our services after changes constitutes acceptance of the revised terms.',
      },
      {
        heading: 'Products & Pricing',
        content:
          'All products listed are decanted portions from original, full-sized bottles. Prices are listed in Indian Rupees (₹) and are inclusive of applicable taxes. We reserve the right to modify prices without prior notice. Prices at the time of order placement will be honored.',
      },
      {
        heading: 'Intellectual Property',
        content:
          'All brand names, fragrance names, and trademarks referenced on our website are the property of their respective owners. Decant Atelier is not affiliated with, endorsed by, or sponsored by any of the brands listed. References are used solely to identify the original fragrance.',
      },
      {
        heading: 'Limitation of Liability',
        content:
          'Decant Atelier\'s total liability for any claim arising from a purchase shall not exceed the amount paid for the specific product in question. We are not liable for allergic reactions, skin sensitivities, or misuse of products.',
      },
      {
        heading: 'Governing Law',
        content:
          'These terms are governed by the laws of India. Any disputes arising from your use of our services will be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: LockClosedIcon,
    title: 'Privacy Policy',
    tagline: 'Your data, safeguarded.',
    sections: [
      {
        heading: 'Information We Collect',
        content:
          'We collect personal information necessary to process your orders: name, email address, phone number, shipping address, and payment details. We may also collect browsing data through cookies to improve your shopping experience.',
      },
      {
        heading: 'How We Use Your Data',
        content:
          'Your information is used exclusively for order processing, shipping, customer support, and sending order updates. We do not sell, rent, or share your personal data with third parties for marketing purposes.',
      },
      {
        heading: 'Data Security',
        content:
          'All payment transactions are processed through secure, PCI-compliant payment gateways. We do not store your card details on our servers. Your personal information is protected using industry-standard encryption and security protocols.',
      },
      {
        heading: 'Cookies',
        content:
          'Our website uses cookies to remember your preferences, maintain your session, and analyse traffic patterns. You can disable cookies in your browser settings, though this may affect certain features of the website.',
      },
      {
        heading: 'Your Rights',
        content:
          'You may request access to, correction of, or deletion of your personal data at any time by contacting us at orders@decantatelier.in. We will respond to your request within 30 days.',
      },
    ],
  },
];

export default policiesData;
