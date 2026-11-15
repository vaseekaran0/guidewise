import React from 'react';
import { AlertTriangle, CheckCircle2, Scissors, XCircle } from 'lucide-react';
import { SiteMatch } from '../types/crispr.js';
import { GlassCard } from './GlassCard.js';

interface SequenceAlignmentViewProps {
  site: SiteMatch | null;
  pamPattern: string;
}

const BASE_TEXT_COLOR: Record<string, string> = {
  A: 'text-[#ff5d8f]',
  T: 'text-[#ffb020]',
  G: 'text-[#3ddc84]',
  C: 'text-[#4cc9ff]',
  U: 'text-[#c084fc]',
};

export const SequenceAlignmentView: React.FC<SequenceAlignmentViewProps> = ({ site, pamPattern }) => {
  if (!site) {
    return (
      <GlassCard className="p-6 text-sm text-[#8aa4ad]">
        Select a candidate site from the results table to inspect its base-by-base alignment, 10-bp seed region, PAM motif, and cut coordinate.
      </GlassCard>
    );
  }

  const gLen = site.guideSeq.length;
  const seedStartPos1 = Math.max(1, gLen - 9);
  const localCutIndex = gLen - 3;

  const statusMeta = !site.pamOk
    ? {
        label: 'No Valid PAM (Score 0.0)',
        color: 'text-[#8aa4ad]',
        pillBg: 'bg-white/5 border-white/15 text-[#8aa4ad]',
        Icon: XCircle,
      }
    : site.mismatches === 0
    ? {
        label: 'Perfect On-Target Match',
        color: 'text-[#3ddc84]',
        pillBg: 'bg-[#3ddc84]/15 border-[#3ddc84]/40 text-[#3ddc84]',
        Icon: CheckCircle2,
      }
    : site.mismatches <= 2
    ? {
        label: `Off-Target Candidate (${site.mismatches} MM)`,
        color: 'text-[#ffb020]',
        pillBg: 'bg-[#ffb020]/15 border-[#ffb020]/40 text-[#ffb020]',
        Icon: AlertTriangle,
      }
    : {
        label: `High-Mismatch Site (${site.mismatches} MM)`,
        color: 'text-[#ff4d6d]',
        pillBg: 'bg-[#ff4d6d]/15 border-[#ff4d6d]/40 text-[#ff4d6d]',
        Icon: AlertTriangle,
      };

  const StatusIcon = statusMeta.Icon;

  return (
    <GlassCard className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-lg font-semibold text-[#e8f3f1]">
              Alignment Inspector
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusMeta.pillBg}`}
            >
              <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {statusMeta.label}
            </span>
          </div>
          <p className="text-xs text-[#8aa4ad] font-mono">
            Strand {site.strand === '+' ? '+ (forward)' : '- (reverse complement)'} · Coords {site.start}–{site.end} (1-based) · PAM {site.pam} ({site.pamOk ? `matches ${pamPattern}` : `invalid for ${pamPattern}`})
          </p>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="text-xs text-[#8aa4ad]">Educational Estimate</div>
            <div className={`text-2xl font-mono font-semibold tabular-nums ${statusMeta.color}`}>
              {site.score.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#8aa4ad]">Penalty</div>
            <div className="text-2xl font-mono font-semibold tabular-nums text-[#e8f3f1]">
              {site.penalty}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal scrollable JetBrains Mono alignment strip */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex flex-col gap-1.5 min-w-max font-mono text-sm">
          {/* Position Header Row */}
          <div className="flex items-center gap-1 text-[11px] text-[#8aa4ad]">
            <span className="w-24 shrink-0">Position</span>
            {site.guideSeq.split('').map((_, idx) => {
              const pos1 = idx + 1;
              const inSeed = pos1 >= seedStartPos1;
              const isCutBoundary = pos1 === localCutIndex;
              return (
                <div
                  key={`reg-${pos1}`}
                  className={`w-7 text-center py-0.5 rounded-t ${
                    inSeed ? 'bg-[#22d3ee]/15 text-[#22d3ee]' : 'text-[#8aa4ad]'
                  } relative`}
                >
                  {pos1}
                  {isCutBoundary && (
                    <span
                      title={`Predicted cut after base ${site.cut}`}
                      className="absolute -right-1 top-0 text-[#c6ff3d]"
                    >
                      ▼
                    </span>
                  )}
                </div>
              );
            })}
            <div className="ml-2 px-2 py-0.5 rounded-lg bg-[#7c5cff]/25 text-[#c4b5fd] text-center min-w-[4.75rem]">
              PAM ({pamPattern})
            </div>
          </div>

          {/* Guide RNA Row */}
          <div className="flex items-center gap-1">
            <span className="w-24 shrink-0 text-xs text-[#8aa4ad]">5&apos; Guide</span>
            {site.guideSeq.split('').map((base, idx) => (
              <div
                key={`g-${idx}`}
                className={`w-7 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-[#050a14]/80 font-semibold ${
                  BASE_TEXT_COLOR[base] ?? 'text-[#e8f3f1]'
                }`}
              >
                {base}
              </div>
            ))}
            <div className="ml-2 h-8 px-2 flex items-center justify-center rounded-lg border border-dashed border-[#7c5cff]/45 text-xs text-[#8aa4ad] min-w-[4.75rem]">
              Cas9 binds
            </div>
          </div>

          {/* Match / Mismatch Bond Row */}
          <div className="flex items-center gap-1">
            <span className="w-24 shrink-0 text-xs text-[#8aa4ad]">Pairing</span>
            {site.guideSeq.split('').map((gBase, idx) => {
              const tBase = site.targetSeq[idx];
              const isMatch = gBase === tBase;
              const pos1 = idx + 1;
              const inSeed = pos1 >= seedStartPos1;
              return (
                <div
                  key={`m-${idx}`}
                  title={
                    isMatch
                      ? `Position ${pos1}: match`
                      : `Position ${pos1}: mismatch (${inSeed ? 'seed penalty 3' : 'distal penalty 1'})`
                  }
                  className={`w-7 h-6 flex items-center justify-center text-xs font-bold ${
                    isMatch ? 'text-[#3ddc84]' : 'text-[#ff4d6d]'
                  }`}
                >
                  {isMatch ? '|' : '×'}
                </div>
              );
            })}
            <div className="ml-2 h-6 flex items-center justify-center text-xs font-semibold min-w-[4.75rem]">
              {site.pamOk ? (
                <span className="text-[#3ddc84]">✓ Valid</span>
              ) : (
                <span className="text-[#8aa4ad]">✗ No PAM</span>
              )}
            </div>
          </div>

          {/* Target DNA Row */}
          <div className="flex items-center gap-1">
            <span className="w-24 shrink-0 text-xs text-[#8aa4ad]">Target 3&apos;</span>
            {site.targetSeq.split('').map((base, idx) => {
              const isMismatch = base !== site.guideSeq[idx];
              const isCutRight = idx + 1 === localCutIndex;
              return (
                <div
                  key={`t-${idx}`}
                  className={`w-7 h-8 flex items-center justify-center rounded-lg font-semibold relative ${
                    isMismatch
                      ? 'bg-[#ff4d6d]/25 border-2 border-[#ff4d6d] text-[#ff4d6d]'
                      : 'border border-white/10 bg-[#050a14]/80 ' + (BASE_TEXT_COLOR[base] ?? 'text-[#e8f3f1]')
                  }`}
                >
                  {base}
                  {isCutRight && site.pamOk && (
                    <span
                      className="absolute -right-[5px] -top-1 -bottom-1 w-[2px] bg-[#c6ff3d]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            })}
            <div
              className={`ml-2 h-8 px-2 flex items-center justify-center rounded-lg font-semibold min-w-[4.75rem] ${
                site.pamOk
                  ? 'bg-[#7c5cff]/30 border border-[#7c5cff] text-[#e8f3f1]'
                  : 'bg-white/5 border border-white/10 text-[#8aa4ad]'
              }`}
            >
              {site.pam}
            </div>
          </div>
        </div>
      </div>

      {/* Plain-language Footer Note */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs text-[#c7d8d6]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-[#22d3ee]/25 border border-[#22d3ee]/60" aria-hidden="true" />
          <span>
            Seed region = last 10 bases ({seedStartPos1}–{gLen}) proximal to PAM (penalty 3; upstream penalty 1).
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[#c6ff3d]">
          <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {site.pamOk
              ? `Predicted cut: after bp ${site.cut} (3 bp before PAM)`
              : 'No cleavage predicted (missing required PAM)'}
          </span>
        </div>
      </div>
    </GlassCard>
  );
};
