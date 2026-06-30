import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import policiesData from './policiesData';
import PolicyNav from './PolicyNav';
import PolicyContent from './PolicyContent';

/**
 * PoliciesPage — Main layout component.
 * Desktop: sidebar nav + content panel.
 * Mobile: card grid → detail view with back navigation.
 */
export default function PoliciesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const getPolicyIdFromPath = (pathname) => {
    const segment = pathname.replace('/', '');
    if (segment === 'refund') return 'returns';
    const match = policiesData.find((p) => p.id === segment);
    return match ? match.id : policiesData[0].id;
  };

  const activeId = useMemo(() => getPolicyIdFromPath(location.pathname), [location.pathname]);
  const [mobileView, setMobileView] = useState('detail');

  useEffect(() => {
    setMobileView('detail');
  }, [location.pathname]);

  const activePolicy = policiesData.find((p) => p.id === activeId);

  const handleSelect = useCallback((id) => {
    setMobileView('detail');
    navigate('/' + (id === 'returns' ? 'refund' : id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const handleBack = useCallback(() => {
    setMobileView('grid');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F3ED] text-policy-body">
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ===== HEADER ===== */}
      <section className="page-hero policies-hero">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #8B672F 1px, transparent 1px), linear-gradient(to bottom, #8B672F 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(176,138,80,0.04)_0%,transparent_65%)] rounded-full" />
        {/* <div className="page-hero-bg-text">POLICIES</div> */}

        <div className="page-hero-content">
          <span className="page-hero-eyebrow">Decant Atelier</span>
          <h1 className="page-hero-title">Our Policies</h1>
          <p className="page-hero-subtitle">
            Transparency, integrity, and care — the pillars of every interaction with Decant Atelier.
          </p>
          <div className="page-hero-divider" />
        </div>
      </section>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 -mt-16 relative z-20">
        {/* Desktop + Tablet landscape: sidebar layout */}
        <div className="hidden lg:grid lg:grid-cols-[300px_1fr] gap-0">
          {/* Sidebar */}
          <aside className="pt-0">
            <div className="sticky top-28 bg-[#FEFCF9] rounded-3xl border border-policy-divider/50 shadow-md p-4">
              <PolicyNav
                policies={policiesData}
                activeId={activeId}
                onSelect={handleSelect}
              />
            </div>
          </aside>

          {/* Content */}
          <div className="pl-12 pt-4 pb-24">
            <div className="bg-[#FEFCF9] rounded-3xl border border-policy-divider/40 shadow-md p-12 lg:p-16">
              <PolicyContent policy={activePolicy} />
            </div>
          </div>
        </div>

        {/* Mobile + Tablet portrait: card grid or detail view */}
        <div className="lg:hidden pb-16">
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
                      group bg-[#FEFCF9] rounded-2xl
                      border border-policy-divider/50 p-6 text-left
                      transition-all duration-300 hover:shadow-md
                      hover:border-policy-gold/50 hover:-translate-y-0.5
                      cursor-pointer
                    "
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-12 h-12 rounded-xl bg-policy-primary flex items-center justify-center flex-shrink-0 shadow-sm transition-shadow duration-300">
                        <Icon className="w-5 h-5 text-policy-gold" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[0.88rem] font-bold text-policy-primary tracking-wide font-body">
                          {policy.title}
                        </h3>
                        <p className="text-[0.7rem] text-policy-body/75 mt-1">
                          {policy.tagline}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-policy-gold/50 group-hover:text-policy-gold group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
              {/* Content card */}
              <div className="bg-[#FEFCF9] rounded-3xl border border-policy-divider/40 shadow-md p-6 sm:p-10">
                {/* Horizontal policy pills */}
                <div className="mb-6 border-b border-policy-divider/30 pb-4">
                  <PolicyNav
                    policies={policiesData}
                    activeId={activeId}
                    onSelect={handleSelect}
                  />
                </div>
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
