import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FlaskConical,
  GitCompare,
  Play,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react';
import { DnaHelixViewport } from '../components/DnaHelixViewport.js';
import { EducationalTooltip } from '../components/EducationalTooltip.js';
import { GlassCard } from '../components/GlassCard.js';
import { HypotheticalEditPanel } from '../components/HypotheticalEditPanel.js';
import { MagneticButton } from '../components/MagneticButton.js';
import { SequenceAlignmentView } from '../components/SequenceAlignmentView.js';
import { useCountUp } from '../hooks/useMotionEnabled.js';
import { SUPPORTED_PAMS, TEST_VECTOR } from '../shared/crisprEngine.js';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import { AnalyzeApiResponse, AppPage, ExampleItem, PamType, SiteMatch } from '../types/crispr.js';

interface SimulatorPageProps {
  initialState?: {
    dna?: string;
    guide?: string;
    pam?: PamType;
    maxMm?: number;
    autoPlay?: boolean;
  } | null;
  onAnalysisComplete?: (result: AnalyzeApiResponse) => void;
  onSendToCompare?: (dna: string, guide: string, pam: PamType, maxMm: number) => void;
  onNavigate: (page: AppPage) => void;
  motionEnabled?: boolean;
  language?: AppLanguage;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  initialState,
  onAnalysisComplete,
  onSendToCompare,
  motionEnabled = true,
  language = 'en',
}) => {
  const t = UI_STRINGS[language];
  const [dnaInput, setDnaInput] = useState<string>(initialState?.dna || TEST_VECTOR.dna);
  const [guideInput, setGuideInput] = useState<string>(initialState?.guide || TEST_VECTOR.guide);
  const [pam, setPam] = useState<PamType>(initialState?.pam || TEST_VECTOR.pam);
  const [maxMm, setMaxMm] = useState<number>(initialState?.maxMm ?? TEST_VECTOR.maxMm);

  const [examples, setExamples] = useState<ExampleItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeApiResponse | null>(null);
  const [selectedSiteIdx, setSelectedSiteIdx] = useState<number | null>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoPlay3D, setAutoPlay3D] = useState<boolean>(Boolean(initialState?.autoPlay));

  useEffect(() => {
    fetch('/api/examples')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.examples)) setExamples(data.examples);
      })
      .catch(() => {});
  }, []);

  const runAnalysis = async (
    targetDna: string,
    targetGuide: string,
    targetPam: PamType,
    targetMaxMm: number
  ) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dna: targetDna,
          guide: targetGuide,
          pam: targetPam,
          max_mm: targetMaxMm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Validation failed.');
        setAnalysis(null);
        setSelectedSiteIdx(null);
        return;
      }
      const typed = data as AnalyzeApiResponse;
      setAnalysis(typed);
      setSelectedSiteIdx(typed.sites.length > 0 ? 0 : null);
      onAnalysisComplete?.(typed);
    } catch {
      setErrorMsg('Unable to reach the local GuideWise simulation server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextDna = initialState?.dna || TEST_VECTOR.dna;
    const nextGuide = initialState?.guide || TEST_VECTOR.guide;
    const nextPam = initialState?.pam || TEST_VECTOR.pam;
    const nextMaxMm = initialState?.maxMm ?? TEST_VECTOR.maxMm;
    setDnaInput(nextDna);
    setGuideInput(nextGuide);
    setPam(nextPam);
    setMaxMm(nextMaxMm);
    setAutoPlay3D(Boolean(initialState?.autoPlay));
    runAnalysis(nextDna, nextGuide, nextPam, nextMaxMm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialState]);

  const handleLoadExample = (ex: ExampleItem) => {
    setDnaInput(ex.dna);
    setGuideInput(ex.guide);
    setPam(ex.pam);
    setMaxMm(ex.max_mm);
    runAnalysis(ex.dna, ex.guide, ex.pam, ex.max_mm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAnalysis(dnaInput, guideInput, pam, maxMm);
  };

  const selectedSite: SiteMatch | null =
    analysis && selectedSiteIdx !== null ? analysis.sites[selectedSiteIdx] ?? null : null;

  const totalSitesTarget = analysis?.sites.length ?? 0;
  const bestScoreTarget = analysis?.summary.bestScore ?? 0;
  const activeCutTarget = selectedSite?.pamOk ? selectedSite.cut : analysis?.sites[0]?.pamOk ? analysis.sites[0].cut : 0;

  const countSites = useCountUp(totalSitesTarget, motionEnabled, 450, 0);
  const countBestScore = useCountUp(bestScoreTarget, motionEnabled, 550, 1);
  const countCutPos = useCountUp(activeCutTarget, motionEnabled, 480, 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-[#e8f3f1] gw-page-title">
            {t.simTitle}
          </h1>
          <p className="text-sm text-[#8aa4ad]">
            {t.simSubtitle}
          </p>
        </div>

        {analysis && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSendToCompare?.(analysis.dna, analysis.guide, analysis.pam, analysis.max_mm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer whitespace-nowrap"
            >
              <GitCompare className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
              Compare guides
            </button>
            <a
              href={`/api/report/${analysis.runId}.pdf`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#c6ff3d]" aria-hidden="true" />
              PDF Report
            </a>
            <a
              href={`/api/report/${analysis.runId}.csv`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#7c5cff]" aria-hidden="true" />
              CSV
            </a>
          </div>
        )}
      </div>

      {/* 3 Gradient Hero Tiles with Count-Up Numbers (Reference Image 2 Style) */}
      <section aria-label="Simulation summary metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gw-tile-cyan rounded-[20px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#c7d8d6]">Sites found</div>
            <div className="text-3xl sm:text-4xl font-display font-bold font-mono tabular-nums text-[#e8f3f1]">
              {loading ? '—' : countSites}
            </div>
            <div className="text-xs text-[#22d3ee] font-mono">
              {analysis ? `${analysis.summary.validPamSites} valid PAM` : 'Awaiting input'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Target className="w-5 h-5 text-[#22d3ee]" aria-hidden="true" />
          </div>
        </div>

        <div className="gw-tile-lime rounded-[20px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#c7d8d6]">Best educational score</div>
            <div className="text-3xl sm:text-4xl font-display font-bold font-mono tabular-nums text-[#c6ff3d]">
              {loading ? '—' : countBestScore}
            </div>
            <div className="text-xs text-[#c7d8d6]">Educational estimate (0–100)</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#c6ff3d]" aria-hidden="true" />
          </div>
        </div>

        <div className="gw-tile-magenta rounded-[20px] p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-[#c7d8d6]">Cut position</div>
            <div className="text-3xl sm:text-4xl font-display font-bold font-mono tabular-nums text-[#e8f3f1]">
              {loading ? '—' : activeCutTarget > 0 ? `bp ${countCutPos}` : 'None'}
            </div>
            <div className="text-xs text-[#ff8ac2] font-mono">3 bp before valid PAM</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-[#ff4fa3]" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Main Workspace: Inputs Left + Large Glass 3D Viewport Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Step 1: Input Form */}
        <GlassCard className="xl:col-span-4 p-5 flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4 flex flex-col justify-between h-full">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#e8f3f1] flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
                    1. Load synthetic demo
                  </label>
                  <span className="text-[11px] text-[#8aa4ad]">Built-in</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {examples.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleLoadExample(ex)}
                      title={ex.notes}
                      className="text-left px-3 py-2 rounded-xl border border-white/10 bg-[#050a14]/70 hover:border-[#22d3ee]/50 hover:bg-white/[0.04] transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#e8f3f1]">
                        <span className="truncate">{ex.name}</span>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full font-mono text-[10px] ${
                            ex.type === 'positive'
                              ? 'bg-[#3ddc84]/15 text-[#3ddc84]'
                              : ex.type === 'negative'
                              ? 'bg-[#ffb020]/15 text-[#ffb020]'
                              : 'bg-[#ff4d6d]/15 text-[#ff4d6d]'
                          }`}
                        >
                          {ex.type === 'positive' ? 'Positive' : ex.type === 'negative' ? 'Negative' : 'Invalid'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8aa4ad] line-clamp-1">{ex.notes}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="dna-input" className="font-medium text-[#e8f3f1]">
                    2. Synthetic DNA (5&apos; → 3&apos;)
                  </label>
                  <span className="font-mono text-[#8aa4ad]">FASTA / plain · ≥30 bp</span>
                </div>
                <textarea
                  id="dna-input"
                  rows={4}
                  value={dnaInput}
                  onChange={(e) => setDnaInput(e.target.value)}
                  spellCheck={false}
                  placeholder="Paste synthetic A/C/G/T sequence or FASTA..."
                  className="w-full rounded-xl border border-white/15 bg-[#050a14]/80 px-3 py-2.5 text-xs font-mono text-[#e8f3f1] placeholder-[#8aa4ad]/60 focus:border-[#c6ff3d] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="guide-input" className="font-medium text-[#e8f3f1]">
                    3. Guide RNA spacer (5&apos; → 3&apos;)
                  </label>
                  <span className="font-mono text-[#8aa4ad]">15–25 nt (U → T)</span>
                </div>
                <input
                  id="guide-input"
                  type="text"
                  value={guideInput}
                  onChange={(e) => setGuideInput(e.target.value)}
                  spellCheck={false}
                  placeholder="e.g. GATCCGTAACGGTTCAGCTA"
                  className="w-full rounded-xl border border-white/15 bg-[#050a14]/80 px-3 py-2.5 text-xs font-mono text-[#e8f3f1] placeholder-[#8aa4ad]/60 focus:border-[#c6ff3d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="pam-select" className="block text-xs font-medium text-[#e8f3f1]">
                    4. 3&apos; PAM motif
                  </label>
                  <select
                    id="pam-select"
                    value={pam}
                    onChange={(e) => setPam(e.target.value as PamType)}
                    className="w-full rounded-xl border border-white/15 bg-[#050a14]/80 px-3 py-2.5 text-xs font-mono text-[#e8f3f1] focus:border-[#c6ff3d] focus:outline-none"
                  >
                    {(Object.keys(SUPPORTED_PAMS) as PamType[]).map((key) => (
                      <option key={key} value={key}>
                        {SUPPORTED_PAMS[key].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="mm-slider" className="font-medium text-[#e8f3f1] flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
                      Max mismatches
                    </label>
                    <span className="font-mono font-semibold text-[#c6ff3d] tabular-nums">
                      {maxMm} bp
                    </span>
                  </div>
                  <input
                    id="mm-slider"
                    type="range"
                    min={0}
                    max={6}
                    step={1}
                    value={maxMm}
                    onChange={(e) => setMaxMm(Number(e.target.value))}
                    className="w-full accent-[#c6ff3d] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#ff4d6d]/60 bg-[#ff4d6d]/12 px-3.5 py-2.5 text-xs text-[#ffb3c1] flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-[#ff4d6d] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <MagneticButton
                type="submit"
                disabled={loading}
                motionEnabled={motionEnabled}
                variant="lime"
                className="w-full px-4 py-3 text-sm"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                {loading ? 'Analyzing synthetic DNA...' : 'Analyze sequence'}
              </MagneticButton>
            </div>
          </form>
        </GlassCard>

        {/* Step 2: Large Glass 3D Viewport */}
        <GlassCard className="xl:col-span-8 p-2 flex flex-col">
          <DnaHelixViewport
            dna={analysis?.dna || TEST_VECTOR.dna}
            sites={analysis?.sites || []}
            selectedSiteIndex={selectedSiteIdx}
            onSelectSite={(idx) => setSelectedSiteIdx(idx)}
            mode="simulator"
            reducedMotion={!motionEnabled}
            autoPlay={autoPlay3D}
            className="flex-1 min-h-[460px] lg:min-h-[540px]"
          />
        </GlassCard>
      </div>

      {/* Loading Skeleton State */}
      {loading && (
        <GlassCard className="p-6 space-y-4">
          <div className="h-6 w-56 rounded-lg gw-skeleton" />
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-16 rounded-xl gw-skeleton" />
            ))}
          </div>
          <div className="h-36 rounded-xl gw-skeleton" />
        </GlassCard>
      )}

      {/* Sequence Stats + Target Map + Results Table */}
      {!loading && analysis && (
        <>
          <section aria-label="Sequence composition" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <GlassCard className="px-4 py-3">
              <div className="text-xs text-[#8aa4ad]">Length</div>
              <div className="text-xl font-mono font-semibold text-[#e8f3f1] tabular-nums mt-0.5">
                {analysis.stats.length} <span className="text-xs text-[#8aa4ad]">bp</span>
              </div>
            </GlassCard>
            <GlassCard className="px-4 py-3">
              <div className="text-xs text-[#8aa4ad]">GC Content</div>
              <div className="text-xl font-mono font-semibold text-[#22d3ee] tabular-nums mt-0.5">
                {analysis.stats.gcPercent.toFixed(1)}%
              </div>
            </GlassCard>
            <GlassCard className="px-4 py-3">
              <div className="text-xs text-[#ff5d8f]">Adenine (A)</div>
              <div className="text-xl font-mono font-semibold text-[#e8f3f1] tabular-nums mt-0.5">
                {analysis.stats.counts.A}
              </div>
            </GlassCard>
            <GlassCard className="px-4 py-3">
              <div className="text-xs text-[#ffb020]">Thymine (T)</div>
              <div className="text-xl font-mono font-semibold text-[#e8f3f1] tabular-nums mt-0.5">
                {analysis.stats.counts.T}
              </div>
            </GlassCard>
            <GlassCard className="px-4 py-3">
              <div className="text-xs text-[#3ddc84]">Guanine (G)</div>
              <div className="text-xl font-mono font-semibold text-[#e8f3f1] tabular-nums mt-0.5">
                {analysis.stats.counts.G}
              </div>
            </GlassCard>
            <GlassCard className="px-4 py-3">
              <div className="text-xs text-[#4cc9ff]">Cytosine (C)</div>
              <div className="text-xl font-mono font-semibold text-[#e8f3f1] tabular-nums mt-0.5">
                {analysis.stats.counts.C}
              </div>
            </GlassCard>
          </section>

          {/* Interactive Target Map */}
          <GlassCard className="p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#e8f3f1]">
                  Target Region Map (1-based coordinates)
                </h2>
                <p className="text-xs text-[#8aa4ad]">
                  Click any site block to focus the 3D scanner and inspect base pairing.
                </p>
              </div>
              <span className="text-xs font-mono text-[#8aa4ad]">
                Run #{analysis.runId} · {analysis.sites.length} site(s)
              </span>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#050a14]/75 p-4 space-y-4">
              {(['+', '-'] as const).map((strand) => (
                <div key={strand} className="space-y-1.5">
                  <div className="text-[11px] font-mono text-[#8aa4ad]">
                    {strand === '+' ? 'Forward strand (+) 5′ → 3′' : 'Reverse complement (-) 3′ ← 5′'}
                  </div>
                  <div className="relative h-8 rounded-lg bg-white/[0.03] border border-white/10 overflow-hidden">
                    {analysis.sites.map((site, idx) => {
                      if (site.strand !== strand) return null;
                      const leftPct = ((site.start - 1) / analysis.dna.length) * 100;
                      const widthPct = Math.max(2, ((site.end - site.start + 1) / analysis.dna.length) * 100);
                      const isSelected = idx === selectedSiteIdx;
                      const bg = !site.pamOk
                        ? 'bg-[#8aa4ad]'
                        : site.mismatches === 0
                        ? 'bg-[#3ddc84]'
                        : site.mismatches <= 2
                        ? 'bg-[#ffb020]'
                        : 'bg-[#ff4d6d]';
                      return (
                        <button
                          key={`map-${strand}-${idx}`}
                          type="button"
                          onClick={() => setSelectedSiteIdx(idx)}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                          title={`${strand} ${site.start}-${site.end} | ${site.mismatches} MM | PAM ${site.pam} | Score ${site.score.toFixed(1)}`}
                          className={`absolute top-1 bottom-1 rounded text-[10px] font-mono font-bold text-[#050a14] flex items-center justify-center cursor-pointer ${bg} ${
                            isSelected ? 'ring-2 ring-white z-10' : 'opacity-85 hover:opacity-100'
                          }`}
                        >
                          {site.score.toFixed(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-[11px] font-mono text-[#8aa4ad]">
                <span>1 bp</span>
                <span>{Math.round(analysis.dna.length / 2)} bp</span>
                <span>{analysis.dna.length} bp</span>
              </div>
            </div>
          </GlassCard>

          {/* Results Table with Pill Badges & Educational Context Tooltips */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#e8f3f1]">
                  {language === 'ta' ? 'பொருந்தும் இலக்கு தளங்கள்' : 'Candidate Target Sites'}
                </h2>
                <p className="text-xs text-[#8aa4ad]">
                  {language === 'ta' ? (
                    <>
                      மதிப்பெண்கள் <strong className="text-[#e8f3f1]">கல்வி மதிப்பீடுகள் (educational estimates)</strong> மட்டுமே. ஒவ்வொரு தவறு (mismatch) அல்லது மதிப்பெண் மீது கர்சரைக் கொண்டு சென்றால் விளக்கம் தெரியும்.
                    </>
                  ) : (
                    <>
                      Scores are <strong className="text-[#e8f3f1]">educational estimates</strong>: 100 × exp(-0.5 × penalty) when PAM is valid, else 0.0. Hover any mismatch, PAM badge, or score for penalty reasoning.
                    </>
                  )}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full border border-[#22d3ee]/30 bg-[#22d3ee]/10 text-xs font-mono text-[#22d3ee]">
                Valid PAM: {analysis.summary.validPamSites} · Perfect: {analysis.summary.perfectMatches}
              </span>
            </div>

            {analysis.sites.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#8aa4ad]">
                No matching windows found within ≤ {analysis.max_mm} mismatches. Increase Max mismatches or switch PAM motif to explore nearby sequences.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-[#050a14]/70 text-xs font-medium text-[#8aa4ad]">
                      <th className="py-3 px-4">Strand</th>
                      <th className="py-3 px-4">Coords (1-based)</th>
                      <th className="py-3 px-4">Mismatches</th>
                      <th className="py-3 px-4">Mismatch Pos</th>
                      <th className="py-3 px-4">PAM Status</th>
                      <th className="py-3 px-4">Cut Site</th>
                      <th className="py-3 px-4 text-right">Educational Estimate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {analysis.sites.map((site, idx) => {
                      const isSelected = idx === selectedSiteIdx;
                      const gLen = site.guideSeq.length;
                      const seedStartPos1 = Math.max(1, gLen - 9);
                      const distalMismatches = Math.max(0, site.mismatches - site.seedMismatches);

                      const scorePill = !site.pamOk
                        ? 'bg-white/10 border-white/15 text-[#8aa4ad]'
                        : site.mismatches === 0
                        ? 'bg-[#3ddc84]/20 border-[#3ddc84]/45 text-[#3ddc84]'
                        : site.mismatches <= 2
                        ? 'bg-[#ffb020]/20 border-[#ffb020]/45 text-[#ffb020]'
                        : 'bg-[#ff4d6d]/20 border-[#ff4d6d]/45 text-[#ff4d6d]';
                      const mmPill =
                        site.mismatches === 0
                          ? 'bg-[#3ddc84]/15 text-[#3ddc84]'
                          : site.mismatches <= 2
                          ? 'bg-[#ffb020]/15 text-[#ffb020]'
                          : 'bg-[#ff4d6d]/15 text-[#ff4d6d]';

                      const scoreTone: 'slate' | 'lime' | 'amber' | 'rose' = !site.pamOk
                        ? 'slate'
                        : site.mismatches === 0
                        ? 'lime'
                        : site.mismatches <= 2
                        ? 'amber'
                        : 'rose';

                      const mmTone: 'lime' | 'amber' | 'rose' =
                        site.mismatches === 0 ? 'lime' : site.mismatches <= 2 ? 'amber' : 'rose';

                      return (
                        <tr
                          key={`${site.strand}-${site.start}-${idx}`}
                          onClick={() => setSelectedSiteIdx(idx)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#22d3ee]/10' : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-xs text-[#e8f3f1]">
                            {site.strand === '+' ? '+ (fwd)' : '- (rev)'}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#e8f3f1] tabular-nums">
                            {site.start}–{site.end}
                          </td>
                          <td className="py-3 px-4">
                            <EducationalTooltip
                              tone={mmTone}
                              motionEnabled={motionEnabled}
                              content={
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="font-display font-semibold text-[#e8f3f1]">
                                      {language === 'ta' ? 'தவறு சுருக்கம் (Mismatch Summary)' : 'Mismatch Penalty Breakdown'}
                                    </span>
                                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/10 text-[#e8f3f1]">
                                      Penalty: {site.penalty}
                                    </span>
                                  </div>
                                  {site.mismatches === 0 ? (
                                    <p className="text-[11px] leading-relaxed text-[#c7d8d6]">
                                      {language === 'ta'
                                        ? `அனைத்து ${gLen} அடிப்படைகளும் இலக்கு DNA-உடன் துல்லியமாகப் பொருந்துகின்றன (0 தவறுகள்).`
                                        : `All ${gLen} spacer bases pair identically with the target window (Hamming distance = 0, penalty = 0).`}
                                    </p>
                                  ) : (
                                    <>
                                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] bg-white/[0.04] rounded-lg p-2 border border-white/10">
                                        <div>
                                          <div className="text-[#ff4d6d]">Seed (pos {seedStartPos1}–{gLen})</div>
                                          <div className="text-[#e8f3f1]">
                                            {site.seedMismatches} × 3 = {site.seedMismatches * 3}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-[#ffb020]">Distal (pos 1–{seedStartPos1 - 1})</div>
                                          <div className="text-[#e8f3f1]">
                                            {distalMismatches} × 1 = {distalMismatches}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8aa4ad]">
                                        {language === 'ta'
                                          ? 'PAM அருகிலுள்ள 10-bp seed பகுதி Cas9 பிணைப்பைத் தொடங்குவதால், அங்கு ஏற்படும் தவறுகளுக்கு 3× அபராதம் அளிக்கப்படுகிறது.'
                                          : 'Cas9 initiates R-loop unwinding at the 10-bp PAM-proximal seed, so seed mismatches receive a 3× weight versus 1× upstream.'}
                                      </p>
                                    </>
                                  )}
                                </div>
                              }
                            >
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full font-mono text-xs font-semibold underline decoration-dotted underline-offset-2 ${mmPill}`}
                              >
                                {site.mismatches} MM
                              </span>
                            </EducationalTooltip>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#c7d8d6]">
                            {site.mismatchPositions.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {site.mismatchPositions.map((pos1) => {
                                  const inSeed = pos1 >= seedStartPos1;
                                  const guideBase = site.guideSeq[pos1 - 1] ?? '?';
                                  const targetBase = site.targetSeq[pos1 - 1] ?? '?';
                                  const posPenalty = inSeed ? 3 : 1;
                                  return (
                                    <EducationalTooltip
                                      key={`mm-pos-${idx}-${pos1}`}
                                      tone={inSeed ? 'rose' : 'amber'}
                                      motionEnabled={motionEnabled}
                                      content={
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-display font-semibold text-[#e8f3f1]">
                                              {language === 'ta'
                                                ? `Guide நிலை ${pos1} / ${gLen}`
                                                : `Guide Position ${pos1} of ${gLen}`}
                                            </span>
                                            <span
                                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                inSeed
                                                  ? 'bg-[#ff4d6d]/20 text-[#ff4d6d]'
                                                  : 'bg-[#ffb020]/20 text-[#ffb020]'
                                              }`}
                                            >
                                              {inSeed ? 'SEED · +3 PENALTY' : 'DISTAL · +1 PENALTY'}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px]">
                                            <span>
                                              Guide: <strong className="text-[#22d3ee]">{guideBase}</strong>
                                            </span>
                                            <span className="text-[#ff4d6d] font-bold">≠</span>
                                            <span>
                                              Target DNA: <strong className="text-[#ffb020]">{targetBase}</strong>
                                            </span>
                                          </div>
                                          <p className="text-[11px] leading-relaxed text-[#c7d8d6]">
                                            {inSeed
                                              ? language === 'ta'
                                                ? `நிலை ${pos1} PAM-அருகிலுள்ள 10-bp seed பகுதியில் (${seedStartPos1}–${gLen}) உள்ளது. Cas9 DNA பிரித்தலை இங்கிருந்தே தொடங்குவதால் +${posPenalty} அதிக அபராதம் அளிக்கப்படுகிறது.`
                                                : `Position ${pos1} sits inside the 10-bp PAM-proximal seed (${seedStartPos1}–${gLen}). Because Cas9 nucleates R-loop unwinding next to the PAM, mismatches here strongly destabilize binding (+${posPenalty} penalty).`
                                              : language === 'ta'
                                              ? `நிலை ${pos1} 5' வெளிப்புறப் பகுதியில் (1–${seedStartPos1 - 1}) உள்ளது. PAM-இலிருந்து தொலைவில் உள்ளதால் Cas9 சற்று சகிப்புத்தன்மை கொண்டது (+${posPenalty} அபராதம்).`
                                              : `Position ${pos1} sits in the 5′ distal region (1–${seedStartPos1 - 1}) upstream of the seed. Cas9 tolerates distal mismatches more readily, applying a +${posPenalty} penalty.`}
                                          </p>
                                        </div>
                                      }
                                    >
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
                                          inSeed
                                            ? 'border-[#ff4d6d]/45 bg-[#ff4d6d]/15 text-[#ff8aa1] hover:bg-[#ff4d6d]/25'
                                            : 'border-[#ffb020]/45 bg-[#ffb020]/15 text-[#ffd175] hover:bg-[#ffb020]/25'
                                        }`}
                                      >
                                        #{pos1}
                                        <span className="text-[9px] opacity-80">
                                          {inSeed ? '×3' : '×1'}
                                        </span>
                                      </span>
                                    </EducationalTooltip>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-[#8aa4ad]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <EducationalTooltip
                              tone={site.pamOk ? 'lime' : 'slate'}
                              motionEnabled={motionEnabled}
                              content={
                                <div className="space-y-1.5">
                                  <div className="font-display font-semibold text-[#e8f3f1]">
                                    {site.pamOk
                                      ? language === 'ta'
                                        ? `செல்லுபடியாகும் 3′ PAM (${site.pam})`
                                        : `Valid 3′ PAM (${site.pam})`
                                      : language === 'ta'
                                      ? `செல்லுபடியாகாத PAM (${site.pam})`
                                      : `Missing / Invalid PAM (${site.pam})`}
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-[#c7d8d6]">
                                    {site.pamOk
                                      ? `Observed 3′ motif ${site.pam} matches the selected ${analysis.pam} rule (${SUPPORTED_PAMS[analysis.pam].description}). Predicted cut sits 3 bp upstream after bp ${site.cut}.`
                                      : `Observed 3′ motif ${site.pam} does not match ${analysis.pam}. Without PAM binding, Cas9 cannot license DNA unwinding, forcing the educational score to 0.0.`}
                                  </p>
                                </div>
                              }
                            >
                              <span className="inline-flex items-center">
                                <span className="text-[#c4b5fd] font-semibold mr-2">{site.pam}</span>
                                {site.pamOk ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3ddc84]/15 text-[#3ddc84]">
                                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                    OK
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[#8aa4ad]">
                                    ✗ No PAM
                                  </span>
                                )}
                              </span>
                            </EducationalTooltip>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-[#e8f3f1] tabular-nums">
                            {site.pamOk ? `cut after ${site.cut}` : <span className="text-[#8aa4ad]">— (no PAM)</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <EducationalTooltip
                              tone={scoreTone}
                              motionEnabled={motionEnabled}
                              content={
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-display font-semibold text-[#e8f3f1]">
                                      {language === 'ta'
                                        ? 'கல்வி மதிப்பெண் கணக்கீடு'
                                        : 'Educational Estimate Calculation'}
                                    </span>
                                    <span className="font-mono font-bold text-[#c6ff3d]">
                                      {site.score.toFixed(1)}
                                    </span>
                                  </div>
                                  {!site.pamOk ? (
                                    <p className="text-[11px] leading-relaxed text-[#c7d8d6]">
                                      {language === 'ta'
                                        ? `3′ PAM (${site.pam}) எதிர்பார்க்கப்பட்ட ${analysis.pam} வடிவத்துடன் பொருந்தாததால், ${site.mismatches} தவறுகள் இருந்தாலும் மதிப்பெண் 0.0 ஆகும்.`
                                        : `PAM gate failed: 3′ sequence ${site.pam} does not match ${analysis.pam}. Even with ${site.mismatches} mismatch(es) (raw penalty ${site.penalty}), a missing PAM yields score 0.0.`}
                                    </p>
                                  ) : (
                                    <>
                                      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 font-mono text-[11px] space-y-1 text-[#c7d8d6]">
                                        <div>
                                          Seed ({site.seedMismatches}×3) + Distal ({distalMismatches}×1) ={' '}
                                          <strong className="text-[#e8f3f1]">penalty {site.penalty}</strong>
                                        </div>
                                        <div className="text-[#22d3ee]">
                                          100 × exp(-0.5 × {site.penalty}) ={' '}
                                          <strong className="text-[#c6ff3d]">{site.score.toFixed(1)}</strong>
                                        </div>
                                      </div>
                                      <p className="text-[11px] leading-relaxed text-[#8aa4ad]">
                                        {site.mismatches === 0
                                          ? 'Zero mismatches with a valid PAM yields the maximum 100.0 educational estimate.'
                                          : 'Exponential decay models reduced estimated specificity as seed and distal penalties accumulate.'}
                                      </p>
                                    </>
                                  )}
                                  <div className="pt-1 border-t border-white/10 text-[10px] text-[#ffb020]">
                                    Educational estimate only — not experimentally validated.
                                  </div>
                                </div>
                              }
                            >
                              <span
                                className={`inline-flex px-3 py-0.5 rounded-full border font-mono text-xs font-bold tabular-nums cursor-help ${scorePill}`}
                              >
                                {site.score.toFixed(1)}
                              </span>
                            </EducationalTooltip>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          <div className="space-y-6">
            <SequenceAlignmentView site={selectedSite} pamPattern={analysis.pam} />
            <HypotheticalEditPanel dna={analysis.dna} site={selectedSite} />
          </div>
        </>
      )}
    </div>
  );
};
