import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitCompare,
  Orbit,
  Play,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DnaHelixViewport } from '../components/DnaHelixViewport.js';
import { GlassCard } from '../components/GlassCard.js';
import { MagneticButton } from '../components/MagneticButton.js';
import { analyzeGuideAgainstDna, TEST_VECTOR } from '../shared/crisprEngine.js';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import { AppPage } from '../types/crispr.js';

interface LandingPageProps {
  onLaunchSimulator: () => void;
  onWatchDemo: () => void;
  onNavigate: (page: AppPage) => void;
  motionEnabled?: boolean;
  language?: AppLanguage;
}

const FANNED_CARDS = [
  {
    id: 'match',
    step: '01',
    title: 'Match',
    titleTa: 'பொருத்தம் (Match)',
    subtitle: 'Bidirectional sliding window',
    subtitleTa: 'இரு-இழை சோதனை',
    body: 'Scans forward (+) and reverse complement (-) strands using Hamming distance across your 15–25 nt guide RNA.',
    bodyTa: '15–25 எழுத்து guide RNA-ஐ முன் (+) மற்றும் எதிர் (-) இழைகளில் Hamming தூரத்துடன் தேடுகிறது.',
    metric: '10-bp Seed · 3× weight',
    spotlightColor: 'rgba(34, 211, 238, 0.22)',
    accent: 'from-[#22d3ee]/30 via-[#7c5cff]/12 to-transparent',
    borderGlow: 'border-[#22d3ee]/35',
    Icon: Search,
    fanTransform: 'lg:-rotate-3 lg:translate-y-4',
  },
  {
    id: 'pam',
    step: '02',
    title: 'PAM check',
    titleTa: 'PAM சோதனை',
    subtitle: '3′ motif recognition',
    subtitleTa: '3′ அடையாளச் சோதனை',
    body: 'Verifies NGG, NAG, or NNGRRT immediately 3′ of the window. Even 0-mismatch targets score 0.0 without a valid PAM.',
    bodyTa: 'NGG, NAG அல்லது NNGRRT உள்ளதா எனச் சரிபார்க்கிறது. PAM இல்லாவிடில் 0 தவறு இருந்தாலும் மதிப்பெண் 0.0.',
    metric: 'NGG · NAG · NNGRRT',
    spotlightColor: 'rgba(124, 92, 255, 0.24)',
    accent: 'from-[#7c5cff]/35 via-[#ff4fa3]/12 to-transparent',
    borderGlow: 'border-[#7c5cff]/40',
    Icon: ShieldCheck,
    fanTransform: 'lg:-translate-y-2 lg:z-10',
  },
  {
    id: 'cut',
    step: '03',
    title: 'Cut',
    titleTa: 'வெட்டு & மாதிரி',
    subtitle: 'Cleavage & indel preview',
    subtitleTa: '3 bp முன் வெட்டு',
    body: 'Models double-strand cleavage 3 bp upstream of the PAM and previews illustration-only 1-bp deletion and insertion shifts.',
    bodyTa: 'PAM-க்கு 3 bp முன்பு வெட்டு இடத்தைக் காட்டி 1-bp நீக்கம்/சேர்க்கை மாதிரியை விளக்குகிறது.',
    metric: 'Cut = 3 bp before PAM',
    spotlightColor: 'rgba(198, 255, 61, 0.20)',
    accent: 'from-[#c6ff3d]/25 via-[#22d3ee]/12 to-transparent',
    borderGlow: 'border-[#c6ff3d]/35',
    Icon: Scissors,
    fanTransform: 'lg:rotate-3 lg:translate-y-4',
  },
];

