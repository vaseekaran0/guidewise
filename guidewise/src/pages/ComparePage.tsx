import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, GitCompare, Plus, Trash2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard.js';
import { MagneticButton } from '../components/MagneticButton.js';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import { SUPPORTED_PAMS, TEST_VECTOR } from '../shared/crisprEngine.js';
import { AnalyzeApiResponse, GuideAnalysisResult, PamType } from '../types/crispr.js';

interface ComparePageProps {
  initialCompare?: {
    dna: string;
    guides: string[];
    pam: PamType;
    maxMm: number;
  } | null;
  onLoadInSimulator: (dna: string, guide: string, pam: PamType, maxMm: number) => void;
  motionEnabled?: boolean;
  language?: AppLanguage;
}

const DEFAULT_COMPARE_GUIDES = [
  TEST_VECTOR.guide,
  'TGGCCATTAGCATGATGCGT',
  'GATCCGTAACGGTTCATCTA',
];

const COMPARE_DEMO_PRESETS: Array<{
  id: string;
  label: string;
  badge: string;
  takeaway: string;
  dna: string;
  guides: string[];
  pam: PamType;
  maxMm: number;
}> = [
  {
    id: 'test-vector',
    label: '1. On-Target vs Off-Target Demo',
    badge: 'NGG · 3 guides',
    takeaway:
      'Compares the exact Test Vector guide (score 100.0) against a 2-mismatch off-target decoy (13.5) and a non-matching control on the same 110-bp target.',
    dna: TEST_VECTOR.dna,
    guides: DEFAULT_COMPARE_GUIDES,
    pam: 'NGG',
    maxMm: 4,
  },
  {
    id: 'seed-vs-distal',
    label: '2. Seed (3×) vs Distal (1×) Penalty',
    badge: 'NGG · Seed Weight',
    takeaway:
      'Shows why position matters: both mutant guides have 2 mismatches against bp 14–33, but mismatches inside the 10-bp PAM-proximal seed score 5.0 vs 36.8 for 5′ distal mismatches.',
    dna: 'ATTGCCATGACTAGATCCGTAACGGTTCAGCTATGGCCATTAGCATGAGCATGCATGCATCGATCGATCGTACGATCGTAGCATGCATGCATCATGGCCAT',
    guides: ['GATCCGTAACGGTTCAGCTA', 'CTTCCGTAACGGTTCAGCTA', 'GATCCGTAACCCTTCAGCTA'],
    pam: 'NGG',
    maxMm: 3,
  },
  {
    id: 'sacas9-nngrrt',
    label: '3. SaCas9 (NNGRRT) PAM Comparison',
    badge: 'NNGRRT · 6-bp PAM',
    takeaway:
      'Demonstrates Staphylococcus aureus Cas9 requiring a stricter 6-base NNGRRT PAM motif downstream of the 20-nt spacer.',
    dna: 'GCGATCGATCCGTAACGGTTCAGCTACAGAATGGCCATTAGCATGATCCGTAACGGTTCAGCTATGAGTTCAGCATGCATGCATCGATCCGTAACGGTTCAGCTAACGAATGC',
    guides: ['GATCCGTAACGGTTCAGCTA', 'AATCCGTAACGGTTCAGCTA'],
    pam: 'NNGRRT',
    maxMm: 3,
  },
];

function getScoreVariant(score: number): 'excellent' | 'good' | 'poor' | 'null' {
  if (score >= 75) return 'excellent';
  if (score >= 25) return 'good';
  if (score > 0) return 'poor';
  return 'null';
}

