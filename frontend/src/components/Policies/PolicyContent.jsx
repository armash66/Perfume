/**
 * PolicyContent — Renders the active policy's sections with editorial typography,
 * animated entrance, and luxury card styling.
 */
export default function PolicyContent({ policy }) {
  const Icon = policy.icon;

  return (
    <article
      key={policy.id}
      className="animate-fadeIn"
      aria-labelledby={`policy-title-${policy.id}`}
    >
      {/* Header */}
      <header className="mb-10 lg:mb-12">
        {/* Icon badge with ring and scale effect */}
        <div className="group/icon mb-5 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F3D3E] to-[#072227] shadow-lg shadow-[#0F3D3E]/15 border border-[#E2C275]/20 hover:scale-105 transition-all duration-300">
          <Icon className="w-7 h-7 text-[#E2C275] group-hover/icon:rotate-12 transition-transform duration-300" />
        </div>

        {/* Eyebrow */}
        <p className="text-[0.65rem] font-bold tracking-[4px] uppercase text-[#C4A85A] mb-3">
          {policy.tagline}
        </p>

        {/* Title */}
        <h2
          id={`policy-title-${policy.id}`}
          className="font-heading text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-[#072227] leading-tight tracking-wide"
        >
          {policy.title}
        </h2>

        {/* Premium editorial divider (dot-and-line design) */}
        <div className="mt-5 flex items-center gap-3 select-none">
          <div className="h-px w-10 bg-gradient-to-r from-[#E2C275] to-[#C4A85A]" />
          <div className="w-1.5 h-1.5 bg-[#E2C275] rotate-45 shadow-sm" />
          <div className="h-px w-24 bg-gradient-to-r from-[#C4A85A] to-transparent" />
        </div>
      </header>

      {/* Sections */}
      <div className="space-y-0">
        {policy.sections.map((section, index) => (
          <section
            key={index}
            className="group/section relative py-7 lg:py-8"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            {/* Section number with elegant horizontal line accent */}
            <div className="absolute left-0 top-[1.85rem] lg:top-[2.1rem] flex items-center gap-2.5 select-none">
              <span className="text-[0.95rem] lg:text-[1.05rem] font-semibold tracking-[2px] text-[#9B8A47] font-heading transition-colors duration-300 group-hover/section:text-[#E2C275]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="w-5 group-hover/section:w-7 h-px bg-gradient-to-r from-[#E2C275]/50 to-transparent transition-all duration-300" />
            </div>

            {/* Content */}
            <div className="pl-14 lg:pl-18">
              <h3 className="font-heading text-[1.15rem] lg:text-[1.25rem] font-semibold text-[#0F3D3E] mb-3 tracking-wide leading-snug transition-colors duration-300 group-hover/section:text-[#9B8A47]">
                {section.heading}
              </h3>
              <p className="font-body text-[0.92rem] lg:text-[0.96rem] text-[#2C2C2C]/85 leading-[1.8] font-normal transition-colors duration-300 group-hover/section:text-[#2C2C2C]">
                {section.content}
              </p>
            </div>

            {/* Premium fading line divider */}
            {index < policy.sections.length - 1 && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#E2C275]/20 via-[#E2C275]/10 to-transparent" />
            )}
          </section>
        ))}
      </div>

      {/* Footer note */}
      <footer className="mt-10 lg:mt-12 pt-8 border-t border-[#E2C275]/15">
        <div className="flex items-start gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-white/90 to-[#FFF8E7]/40 backdrop-blur-md border border-[#E2C275]/12 shadow-sm shadow-[#E2C275]/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F3D3E] to-[#072227] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#0F3D3E]/10">
            <svg className="w-4.5 h-4.5 text-[#E2C275]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
          </div>
          <div>
            <p className="text-[0.82rem] font-bold text-[#0F3D3E] mb-1.5 tracking-wide">Need Assistance?</p>
            <p className="text-[0.76rem] text-[#2C2C2C]/80 leading-relaxed font-body">
              Our concierge team is available to assist you. Contact us at{' '}
              <a href="mailto:orders@decantatelier.in" className="text-[#9B8A47] hover:text-[#C4A85A] font-semibold underline underline-offset-4 decoration-[#9B8A47]/30 hover:decoration-[#C4A85A] transition-all duration-300">
                orders@decantatelier.in
              </a>{' '}
              or call{' '}
              <a href="tel:+919768188453" className="text-[#9B8A47] hover:text-[#C4A85A] font-semibold underline underline-offset-4 decoration-[#9B8A47]/30 hover:decoration-[#C4A85A] transition-all duration-300">
                +91 97681 88453
              </a>
            </p>
          </div>
        </div>
      </footer>
    </article>
  );
}