const STEPPER_STEPS = [
  {
    num: '01',
    title: 'Input Synthetic DNA & Guide RNA',
    titleTa: 'செயற்கை DNA & Guide RNA உள்ளீடு',
    detail: 'Paste FASTA or plain A/C/G/T/U sequences (DNA ≥ 30 bp, guide 15–25 bases). Invalid characters are rejected immediately.',
    detailTa: 'FASTA அல்லது A/C/G/T/U வரிசைகளை உள்ளிடவும் (DNA ≥ 30 bp, guide 15–25 எழுத்துகள்). தவறான எழுத்துகள் உடனே தடுக்கப்படும்.',
    example: 'Guide: GATCCGTAACGGTTCAGCTA · PAM: NGG · Max MM: 4',
  },
  {
    num: '02',
    title: 'Score Seed & Distal Mismatches',
    titleTa: 'Seed & வெளிப்புற தவறு மதிப்பீடு',
    detail: 'Mismatches in the last 10 bases next to the PAM incur penalty 3; upstream mismatches incur penalty 1. Score = 100 × exp(-0.5 × penalty).',
    detailTa: 'PAM அருகிலுள்ள 10 எழுத்து seed பகுதியில் தவறுக்கு 3 அபராதம்; மற்ற இடங்களில் 1. மதிப்பெண் = 100 × exp(-0.5 × அபராதம்).',
    example: 'Site 14–33 (TGG, 0 MM) = 100.0 · Site 47–66 (AGG, 2 MM at 4 & 17) = 13.5',
  },
  {
    num: '03',
    title: 'Filter by Valid PAM & Model Cut',
    titleTa: 'சரியான PAM & வெட்டு இடம்',
    detail: 'Sites missing the required 3′ PAM are flagged No PAM with score 0.0. Valid sites predict cleavage 3 bp before the PAM.',
    detailTa: 'தேவையான 3′ PAM இல்லாத தளங்கள் No PAM (0.0) எனக் குறிக்கப்படும். சரியான தளத்தில் PAM-க்கு 3 bp முன்பு வெட்டு கணிக்கப்படும்.',
    example: 'Site 80–99 (TCA = No PAM) = 0.0 · Site 14–33 cuts after bp 30',
  },
];

