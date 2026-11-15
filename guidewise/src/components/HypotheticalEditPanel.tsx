import React, { useEffect, useState } from 'react';
import { Info, Scissors } from 'lucide-react';
import { HypotheticalEditResult, SiteMatch } from '../types/crispr.js';
import { GlassCard } from './GlassCard.js';

interface HypotheticalEditPanelProps {
  dna: string;
  site: SiteMatch | null;
}

function splitTriplets(seq: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < seq.length; i += 3) {
    out.push(seq.slice(i, i + 3));
  }
  return out;
}

export const HypotheticalEditPanel: React.FC<HypotheticalEditPanelProps> = ({ dna, site }) => {
  const [insertedBase, setInsertedBase] = useState<'A' | 'C' | 'G' | 'T'>('A');
  const [editResult, setEditResult] = useState<HypotheticalEditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!site || !site.pamOk || !dna) {
      setEditResult(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/simulate-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dna,
        cut: site.cut,
        strand: site.strand,
        insertedBase,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to compute hypothetical edit.');
        return data as HypotheticalEditResult;
      })
      .then((data) => {
        if (!cancelled) setEditResult(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Simulation error.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dna, site, insertedBase]);

  if (!site) return null;

  if (!site.pamOk) {
    return (
      <GlassCard className="p-5 sm:p-6 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-[#e8f3f1]">
            Hypothetical Editing Simulation
          </h3>
          <span className="px-2.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-xs font-mono text-[#8aa4ad]">
            Illustration only
          </span>
        </div>
        <p className="text-sm text-[#8aa4ad]">
          The selected site ({site.start}–{site.end}) lacks a valid PAM ({site.pam}), so Cas9 cannot cleave here. Select a site with a valid PAM to preview a hypothetical 1-bp deletion and insertion.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Scissors className="w-4 h-4 text-[#c6ff3d]" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-[#e8f3f1]">
              Hypothetical Editing Simulation
            </h3>
            <span className="px-2.5 py-0.5 rounded-full border border-[#ffb020]/40 bg-[#ffb020]/15 text-xs font-medium text-[#ffb020]">
              Illustration only
            </span>
          </div>
          <p className="text-xs text-[#8aa4ad]">
            Conceptual before/after 1-bp indel at cut after bp {site.cut}. Not an experimental prediction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8aa4ad]">Insert base:</span>
          <div className="flex items-center rounded-xl border border-white/15 bg-[#050a14]/80 p-0.5">
            {(['A', 'C', 'G', 'T'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setInsertedBase(b)}
                className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg cursor-pointer transition-colors ${
                  insertedBase === b
                    ? 'bg-[#c6ff3d] text-[#050a14]'
                    : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
                }`}
              >
                +{b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-16 rounded-xl gw-skeleton" />
          <div className="h-16 rounded-xl gw-skeleton" />
        </div>
      )}

      {error && <p className="text-xs text-[#ff4d6d]">{error}</p>}

      {editResult && !loading && (
        <div className="space-y-4">
          {/* Before Cut */}
          <div className="rounded-xl border border-white/10 bg-[#050a14]/75 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#e8f3f1]">
                Before Cut (Synthetic Reference · bp {editResult.contextStart}–{editResult.contextEnd})
              </span>
              <span className="font-mono text-[#8aa4ad]">Length: {editResult.originalFull.length} bp</span>
            </div>
            <div className="font-mono text-sm tracking-wide overflow-x-auto whitespace-nowrap py-1">
              <span className="text-[#c7d8d6]">
                {editResult.originalContext.slice(0, editResult.localCutOffset)}
              </span>
              <span
                className="mx-1 px-1.5 py-0.5 rounded bg-[#c6ff3d]/20 text-[#c6ff3d] font-bold"
                title="Double-strand cut junction"
              >
                |
              </span>
              <span className="text-[#e8f3f1] underline decoration-[#ff4d6d] decoration-2 underline-offset-4">
                {editResult.deletedBase}
              </span>
              <span className="text-[#c7d8d6]">
                {editResult.originalContext.slice(editResult.localCutOffset + 1)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8aa4ad] overflow-x-auto whitespace-nowrap">
              Triplets (illustration): {splitTriplets(editResult.originalContext).join(' · ')}
            </div>
          </div>

          {/* 1-bp Deletion */}
          <div className="rounded-xl border border-[#ff4d6d]/25 bg-[#050a14]/75 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#ff4d6d]">
                After: 1-bp Deletion (Illustration only · removes &quot;{editResult.deletedBase}&quot; at bp {editResult.cut + 1})
              </span>
              <span className="font-mono text-[#8aa4ad]">Length: {editResult.deletionFull.length} bp (-1)</span>
            </div>
            <div className="font-mono text-sm tracking-wide overflow-x-auto whitespace-nowrap py-1">
              <span className="text-[#c7d8d6]">
                {editResult.deletionContext.slice(0, editResult.localCutOffset)}
              </span>
              <span className="mx-1 px-1.5 py-0.5 rounded bg-[#ff4d6d]/20 text-[#ff4d6d] font-semibold">
                [-{editResult.deletedBase}]
              </span>
              <span className="text-[#e8f3f1]">
                {editResult.deletionContext.slice(editResult.localCutOffset)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8aa4ad] overflow-x-auto whitespace-nowrap">
              Shifted triplets (illustration): {splitTriplets(editResult.deletionContext).join(' · ')}
            </div>
          </div>

          {/* 1-bp Insertion */}
          <div className="rounded-xl border border-[#3ddc84]/25 bg-[#050a14]/75 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#3ddc84]">
                After: 1-bp Insertion (Illustration only · inserts &quot;{editResult.insertedBase}&quot; after bp {editResult.cut})
              </span>
              <span className="font-mono text-[#8aa4ad]">Length: {editResult.insertionFull.length} bp (+1)</span>
            </div>
            <div className="font-mono text-sm tracking-wide overflow-x-auto whitespace-nowrap py-1">
              <span className="text-[#c7d8d6]">
                {editResult.insertionContext.slice(0, editResult.localCutOffset)}
              </span>
              <span className="mx-1 px-1.5 py-0.5 rounded bg-[#3ddc84]/20 text-[#3ddc84] font-semibold">
                [+{editResult.insertedBase}]
              </span>
              <span className="text-[#e8f3f1]">
                {editResult.insertionContext.slice(editResult.localCutOffset + 1)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-[#8aa4ad] overflow-x-auto whitespace-nowrap">
              Shifted triplets (illustration): {splitTriplets(editResult.insertionContext).join(' · ')}
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#8aa4ad]">
            <Info className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              In cells, double-strand breaks repaired by NHEJ often introduce small indels that shift downstream triplet reading frames. Real repair outcomes depend on cellular context.
            </span>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
