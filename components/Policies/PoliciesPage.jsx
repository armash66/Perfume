"use client";

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
    <div className="min-h-screen bg-[#FFF8E7]">
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ===== HEADER ===== */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#0F3D3E] via-[#0a2c2d] to-[#072227]">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #E2C275 1px, transparent 1px), linear-gradient(to bottom, #E2C275 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(226,194,117,0.06)_0%,transparent_65%)] rounded-full" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-24 text-center">
          {/* Eyebrow */}
          <p className="text-[0.65rem] font-bold tracking-[5px] uppercase text-[#E2C275]/70 mb-4">
            Decant Atelier
          </p>

          {/* Title */}
          <h1 className="font-heading text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#FFF8E7] tracking-wide leading-tight mb-4">
            Our Policies
          </h1>

          {/* Subtitle */}
          <p className="font-body text-[0.95rem] text-[#ECD9A3]/80 max-w-lg mx-auto leading-relaxed font-normal">
            Transparency, integrity, and care — the pillars of every interaction with Decant Atelier.
          </p>

          {/* Gold divider */}
          <div className="mt-8 mx-auto h-px w-16 bg-gradient-to-r from-transparent via-[#E2C275]/50 to-transparent" />
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop + Tablet landscape: sidebar layout */}
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr] gap-0 -mt-8 relative z-20">
          {/* Sidebar */}
          <aside className="pt-0">
            <div className="sticky top-8 bg-white/70 backdrop-blur-md rounded-3xl border border-[#E2C275]/12 shadow-xl shadow-black/[0.03] p-3">
              <PolicyNav
                policies={policiesData}
                activeId={activeId}
                onSelect={handleSelect}
              />
            </div>
          </aside>

          {/* Content */}
          <div className="pl-10 xl:pl-14 pt-4 pb-20">
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-[#E2C275]/10 shadow-lg shadow-black/[0.02] p-8 lg:p-12 xl:p-14">
              <PolicyContent policy={activePolicy} />
            </div>
          </div>
        </div>

        {/* Mobile + Tablet portrait: card grid or detail view */}
        <div className="lg:hidden -mt-6 relative z-20 pb-12">
          {mobileView === 'grid' ? (
            /* Policy card grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
              {policiesData.map((policy) => {
                const Icon = policy.icon;
                return (
                  <button
                    key={policy.id}
                    onClick={() => handleSelect(policy.id)}
                    className="
                      group bg-white/70 backdrop-blur-sm rounded-2xl
                      border border-[#E2C275]/10 p-5 text-left
                      transition-all duration-300 hover:shadow-lg hover:shadow-[#0F3D3E]/5
                      hover:border-[#E2C275]/25 hover:-translate-y-0.5
                      cursor-pointer
                    "
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0F3D3E] to-[#072227] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#0F3D3E]/10 group-hover:shadow-lg group-hover:shadow-[#0F3D3E]/15 transition-shadow duration-300">
                        <Icon className="w-5 h-5 text-[#E2C275]" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[0.88rem] font-semibold text-[#0F3D3E] tracking-wide">
                          {policy.title}
                        </h3>
                        <p className="text-[0.7rem] text-[#0F3D3E]/40 mt-0.5">
                          {policy.tagline}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-[#C4A85A]/40 group-hover:text-[#C4A85A] group-hover:translate-x-0.5 transition-all duration-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                  flex items-center gap-2 mb-6 text-[0.78rem] font-medium
                  text-[#0F3D3E]/50 hover:text-[#0F3D3E] transition-colors duration-300
                  cursor-pointer
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
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[#E2C275]/10 shadow-lg shadow-black/[0.02] p-6 sm:p-8">
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