const DEMO_TOOL_CARDS: Array<{
  page: AppPage;
  title: string;
  titleTa: string;
  demoLabel: string;
  description: string;
  descriptionTa: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
}> = [
  {
    page: 'simulator',
    title: '3D CRISPR Simulator',
    titleTa: '3D CRISPR சிமுலேட்டர்',
    demoLabel: 'Positive, Negative & Invalid demos',
    description: 'Watch Cas9 scan both strands, inspect seed/distal penalty tooltips, and preview 1-bp hypothetical edits.',
    descriptionTa: 'Cas9 இரு இழைகளிலும் தேடுவதைப் பார்த்து, தவறு விளக்கங்களுடன் மாதிரி வெட்டுகளை ஆராயுங்கள்.',
    Icon: Activity,
    accent: 'text-[#c6ff3d] border-[#c6ff3d]/30 bg-[#c6ff3d]/10',
  },
  {
    page: 'compare',
    title: 'Multi-Guide Compare',
    titleTa: 'பல Guide ஒப்பீடு',
    demoLabel: '3 ready comparison presets',
    description: 'Compare 2–6 guide RNAs side by side on a shared DNA map, contrasting seed vs. distal penalties and SaCas9 PAMs.',
    descriptionTa: 'ஒரே DNA வரைபடத்தில் 2–6 guide RNA-களை அருகருகே ஒப்பிட்டு சிறந்தது எது எனக் காண்க.',
    Icon: GitCompare,
    accent: 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/10',
  },
  {
    page: 'lab',
    title: '3D Hologram Lab',
    titleTa: '3D ஹாலோகிராம் ஆய்வகம்',
    demoLabel: 'DNA · RNA · Cas9 explode + Quiz',
    description: 'Pull apart 27 interactive 3D molecular domains in English, Tamil (தமிழ்), or Tanglish with guided presets.',
    descriptionTa: 'DNA, RNA மற்றும் Cas9-இன் 27 பாகங்களைத் தமிழ் / ஆங்கிலத்தில் பிரித்துப் பார்த்து வினாடி-வினா விளையாடுங்கள்.',
    Icon: Orbit,
    accent: 'text-[#c084fc] border-[#c084fc]/30 bg-[#c084fc]/10',
  },
  {
    page: 'learn',
    title: 'Learn & Q&A Tutor',
    titleTa: 'கற்க & கேள்வி-பதில்',
    demoLabel: '32-term glossary + Safe Q&A',
    description: 'Compare DNA vs. RNA side-by-side in 3D and test the deterministic Q&A tutor (with strict biosafety guardrails).',
    descriptionTa: 'DNA vs RNA 3D ஒப்பீடு, 32 கலைச்சொற்கள் மற்றும் பாதுகாப்பான கல்வி கேள்வி-பதில் உதவியாளர்.',
    Icon: BookOpen,
    accent: 'text-[#3ddc84] border-[#3ddc84]/30 bg-[#3ddc84]/10',
  },
  {
    page: 'reports',
    title: 'PDF & CSV Reports',
    titleTa: 'PDF & CSV அறிக்கைகள்',
    demoLabel: 'Pre-seeded SQLite history',
    description: 'Inspect saved SQLite runs, reload any target directly into the 3D simulator, or export formatted PDF/CSV reports.',
    descriptionTa: 'சேமிக்கப்பட்ட முடிவுகளைப் பார்த்து PDF/CSV அறிக்கைகளாகப் பதிவிறக்கம் செய்யுங்கள்.',
    Icon: FileText,
    accent: 'text-[#ffb020] border-[#ffb020]/30 bg-[#ffb020]/10',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchSimulator,
  onWatchDemo,
  onNavigate,
  motionEnabled = true,
  language = 'en',
}) => {
  const t = UI_STRINGS[language];
  const [scrollRot, setScrollRot] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [cardSpotlights, setCardSpotlights] = useState<Record<string, { x: number; y: number }>>({});

  const selectStep = (nextIdx: number) => {
    setSlideDir(nextIdx >= activeStep ? 1 : -1);
    setActiveStep(nextIdx);
  };

  const demoAnalysis = useMemo(
    () =>
      analyzeGuideAgainstDna(
        TEST_VECTOR.dna,
        TEST_VECTOR.guide,
        TEST_VECTOR.pam,
        TEST_VECTOR.maxMm
      ),
    []
  );

  // Scroll-linked helix rotation
  useEffect(() => {
    if (!motionEnabled) {
      setScrollRot(0);
      return;
    }
    const onScroll = () => {
      const ratio = Math.min(1.5, window.scrollY / 600);
      setScrollRot(ratio);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [motionEnabled]);

  // Smooth auto-advance on walkthrough carousel (pauses on hover or reduced motion)
  useEffect(() => {
    if (!motionEnabled || carouselPaused) return;
    const timer = window.setInterval(() => {
      setSlideDir(1);
      setActiveStep((prev) => (prev + 1) % STEPPER_STEPS.length);
    }, 6200);
    return () => window.clearInterval(timer);
  }, [motionEnabled, carouselPaused]);

  const handleCardMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!motionEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCardSpotlights((prev) => ({
      ...prev,
      [id]: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    }));
  };

  const trustChips =
    language === 'ta'
      ? ['செயற்கை தரவு', 'கல்வி மதிப்பீடுகள்', 'உண்மையான மாற்றம் இல்லை']
      : ['Synthetic data', 'Educational estimates', 'No real editing'];

  return (
    <div className="flex flex-col">
      {/* Full-Screen 3D Holographic DNA Hero */}
      <section className="relative min-h-[calc(100vh-105px)] flex items-center overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <DnaHelixViewport
            dna={TEST_VECTOR.dna}
            sites={demoAnalysis.sites}
            selectedSiteIndex={0}
            mode="hero"
            scrollRotation={scrollRot}
            reducedMotion={!motionEnabled}
            autoPlay
            className="w-full h-full rounded-none border-0"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(95deg, rgba(5,10,20,0.92) 0%, rgba(5,10,20,0.72) 48%, rgba(5,10,20,0.24) 100%)',
            }}
          />
          {/* Subtle atmospheric radial mesh for depth */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 55% at 18% 35%, rgba(34,211,238,0.10) 0%, transparent 70%), radial-gradient(45% 45% at 78% 72%, rgba(124,92,255,0.10) 0%, transparent 72%)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={motionEnabled ? { opacity: 0, y: 24, filter: 'blur(6px)' } : false}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Trust Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {trustChips.map((chip, idx) => (
                <motion.span
                  key={chip}
                  initial={motionEnabled ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: idx * 0.06 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-xs font-medium text-[#22d3ee]"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#c6ff3d]" aria-hidden="true" />
                  {chip}
                </motion.span>
              ))}
            </div>

            <h1 className="font-display font-bold tracking-tight text-[#e8f3f1] gw-hero-title">
              {t.heroTitlePrefix}
              <span className="gw-gradient-text">{t.heroTitleHighlight}</span>
              {t.heroTitleSuffix}
            </h1>

            <p className="text-base sm:text-lg text-[#c7d8d6] leading-relaxed max-w-xl">
              {t.heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <MagneticButton
                motionEnabled={motionEnabled}
                variant="lime"
                onClick={onLaunchSimulator}
                className="px-6 py-3.5 text-sm sm:text-base"
              >
                {t.launchSimulator}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </MagneticButton>

              <MagneticButton
                motionEnabled={motionEnabled}
                variant="ghost"
                onClick={onWatchDemo}
                className="px-6 py-3.5 text-sm sm:text-base"
              >
                <Play className="w-4 h-4 text-[#22d3ee]" aria-hidden="true" />
                {t.watchDemo}
              </MagneticButton>

              <MagneticButton
                motionEnabled={motionEnabled}
                variant="ghost"
                onClick={() => onNavigate('lab')}
                className="px-5 py-3.5 text-sm sm:text-base border-[#7c5cff]/45 hover:border-[#22d3ee]/60"
              >
                <Orbit className="w-4 h-4 text-[#c084fc]" aria-hidden="true" />
                {t.openHologramLab}
              </MagneticButton>
            </div>
          </motion.div>

          {/* Right: Live Deterministic Test-Vector Telemetry Preview Glass Card */}
          <motion.div
            initial={motionEnabled ? { opacity: 0, x: 26, scale: 0.96 } : false}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.56, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <GlassCard tilt motionEnabled={motionEnabled} className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c6ff3d]" aria-hidden="true" />
                  <span className="font-display text-sm font-semibold text-[#e8f3f1]">
                    {language === 'ta' ? 'நேரடி டெமோ மாதிரி (110 bp)' : 'Live Test Vector Snapshot (110 bp)'}
                  </span>
                </div>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-[#22d3ee]/15 text-[#22d3ee]">
                  NGG · 20 nt
                </span>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#050a14]/70 px-3 py-2 font-mono text-[11px] text-[#c7d8d6] flex items-center justify-between gap-2">
                <span className="text-[#8aa4ad]">Guide 5&apos;→3&apos;:</span>
                <span className="text-[#22d3ee] truncate">{TEST_VECTOR.guide}</span>
              </div>

              <div className="space-y-2">
                {demoAnalysis.sites.map((site, i) => {
                  const tone = !site.pamOk
                    ? 'border-white/10 bg-white/[0.03] text-[#8aa4ad]'
                    : site.mismatches === 0
                    ? 'border-[#3ddc84]/35 bg-[#3ddc84]/10 text-[#3ddc84]'
                    : 'border-[#ffb020]/35 bg-[#ffb020]/10 text-[#ffb020]';

                  return (
                    <motion.button
                      key={`hero-site-${site.start}`}
                      type="button"
                      onClick={onWatchDemo}
                      initial={motionEnabled ? { opacity: 0, y: 10 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.22 + i * 0.08 }}
                      className={`w-full text-left rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-3 hover:brightness-110 transition-all cursor-pointer ${tone}`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono text-xs font-semibold text-[#e8f3f1]">
                          bp {site.start}–{site.end} · PAM {site.pam}
                        </div>
                        <div className="text-[11px] text-[#c7d8d6]">
                          {site.pamOk
                            ? `${site.mismatches} mismatch${site.mismatches === 1 ? '' : 'es'} · cut after ${site.cut}`
                            : '0 mismatches · Missing NGG PAM'}
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold tabular-nums px-2.5 py-1 rounded-lg bg-[#050a14]/75">
                        {site.score.toFixed(1)}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] text-[#8aa4ad]">
                <span>
                  {language === 'ta'
                    ? 'மதிப்பெண்: கல்வி மதிப்பீடு மட்டுமே'
                    : 'Deterministic educational estimates'}
                </span>
                <button
                  type="button"
                  onClick={onWatchDemo}
                  className="font-medium text-[#c6ff3d] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {language === 'ta' ? '3D-இல் இயக்கு' : 'Play in 3D'}
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* 3 Fanned & Spotlight-Reactive 3D Perspective Cards */}
      <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-16 lg:py-20 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#e8f3f1] text-balance">
            {language === 'ta'
              ? 'இலக்கு கண்டறிதலின் மூன்று துல்லிய நிலைகள்'
              : 'Three deterministic stages of target recognition'}
          </h2>
          <p className="text-sm sm:text-base text-[#8aa4ad]">
            {language === 'ta'
              ? 'ஒவ்வொரு கணக்கீடும் நேரடி கணித முறைப்படி இயங்குவதால் மாணவர்கள் ஒவ்வொரு அடிப்படை மற்றும் தவறையும் எளிதாகக் கண்காணிக்கலாம்.'
              : 'Every calculation runs deterministically in TypeScript—never guessed by an LLM—so students can trace every coordinate and mismatch.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-5 items-center py-4 gw-stage-3d">
          {FANNED_CARDS.map((card, idx) => {
            const Icon = card.Icon;
            const spot = cardSpotlights[card.id];
            return (
              <motion.div
                key={card.id}
                initial={motionEnabled ? { opacity: 0, y: 28, rotateX: 8 } : false}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={motionEnabled ? { y: -8, scale: 1.015 } : undefined}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.42, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={motionEnabled ? card.fanTransform : ''}
                onMouseMove={(e) => handleCardMouseMove(card.id, e)}
              >
                <GlassCard
                  tilt
                  motionEnabled={motionEnabled}
                  onClick={onLaunchSimulator}
                  className={`relative overflow-hidden p-7 space-y-6 cursor-pointer ${card.borderGlow}`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.accent} pointer-events-none`}
                    aria-hidden="true"
                  />
                  {/* Dynamic mouse-tracking spotlight */}
                  {motionEnabled && spot && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none transition-opacity duration-200"
                      style={{
                        background: `radial-gradient(240px circle at ${spot.x}px ${spot.y}px, ${card.spotlightColor}, transparent 75%)`,
                      }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#e8f3f1]">
                      Step {card.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#22d3ee]" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="relative z-10 space-y-2">
                    <h3 className="font-display text-2xl font-bold text-[#e8f3f1]">
                      {language === 'ta' ? card.titleTa : card.title}
                    </h3>
                    <div className="text-xs font-medium text-[#22d3ee]">
                      {language === 'ta' ? card.subtitleTa : card.subtitle}
                    </div>
                    <p className="text-sm text-[#c7d8d6] leading-relaxed pt-1">
                      {language === 'ta' ? card.bodyTa : card.body}
                    </p>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-[#c6ff3d]">
                    <span>{card.metric}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Interactive "How It Works" Auto-Advancing 3D Walkthrough */}
      <section
        className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 pb-16"
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
      >
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#e8f3f1]">
                {language === 'ta'
                  ? 'செயல்முறை விளக்கம் · டெஸ்ட் வெக்டர் நடைபயிற்சி'
                  : 'How it works · Test Vector Walkthrough'}
              </h2>
              <p className="text-sm text-[#8aa4ad]">
                {language === 'ta'
                  ? '110-bp செயற்கை வரிசையில் எவ்வாறு மதிப்பெண் கணக்கிடப்படுகிறது என்பதைப் படியுங்கள்.'
                  : 'Step through the built-in 110-bp synthetic sequence verification pipeline.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('learn')}
              className="text-sm font-medium text-[#22d3ee] hover:underline cursor-pointer"
            >
              {language === 'ta' ? 'DNA vs RNA கற்க →' : 'Explore DNA vs RNA in Learn →'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
              <div className="space-y-2.5">
                {STEPPER_STEPS.map((st, idx) => {
                  const active = activeStep === idx;
                  return (
                    <button
                      key={st.num}
                      type="button"
                      onClick={() => selectStep(idx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        active
                          ? 'border-[#c6ff3d]/55 bg-[#c6ff3d]/12 shadow-[0_0_24px_rgba(198,255,61,0.12)]'
                          : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-colors ${
                            active ? 'bg-[#c6ff3d] text-[#050a14]' : 'bg-white/10 text-[#8aa4ad]'
                          }`}
                        >
                          {st.num}
                        </span>
                        <span className="font-display font-semibold text-sm sm:text-base text-[#e8f3f1]">
                          {language === 'ta' ? st.titleTa : st.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Slide Controls + Indicator Dots */}
              <div className="flex items-center justify-between pt-2 px-1">
                <div className="flex items-center gap-1.5">
                  {STEPPER_STEPS.map((st, idx) => (
                    <button
                      key={st.num}
                      type="button"
                      onClick={() => selectStep(idx)}
                      aria-label={`View walkthrough slide ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeStep === idx ? 'w-7 bg-[#c6ff3d]' : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectStep((activeStep - 1 + STEPPER_STEPS.length) % STEPPER_STEPS.length)}
                    aria-label="Previous walkthrough slide"
                    className="p-2 rounded-xl border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => selectStep((activeStep + 1) % STEPPER_STEPS.length)}
                    aria-label="Next walkthrough slide"
                    className="p-2 rounded-xl border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 gw-stage-3d overflow-hidden">
              <AnimatePresence mode="wait" custom={slideDir}>
                <motion.div
                  key={STEPPER_STEPS[activeStep].num}
                  custom={slideDir}
                  initial={
                    motionEnabled
                      ? {
                          opacity: 0,
                          x: slideDir * 52,
                          rotateY: slideDir * 7,
                          scale: 0.95,
                          filter: 'blur(6px)',
                        }
                      : false
                  }
                  animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={
                    motionEnabled
                      ? {
                          opacity: 0,
                          x: -slideDir * 44,
                          rotateY: -slideDir * 6,
                          scale: 0.95,
                          filter: 'blur(4px)',
                        }
                      : undefined
                  }
                  transition={{ duration: motionEnabled ? 0.38 : 0, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-2xl border border-white/15 bg-gradient-to-br from-[#0b152b]/90 via-[#070f20]/90 to-[#050a14]/95 p-6 flex flex-col justify-between gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#22d3ee]">Stage {STEPPER_STEPS[activeStep].num}</span>
                      <span className="text-[#8aa4ad] tabular-nums">
                        {String(activeStep + 1).padStart(2, '0')} / {String(STEPPER_STEPS.length).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#e8f3f1]">
                      {language === 'ta' ? STEPPER_STEPS[activeStep].titleTa : STEPPER_STEPS[activeStep].title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#c7d8d6] leading-relaxed">
                      {language === 'ta' ? STEPPER_STEPS[activeStep].detailTa : STEPPER_STEPS[activeStep].detail}
                    </p>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-[#c6ff3d]">
                      {STEPPER_STEPS[activeStep].example}
                    </div>
                  </div>
                  <div className="pt-2">
                    <MagneticButton
                      motionEnabled={motionEnabled}
                      variant="lime"
                      onClick={onWatchDemo}
                      className="px-5 py-2.5 text-xs sm:text-sm"
                    >
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                      {language === 'ta' ? 'இந்த டெமோவை 3D-இல் இயக்கு' : 'Run this test vector in 3D'}
                    </MagneticButton>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* All Tools Quick-Demo Launchpad */}
      <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 pb-20 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#e8f3f1]">
              {language === 'ta'
                ? 'அனைத்து கருவிகளும் · நேரடி டெமோ உதாரணங்கள்'
                : 'Explore Every Tool · Ready-to-Explain Demos'}
            </h2>
            <p className="text-sm text-[#8aa4ad]">
              {language === 'ta'
                ? 'விளக்குவதற்கு எளிதாக ஒவ்வொரு கருவியிலும் முன்னமைக்கப்பட்ட டெமோ உதாரணங்கள் உள்ளன.'
                : 'Each workspace includes pre-loaded synthetic examples so explaining CRISPR concepts takes one click.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {DEMO_TOOL_CARDS.map((tool, idx) => {
            const Icon = tool.Icon;
            return (
              <motion.div
                key={tool.page}
                initial={motionEnabled ? { opacity: 0, y: 18 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={motionEnabled ? { y: -5 } : undefined}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.34, delay: idx * 0.05 }}
              >
                <GlassCard
                  onClick={() => (tool.page === 'simulator' ? onWatchDemo() : onNavigate(tool.page))}
                  className="h-full p-5 flex flex-col justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`w-9 h-9 rounded-xl border flex items-center justify-center ${tool.accent}`}>
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="text-[10px] font-mono text-[#8aa4ad] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        {tool.demoLabel}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-bold text-[#e8f3f1]">
                      {language === 'ta' ? tool.titleTa : tool.title}
                    </h3>
                    <p className="text-xs text-[#c7d8d6] leading-relaxed">
                      {language === 'ta' ? tool.descriptionTa : tool.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-medium text-[#22d3ee]">
                    <span>{language === 'ta' ? 'டெமோ திற' : 'Open demo'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