export const ComparePage: React.FC<ComparePageProps> = ({
  initialCompare,
  onLoadInSimulator,
  motionEnabled = true,
  language = 'en',
}) => {
  const [dna, setDna] = useState<string>(initialCompare?.dna || TEST_VECTOR.dna);
  const [guides, setGuides] = useState<string[]>(
    initialCompare?.guides?.length ? initialCompare.guides : DEFAULT_COMPARE_GUIDES
  );
  const [pam, setPam] = useState<PamType>(initialCompare?.pam || 'NGG');
  const [maxMm, setMaxMm] = useState<number>(initialCompare?.maxMm ?? 4);

  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDemoId, setActiveDemoId] = useState<string>('test-vector');
  const activeDemo = COMPARE_DEMO_PRESETS.find((d) => d.id === activeDemoId) ?? COMPARE_DEMO_PRESETS[0];

  const runComparison = async (
    targetDna: string,
    guideList: string[],
    targetPam: PamType,
    targetMaxMm: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dna: targetDna,
          guides: guideList,
          pam: targetPam,
          max_mm: targetMaxMm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Comparison failed validation.');
        setResult(null);
        return;
      }
      setResult(data as AnalyzeApiResponse);
    } catch {
      setError('Unable to reach GuideWise comparison server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runComparison(dna, guides, pam, maxMm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddGuide = () => {
    if (guides.length >= 6) return;
    setGuides((prev) => [...prev, '']);
  };

  const handleRemoveGuide = (idx: number) => {
    if (guides.length <= 2) return;
    setGuides((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGuideChange = (idx: number, val: string) => {
    setGuides((prev) => prev.map((g, i) => (i === idx ? val : g)));
  };

  const handleLoadDemoPreset = (preset: (typeof COMPARE_DEMO_PRESETS)[number]) => {
    setActiveDemoId(preset.id);
    setDna(preset.dna);
    setGuides(preset.guides);
    setPam(preset.pam);
    setMaxMm(preset.maxMm);
    runComparison(preset.dna, preset.guides, preset.pam, preset.maxMm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runComparison(dna, guides, pam, maxMm);
  };

  const rankedResults: Array<GuideAnalysisResult & { offTargetValid: number }> = result
    ? [...result.resultsByGuide]
        .map((gr) => {
          const offTargetValid = gr.sites.filter((s) => s.pamOk && s.mismatches > 0).length;
          return { ...gr, offTargetValid };
        })
        .sort((a, b) => {
          if (b.summary.bestScore !== a.summary.bestScore) {
            return b.summary.bestScore - a.summary.bestScore;
          }
          return a.offTargetValid - b.offTargetValid;
        })
    : [];

  const EmptyState = () => (
    <div className="gw-empty-state">
      <div className="gw-empty-icon" aria-hidden="true">
        <GitCompare className="w-8 h-8" />
      </div>
      <h2 className="gw-empty-title">
        {language === 'ta' ? 'Guide RNA ஒப்பீடு' : 'Ready to Compare Guides'}
      </h2>
      <p className="gw-empty-description">
        {language === 'ta'
          ? '2 முதல் 6 guide RNA வரிசைகளை ஒரே செயற்கை DNA வரிசையோடு ஒப்பிட்டு, அனைத்து பொருத்தங்களையும் ஒரே வரைபடத்தில் ஆராயுங்கள்.'
          : 'Compare 2 to 6 candidate guide RNAs against the same synthetic DNA sequence and inspect all hits on a single coordinate map.'}
      </p>
    </div>
  );

  const ErrorState = () => (
    <div className="gw-error-state">
      <div className="gw-error-icon" aria-hidden="true">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="gw-error-title">{language === 'ta' ? 'சரிவு' : 'Comparison Failed'}</h2>
      <p className="gw-error-description">{error}</p>
      <button
        type="button"
        onClick={() => runComparison(dna, guides, pam, maxMm)}
        className="gw-btn-lime px-5 py-2 rounded-xl text-xs font-semibold hover:opacity-90"
      >
        Try Again
      </button>
    </div>
  );

  const LoadingSkeleton = () => (
    <div className="gw-loading-container">
      <div className="gw-loading-spinner" aria-label="Loading" />
      <div className="gw-skeleton-text long" />
      <div className="gw-skeleton-text medium" />
      <div className="gw-skeleton-text short" />
      <div className="gw-skeleton-table-row">
        <div className="gw-skeleton-cell mini" />
        <div className="flex-1">
          <div className="gw-skeleton-text medium" />
          <div className="gw-skeleton-text short" />
        </div>
      </div>
      <div className="gw-skeleton-table-row">
        <div className="gw-skeleton-cell mini" />
        <div className="flex-1">
          <div className="gw-skeleton-text medium" />
          <div className="gw-skeleton-text short" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Premium Hero Header */}
      <div className="space-y-2">
        <div className="gw-section-header">
          <div>
            <h1 className="font-display font-bold text-[#e8f3f1] gw-page-title">
          {UI_STRINGS[language].compareTitle}
        </h1>
        <p className="text-sm text-[#8aa4ad]">
          {language === 'ta'
            ? 'ஒரே செயற்கை DNA வரிசையில் 2 முதல் 6 guide RNA-களை அருகருகே ஒப்பிட்டு ஒரே வரைபடத்தில் இலக்குகளைக் காண்க.'
            : 'Compare 2 to 6 candidate guide RNAs side by side against the same synthetic DNA sequence and inspect all hits on a single coordinate map.'}
            </p>
          </div>
          <span className="gw-rank-badge primary">Compare</span>
        </div>
      </div>

      {/* Results Summary Strip */}
      {!loading && result && (
        <div className="gw-summary-strip">
          <div className="gw-summary-item">
            <div className="gw-summary-label">Guides Compared</div>
            <div className="gw-summary-value muted">{rankedResults.length}</div>
            <div className="gw-summary-subvalue">candidate sequences</div>
          </div>
          <div className="gw-summary-item">
            <div className="gw-summary-label">Best Score</div>
            <div className={`gw-summary-value ${getScoreVariant(rankedResults[0]?.summary.bestScore ?? 0) === 'excellent' ? 'ok' : getScoreVariant(rankedResults[0]?.summary.bestScore ?? 0) === 'good' ? 'warn' : 'poor'}`}>
              {(rankedResults[0]?.summary.bestScore ?? 0).toFixed(1)}
            </div>
            <div className="gw-summary-subvalue">educational estimate</div>
          </div>
          <div className="gw-summary-item">
            <div className="gw-summary-label">Total Sites</div>
            <div className="gw-summary-value ok">{rankedResults.reduce((sum, gr) => sum + gr.sites.length, 0)}</div>
            <div className="gw-summary-subvalue">across all guides</div>
          </div>
          <div className="gw-summary-item">
            <div className="gw-summary-label">DNA Length</div>
            <div className="gw-summary-value muted">{result.dna.length} bp</div>
            <div className="gw-summary-subvalue">PAM: {result.pam}</div>
          </div>
        </div>
      )}

      {/* Quick Demo Presets Strip */}
      <GlassCard className="gw-results-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#e8f3f1]">
              Ready-to-Explain Demo Examples
            </span>
            <span className="text-[10px] font-mono text-[#22d3ee] bg-[#22d3ee]/10 px-2 py-0.5 rounded-full border border-[#22d3ee]/20">
              {activeDemo.badge}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMPARE_DEMO_PRESETS.map((preset) => {
            const active = preset.id === activeDemoId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadDemoPreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer ${
                  active
                    ? 'border-[#c6ff3d] bg-[#c6ff3d] text-[#050a14] font-semibold shadow-[0_0_16px_-4px_rgba(198,255,61,0.4)]'
                    : 'border-white/15 bg-white/5 text-[#c7d8d6] hover:border-[#22d3ee]/50 hover:text-[#e8f3f1] hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.25)]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[#8aa4ad] leading-relaxed">
          <span className="inline-flex items-center gap-1 text-[#22d3ee]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee]" aria-hidden="true" />
            Demo takeaway:
          </span>
          {' '}
          {activeDemo.takeaway}
        </p>
      </GlassCard>

      {/* Input Panel */}
      <GlassCard className="gw-results-card p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <div className="gw-form-group">
              <label htmlFor="compare-dna" className="gw-form-label">
                Shared Synthetic DNA
              </label>
              <textarea
                id="compare-dna"
                rows={5}
                value={dna}
                onChange={(e) => setDna(e.target.value)}
                spellCheck={false}
                className="w-full rounded-xl border border-white/15 bg-[#050a14]/80 px-3 py-2.5 text-xs font-mono text-[#e8f3f1] focus:border-[#c6ff3d] focus:outline-none transition-all duration-200"
              />
              <p className="gw-form-hint">FASTA or plain A/C/G/T sequence, minimum 30 bp</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="gw-form-group">
                <label htmlFor="compare-pam" className="gw-form-label">PAM Motif</label>
                <select
                  id="compare-pam"
                  value={pam}
                  onChange={(e) => setPam(e.target.value as PamType)}
                  className="w-full rounded-xl border border-white/15 bg-[#050a14]/80 px-3 py-2 text-xs font-mono text-[#e8f3f1] focus:border-[#c6ff3d] focus:outline-none transition-all duration-200"
                >
                  {(Object.keys(SUPPORTED_PAMS) as PamType[]).map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="gw-form-group">
                <label htmlFor="compare-mm" className="gw-form-label">Max Mismatches</label>
                <input
                  id="compare-mm"
                  type="range"
                  min={0}
                  max={6}
                  value={maxMm}
                  onChange={(e) => setMaxMm(Number(e.target.value))}
                  className="w-full accent-[#c6ff3d] mt-2 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8aa4ad] mt-1">
                  <span>0</span>
                  <span className="font-mono text-[#c6ff3d]">{maxMm}</span>
                  <span>6</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#e8f3f1]">
                Candidate guide RNAs (15–25 bases each)
              </span>
              <button
                type="button"
                onClick={handleAddGuide}
                disabled={guides.length >= 6}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border transition-all duration-200 cursor-pointer ${
                  guides.length >= 6
                    ? 'border-white/10 bg-white/5 text-[#8aa4ad] opacity-40 cursor-not-allowed'
                    : 'border-white/15 bg-white/5 text-[#22d3ee] hover:border-[#22d3ee]/50 hover:text-[#e8f3f1] hover:shadow-[0_0_16px_-4px_rgba(34,211,238,0.3)]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="text-xs">Add guide ({guides.length}/6)</span>
              </button>
            </div>

            <div className="space-y-2">
              {guides.map((g, idx) => (
                <div key={`guide-row-${idx}`} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-[#8aa4ad] bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      G#{idx + 1}
                    </span>
                  </span>
                  <input
                    type="text"
                    value={g}
                    onChange={(e) => handleGuideChange(idx, e.target.value)}
                    spellCheck={false}
                    placeholder="Enter 15-25 nt guide sequence..."
                    className="flex-1 rounded-xl border border-white/15 bg-[#050a14]/80 px-3 py-2 text-xs font-mono text-[#e8f3f1] focus:border-[#c6ff3d] focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGuide(idx)}
                    disabled={guides.length <= 2}
                    aria-label={`Remove guide ${idx + 1}`}
                    className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                      guides.length <= 2
                        ? 'border-white/10 text-[#8aa4ad] opacity-40 cursor-not-allowed'
                        : 'border-white/15 text-[#ff4d6d] hover:bg-[#ff4d6d]/10 hover:border-[#ff4d6d]/50'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              {error ? (
                <div className="flex items-center gap-2 text-xs text-[#ff4d6d]">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              ) : (
                <span className="text-xs text-[#8aa4ad] font-mono">
                  Scores are educational estimates comparing seed complementarity and PAM validity.
                </span>
              )}

              <MagneticButton
                type="submit"
                disabled={loading}
                motionEnabled={motionEnabled}
                variant="lime"
                className="px-5 py-2.5 text-sm font-semibold"
              >
                <GitCompare className="w-4 h-4" aria-hidden="true" />
                {loading ? 'Comparing guides...' : 'Compare guides'}
              </MagneticButton>
            </div>
          </div>
        </form>
      </GlassCard>

      {/* Loading / Empty / Error States */}
      {loading && <LoadingSkeleton />}
      {!loading && !result && !error && <EmptyState />}
      {!loading && !result && error && <ErrorState />}

      {/* Side-by-Side Guide Cards */}
      {!loading && result && (
        <div>
          <div className="gw-section-header">
            <div>
              <h2 className="gw-section-title">Guide Ranking Cards</h2>
              <p className="gw-section-subtitle">
                Ranked by educational estimate score, with off-target validity and site distribution.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#8aa4ad]">{rankedResults.length} guide(s) ranked</span>
          </div>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rankedResults.map((gr, idx) => {
              const scoreVariant = getScoreVariant(gr.summary.bestScore);
              const scoreColor = scoreVariant === 'excellent' ? 'text-[#3ddc84]' : scoreVariant === 'good' ? 'text-[#ffb020]' : 'text-[#ff4d6d]';
              return (
                <GlassCard
                  key={`card-${gr.guide}-${idx}`}
                  tilt
                  motionEnabled={motionEnabled}
                  className="gw-results-card p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`gw-rank-badge ${idx === 0 ? 'primary' : 'secondary'}`}>
                        #{idx + 1}
                      </div>
                      <span className="text-xs font-mono text-[#8aa4ad]">
                        {gr.sites.length} site(s)
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full border text-xs font-mono font-semibold border-[#3ddc84]/35 text-[#3ddc84] bg-[#3ddc84]/10">
                      Ranked
                    </span>
                  </div>
                  <div className="font-mono text-xs sm:text-sm text-[#e8f3f1] break-all bg-[#050a14]/70 rounded-xl px-3 py-2 border border-white/10">
                    {gr.guide}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-[#8aa4ad] uppercase tracking-wider">Best Est. Score</span>
                        <span className={`font-mono font-bold text-sm ${scoreColor}`}>{gr.summary.bestScore.toFixed(1)}</span>
                      </div>
                      <span className={`gw-score-pill ${scoreVariant}`}>
                        {scoreVariant === 'excellent' ? 'Excellent' : scoreVariant === 'good' ? 'Good' : scoreVariant === 'poor' ? 'Poor' : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#8aa4ad] uppercase tracking-wider">Off-targets</span>
                      <span className="font-mono font-bold text-sm text-[#ffb020]">{gr.offTargetValid}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8aa4ad] mb-1">
                      <span>Perfect (0 MM)</span>
                      <span className="font-mono text-[#e8f3f1]">{gr.summary.perfectMatches}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8aa4ad]">
                      <span>No-PAM Sites</span>
                      <span className="font-mono text-[#8aa4ad]">{gr.sites.filter((s) => !s.pamOk).length}</span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </section>
        </div>
      )}

      {/* Ranking Table */}
      {result && (
        <GlassCard className="gw-results-card overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-[#e8f3f1]">
              Guide Ranking Table (Educational Estimate)
            </h2>
            <span className="text-xs font-mono text-[#8aa4ad]">
              Run #{result.runId} · DNA {result.dna.length} bp · PAM {result.pam}
            </span>
          </div>

          <div className="gw-table-wrapper">
            <table className="gw-table">
              <thead>
                <tr className="border-b border-white/10 bg-[#050a14]/70 text-xs text-[#8aa4ad]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Guide Sequence (5&apos;→3&apos;)</th>
                  <th className="py-3 px-4">Best Score (Ed. Est.)</th>
                  <th className="py-3 px-4">Perfect (0 MM)</th>
                  <th className="py-3 px-4">Valid PAM Off-Targets</th>
                  <th className="py-3 px-4">No-PAM Sites</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rankedResults.map((gr, rankIdx) => {
                  const noPamCount = gr.sites.filter((s) => !s.pamOk).length;
                  return (
                    <tr key={gr.guide + rankIdx} className="hover:bg-white/[0.04]">
                      <td className="py-3 px-4 font-mono text-xs text-[#c6ff3d] font-semibold">
                        #{rankIdx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#e8f3f1]">{gr.guide}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#3ddc84]/15 border border-[#3ddc84]/40 font-mono text-xs font-semibold tabular-nums text-[#3ddc84]">
                          {gr.summary.bestScore.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#e8f3f1]">
                        {gr.summary.perfectMatches}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#ffb020]">
                        {gr.offTargetValid}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#8aa4ad]">
                        {noPamCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onLoadInSimulator(result.dna, gr.guide, result.pam, result.max_mm)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#22d3ee] hover:underline cursor-pointer"
                        >
                          Open in 3D
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Unified Coordinate Map */}
      {result && (
        <GlassCard className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#e8f3f1]">
                Unified Target Site Map
              </h2>
              <p className="text-xs text-[#8aa4ad]">
                All candidate sites plotted across 1–{result.dna.length} bp (top bar = + strand, bottom bar = - strand per guide).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#c7d8d6]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3ddc84]" aria-hidden="true" />
                0 MM (Valid PAM)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ffb020]" aria-hidden="true" />
                1–2 MM
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ff4d6d]" aria-hidden="true" />
                3+ MM
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#8aa4ad]" aria-hidden="true" />
                No PAM (0.0)
              </span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-[#050a14]/75 p-4">
            {rankedResults.map((gr, idx) => (
              <div
                key={`lane-${idx}`}
                className="space-y-1.5 pb-2 border-b border-white/10 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#e8f3f1]">
                    #{idx + 1} · {gr.guide}
                  </span>
                  <span className="text-[#8aa4ad]">
                    {gr.sites.length} site(s) · Best {gr.summary.bestScore.toFixed(1)}
                  </span>
                </div>
                <div className="relative h-9 rounded-lg bg-white/[0.03] border border-white/10 overflow-hidden">
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" aria-hidden="true" />
                  {gr.sites.map((s, sIdx) => {
                    const leftPct = ((s.start - 1) / result.dna.length) * 100;
                    const widthPct = Math.max(1.8, ((s.end - s.start + 1) / result.dna.length) * 100);
                    const bg = !s.pamOk
                      ? 'bg-[#8aa4ad]'
                      : s.mismatches === 0
                      ? 'bg-[#3ddc84]'
                      : s.mismatches <= 2
                      ? 'bg-[#ffb020]'
                      : 'bg-[#ff4d6d]';
                    return (
                      <div
                        key={`hit-${idx}-${sIdx}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        title={`${s.strand} ${s.start}-${s.end} | ${s.mismatches} MM | PAM ${s.pam} | Score ${s.score.toFixed(1)}`}
                        className={`absolute ${
                          s.strand === '+' ? 'top-0.5 bottom-[52%]' : 'top-[52%] bottom-0.5'
                        } rounded-sm ${bg} text-[9px] font-mono font-bold text-[#050a14] flex items-center justify-center`}
                      >
                        {s.score.toFixed(0)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-between text-[11px] font-mono text-[#8aa4ad] pt-1">
              <span>1 bp</span>
              <span>{Math.round(result.dna.length * 0.25)} bp</span>
              <span>{Math.round(result.dna.length * 0.5)} bp</span>
              <span>{Math.round(result.dna.length * 0.75)} bp</span>
              <span>{result.dna.length} bp</span>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};
