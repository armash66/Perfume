import { useState, useCallback, useEffect } from 'react';
import policiesData from './policiesData';
import PolicyNav from './PolicyNav';
import PolicyContent from './PolicyContent';
import { ArrowLeftIcon } from './Icons';

/**
 * PoliciesPage — Main layout component.
 * Desktop: sidebar nav + content panel.
 * Mobile: card grid → detail view with back navigation.
 * Supports URL hash deep-linking (e.g. #shipping, #returns).
 */
export default function PoliciesPage() {
  const getIdFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    const match = policiesData.find((p) => p.id === hash);
    return match ? match.id : policiesData[0].id;
  };

  const [activeId, setActiveId] = useState(getIdFromHash);
  const [mobileView, setMobileView] = useState(() => {
    // If there's a hash, go directly to detail view on mobile
    return window.location.hash ? 'detail' : 'grid';
  });

  const activePolicy = policiesData.find((p) => p.id === activeId);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const onHashChange = () => {
      const id = getIdFromHash();
      setActiveId(id);
      setMobileView('detail');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleSelect = useCallback((id) => {
    setActiveId(id);
    setMobileView('detail');
    window.location.hash = id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleBack = useCallback(() => {
    setMobileView('grid');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F3ED]">
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ===== HEADER ===== */}
      <header className="relative overflow-hidden bg-[#1C1B18]">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #B08A50 1px, transparent 1px), linear-gradient(to bottom, #B08A50 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(176,138,80,0.04)_0%,transparent_65%)] rounded-full" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-32 pb-16 text-center">
          {/* Eyebrow */}
          <p className="text-[0.65rem] font-bold tracking-[5px] uppercase text-[#B08A50] mb-4">
            Decant Atelier
          </p>

          {/* Title */}
          <h1 
            style={{ color: '#FEFCF9' }}
            className="font-heading text-[clamp(2.2rem,5vw,3.8rem)] font-light tracking-wide leading-tight mb-4"
          >
            Our Policies
          </h1>

          {/* Subtitle */}
          <p className="font-body text-[0.88rem] text-white/70 max-w-md mx-auto leading-relaxed font-light">
            Transparency, integrity, and care — the pillars of every interaction with Decant Atelier.
          </p>

          {/* Gold divider */}
          <div className="mt-8 mx-auto h-px w-16 bg-[#B08A50]" />
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        {/* Desktop + Tablet landscape: sidebar layout */}
        <div className="hidden lg:grid lg:grid-cols-[300px_1fr] gap-0 -mt-10 relative z-20">
          {/* Sidebar */}
          <aside className="pt-0">
            <div className="sticky top-28 bg-[#FEFCF9] rounded-2xl border border-black/8 shadow-md p-4">
              <PolicyNav
                policies={policiesData}
                activeId={activeId}
                onSelect={handleSelect}
              />
            </div>
          </aside>

          {/* Content */}
          <div className="pl-12 pt-4 pb-24">
            <div className="bg-[#FEFCF9] rounded-2xl border border-black/6 shadow-md p-12 lg:p-16">
              <PolicyContent policy={activePolicy} />
            </div>
          </div>
        </div>

        {/* Mobile + Tablet portrait: card grid or detail view */}
        <div className="lg:hidden -mt-8 relative z-20 pb-16">
          {mobileView === 'grid' ? (
            /* Policy card grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
              {policiesData.map((policy) => {
                const Icon = policy.icon;
                return (
                  <button
                    key={policy.id}
                    onClick={() => handleSelect(policy.id)}
                    className="
                      group bg-[#FEFCF9] rounded-none
                      border border-black/6 p-6 text-left
                      transition-all duration-300 hover:shadow-md
                      hover:border-black/20 hover:-translate-y-0.5
                      cursor-pointer
                    "
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-none bg-[#1C1B18] flex items-center justify-center flex-shrink-0 shadow-sm transition-shadow duration-300">
                        <Icon className="w-5 h-5 text-[#B08A50]" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[0.88rem] font-bold text-[#1C1B18] tracking-wide font-body">
                          {policy.title}
                        </h3>
                        <p className="text-[0.7rem] text-black/45 mt-1">
                          {policy.tagline}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-[#B08A50]/40 group-hover:text-[#B08A50] group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Detail view */
            <div className="animate-fadeIn">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="
                  flex items-center gap-2 mb-6 text-[0.78rem] font-bold
                  text-black/50 hover:text-[#1C1B18] transition-colors duration-300
                  cursor-pointer uppercase tracking-wider
                "
              >
                <ArrowLeftIcon className="w-4 h-4" />
                All Policies
              </button>

              {/* Horizontal policy pills */}
              <div className="mb-6">
                <PolicyNav
                  policies={policiesData}
                  activeId={activeId}
                  onSelect={handleSelect}
                />
              </div>

              {/* Content card */}
              <div className="bg-[#FEFCF9] rounded-2xl border border-black/6 shadow-md p-6 sm:p-10">
                <PolicyContent policy={activePolicy} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ===== CUSTOM ANIMATION ===== */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
