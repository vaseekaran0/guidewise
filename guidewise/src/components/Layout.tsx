import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BookOpen,
  Dna,
  FileText,
  GitCompare,
  Home,
  Info,
  Languages,
  Menu,
  Orbit,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import type { AppPage } from '../types/crispr.js';
import { MagneticButton } from './MagneticButton.js';

interface LayoutProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  motionEnabled: boolean;
  onToggleMotion: () => void;
  language: AppLanguage;
  onToggleLanguage: () => void;
  children: React.ReactNode;
}

const SIDEBAR_ITEMS: Array<{ id: Exclude<AppPage, 'landing'>; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'simulator', Icon: Activity },
  { id: 'compare', Icon: GitCompare },
  { id: 'lab', Icon: Orbit },
  { id: 'learn', Icon: BookOpen },
  { id: 'reports', Icon: FileText },
  { id: 'about', Icon: Info },
];

export const Layout: React.FC<LayoutProps> = ({
  currentPage,
  onNavigate,
  motionEnabled,
  onToggleMotion,
  language,
  onToggleLanguage,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = UI_STRINGS[language];

  const handleNav = (page: AppPage) => {
    setMobileMenuOpen(false);
    onNavigate(page);
  };

  const showSidebar = currentPage !== 'landing';

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050a14] text-[#e8f3f1] overflow-x-hidden">
      {/* Blurred Atmospheric Background Blobs + Procedural CSS Grain */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-36 -left-32 w-[520px] h-[520px] rounded-full blur-[130px]"
          style={{ background: 'rgba(34, 211, 238, 0.14)' }}
        />
        <div
          className="absolute top-1/3 -right-40 w-[560px] h-[560px] rounded-full blur-[145px]"
          style={{ background: 'rgba(124, 92, 255, 0.14)' }}
        />
        <div
          className="absolute -bottom-44 left-1/3 w-[480px] h-[480px] rounded-full blur-[140px]"
          style={{ background: 'rgba(255, 79, 163, 0.10)' }}
        />
        <div className="absolute inset-0 gw-grain" />
      </div>

      {/* Persistent Educational Disclaimer Strip on Every Page */}
      <div
        role="note"
        aria-label="Educational Simulation Disclaimer"
        className="relative z-40 w-full border-b border-white/10 bg-[#050a14]/90 px-4 py-2 text-xs text-[#c7d8d6]"
      >
        <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-2 text-center leading-snug">
          <ShieldAlert className="w-3.5 h-3.5 text-[#ffb020] shrink-0" aria-hidden="true" />
          <span>{t.disclaimerBanner}</span>
        </div>
      </div>

      {/* Top Glass Bar */}
      <header className="sticky top-0 z-40 w-full gw-glass-subtle border-b border-white/10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className="flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-[#e8f3f1] hover:text-[#22d3ee] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#22d3ee]/30 to-[#7c5cff]/35 border border-white/15 flex items-center justify-center">
                <Dna className="w-4 h-4 text-[#22d3ee]" aria-hidden="true" />
              </span>
              <span>GuideWise</span>
            </button>
          </div>

          {/* Center Nav Links (always visible on md+ for fast switching) */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleNav('landing')}
              aria-current={currentPage === 'landing' ? 'page' : undefined}
              className={`relative px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                currentPage === 'landing'
                  ? 'text-[#e8f3f1]'
                  : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
              }`}
            >
              {currentPage === 'landing' && (
                <motion.span
                  layoutId={motionEnabled ? 'top-nav-pill' : undefined}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-white/10 border border-white/15"
                />
              )}
              <span className="relative z-10">{t.home}</span>
            </button>

            {SIDEBAR_ITEMS.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active ? 'text-[#e8f3f1]' : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId={motionEnabled ? 'top-nav-pill' : undefined}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-white/10 border border-white/15"
                    />
                  )}
                  <span className="relative z-10">{t.nav[item.id]}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Language Switcher (EN / தமிழ்) + Motion Toggle + Lime CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleLanguage}
              aria-pressed={language === 'ta'}
              title="Switch interface language between English and Tamil (தமிழ்)"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-white/15 bg-white/5 hover:border-[#22d3ee]/50 text-[#e8f3f1] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
              <span className={language === 'en' ? 'text-[#c6ff3d] font-semibold' : 'text-[#8aa4ad]'}>
                EN
              </span>
              <span className="text-white/30" aria-hidden="true">/</span>
              <span className={language === 'ta' ? 'text-[#c6ff3d] font-semibold' : 'text-[#8aa4ad]'}>
                தமிழ்
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleMotion}
              aria-pressed={motionEnabled}
              title="Toggle UI and 3D animations (also respects prefers-reduced-motion)"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                motionEnabled
                  ? 'border-[#22d3ee]/40 bg-[#22d3ee]/10 text-[#22d3ee]'
                  : 'border-white/15 bg-white/5 text-[#8aa4ad] hover:text-[#e8f3f1]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{motionEnabled ? t.motionOn : t.motionOff}</span>
            </button>

            <MagneticButton
              motionEnabled={motionEnabled}
              variant="lime"
              onClick={() => handleNav('simulator')}
              className="hidden sm:inline-flex px-4 py-2 text-xs sm:text-sm"
            >
              {t.launchSimulator}
            </MagneticButton>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-2 rounded-xl border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Glass Drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-white/10 bg-[#070f1e]/95 px-4 py-3 flex flex-col gap-1.5"
          >
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                currentPage === 'landing' ? 'bg-white/10 text-[#c6ff3d]' : 'text-[#8aa4ad]'
              }`}
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              {t.home}
            </button>
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.Icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-sm font-medium ${
                    active ? 'bg-white/10 text-[#c6ff3d]' : 'text-[#8aa4ad]'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {t.nav[item.id]}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Body Wrapper with Left Glass Sidebar on Workspace Routes */}
      <div className="relative z-10 flex-1 flex w-full max-w-[1600px] mx-auto">
        {showSidebar && (
          <aside
            aria-label="Workspace sidebar"
            className="hidden lg:flex flex-col justify-between w-60 shrink-0 p-4 pr-0"
          >
            <div className="sticky top-20 gw-glass p-3.5 space-y-6">
              <div className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-medium text-[#8aa4ad]">
                  {t.workspace}
                </div>
                {SIDEBAR_ITEMS.map((item) => {
                  const Icon = item.Icon;
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                        active ? 'text-[#e8f3f1]' : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId={motionEnabled ? 'sidebar-active-bg' : undefined}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          className="absolute inset-0 rounded-xl bg-white/10 border border-white/15"
                        />
                      )}
                      <span
                        className={`relative z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          active
                            ? 'bg-[#c6ff3d] text-[#050a14]'
                            : 'bg-white/5 text-[#8aa4ad]'
                        }`}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="relative z-10">{t.nav[item.id]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/10 px-2 space-y-2">
                <div className="text-xs font-medium text-[#e8f3f1]">
                  {t.deterministicTitle}
                </div>
                <p className="text-[11px] text-[#8aa4ad] leading-relaxed">
                  {t.deterministicBody}
                </p>
                <button
                  type="button"
                  onClick={() => handleNav('landing')}
                  className="text-xs font-medium text-[#22d3ee] hover:underline cursor-pointer"
                >
                  {t.backToOverview}
                </button>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#050a14]/80 py-7 px-4 sm:px-6 mt-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#8aa4ad]">
          <div className="space-y-1">
            <div className="font-display text-sm font-semibold text-[#e8f3f1]">
              {t.footerTitle}
            </div>
            <p>{t.disclaimerBanner}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className="hover:text-[#e8f3f1] transition-colors whitespace-nowrap cursor-pointer"
              >
                {t.nav[item.id]}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};
