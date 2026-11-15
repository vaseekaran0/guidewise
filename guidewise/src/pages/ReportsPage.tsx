import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { GlassCard } from '../components/GlassCard.js';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import { PamType, RunSummaryItem, StoredRunResponse } from '../types/crispr.js';

interface ReportsPageProps {
  onReloadRunInSimulator: (dna: string, guide: string, pam: PamType, maxMm: number) => void;
  motionEnabled?: boolean;
  language?: AppLanguage;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  onReloadRunInSimulator,
  motionEnabled = true,
  language = 'en',
}) => {
  const [runs, setRuns] = useState<RunSummaryItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<StoredRunResponse | null>(null);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch('/api/runs');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load runs');
      const list = (data.runs || []) as RunSummaryItem[];
      setRuns(list);
      if (list.length > 0 && !selectedRun) {
        loadRunDetail(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch saved runs.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadRunDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/runs/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedRun(data as StoredRunResponse);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-[#e8f3f1] gw-page-title">
            {UI_STRINGS[language].reportsTitle}
          </h1>
          <p className="text-sm text-[#8aa4ad]">
            {language === 'ta'
              ? 'SQLite பகுப்பாய்வு வரலாற்றைப் பார்க்கலாம், எந்த run-ஐயும் 3D சிமுலேட்டரில் மீண்டும் ஏற்றலாம், அல்லது PDF மற்றும் CSV அறிக்கைகளைப் பதிவிறக்கலாம்.'
              : 'Browse SQLite analysis history, reload any run into the 3D Simulator, or export formatted PDF and CSV reports.'}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchRuns}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
          Refresh history
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-[#ff4d6d]/50 bg-[#ff4d6d]/10 px-4 py-3 text-sm text-[#ffb3c1]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: History as Glass Cards */}
        <section className="lg:col-span-5 space-y-3">
          <div className="text-xs font-medium text-[#8aa4ad] px-1">
            Run History ({runs.length})
          </div>

          {loadingList ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-24 rounded-[20px] gw-skeleton border border-white/10" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <GlassCard className="p-6 text-sm text-[#8aa4ad]">
              No simulation runs recorded yet. Launch the Simulator to analyze a synthetic sequence and save your first run.
            </GlassCard>
          ) : (
            <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
              {runs.map((run) => {
                const active = selectedRun?.id === run.id;
                return (
                  <GlassCard
                    key={run.id}
                    tilt
                    motionEnabled={motionEnabled}
                    onClick={() => loadRunDetail(run.id)}
                    className={`p-4 space-y-2 cursor-pointer ${
                      active ? 'border-[#c6ff3d]/60 bg-[#c6ff3d]/[0.06]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#22d3ee]/15 text-[#22d3ee] font-mono font-semibold">
                        Run #{run.id} · {run.pam}
                      </span>
                      <span className="font-mono text-[11px] text-[#8aa4ad]">
                        {new Date(run.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-[#e8f3f1] truncate">
                      {run.guides || 'Synthetic run'}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#8aa4ad]">
                      <span>{run.dna_length} bp</span>
                      <span>·</span>
                      <span>{run.total_sites} site(s)</span>
                      <span>·</span>
                      <span className="text-[#3ddc84]">Best {Number(run.best_score).toFixed(1)}</span>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Selected Run Inspector */}
        <GlassCard className="lg:col-span-7 p-5 sm:p-6 space-y-5">
          {loadingDetail ? (
            <div className="space-y-4">
              <div className="h-8 w-48 rounded-lg gw-skeleton" />
              <div className="h-20 rounded-xl gw-skeleton" />
              <div className="h-44 rounded-xl gw-skeleton" />
            </div>
          ) : !selectedRun ? (
            <p className="text-sm text-[#8aa4ad]">
              Select a run card from the history list to preview its sites and download PDF or CSV reports.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-semibold text-[#e8f3f1]">
                    Run #{selectedRun.id} Summary
                  </h2>
                  <p className="text-xs font-mono text-[#8aa4ad]">
                    {new Date(selectedRun.created_at).toUTCString()} · PAM {selectedRun.pam} · Max MM {selectedRun.max_mm}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/report/${selectedRun.id}.pdf`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold gw-btn-lime whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    Download PDF
                  </a>
                  <a
                    href={`/api/report/${selectedRun.id}.csv`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
                    Download CSV
                  </a>
                  {selectedRun.guides[0] && (
                    <button
                      type="button"
                      onClick={() =>
                        onReloadRunInSimulator(
                          selectedRun.dna,
                          selectedRun.guides[0].sequence,
                          selectedRun.pam,
                          selectedRun.max_mm
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#22d3ee] hover:border-[#22d3ee]/50 cursor-pointer whitespace-nowrap"
                    >
                      Reload in simulator
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-4 text-xs font-mono text-[#c7d8d6]">
                  <span>Length: {selectedRun.stats.length} bp</span>
                  <span>GC: {selectedRun.stats.gcPercent.toFixed(1)}%</span>
                  <span>A:{selectedRun.stats.counts.A}</span>
                  <span>T:{selectedRun.stats.counts.T}</span>
                  <span>G:{selectedRun.stats.counts.G}</span>
                  <span>C:{selectedRun.stats.counts.C}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#050a14]/75 p-3 font-mono text-xs text-[#c7d8d6] break-all">
                  {selectedRun.dna}
                </div>
              </div>

              <div className="space-y-4">
                {selectedRun.guides.map((g) => (
                  <div key={g.id} className="space-y-2">
                    <div className="text-xs font-mono text-[#22d3ee]">
                      Guide: <span className="text-[#e8f3f1]">{g.sequence}</span> ({g.sites.length} site(s))
                    </div>
                    {g.sites.length === 0 ? (
                      <div className="text-xs text-[#8aa4ad]">No sites found within threshold.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/10">
                        <table className="w-full text-left border-collapse text-xs font-mono">
                          <thead>
                            <tr className="bg-[#050a14]/75 text-[#8aa4ad] border-b border-white/10">
                              <th className="py-2 px-3">Strand</th>
                              <th className="py-2 px-3">Coords</th>
                              <th className="py-2 px-3">MM</th>
                              <th className="py-2 px-3">PAM</th>
                              <th className="py-2 px-3">Cut</th>
                              <th className="py-2 px-3 text-right">Ed. Est. Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/10">
                            {g.sites.map((s) => (
                              <tr key={s.id}>
                                <td className="py-2 px-3">{s.strand}</td>
                                <td className="py-2 px-3">
                                  {s.start}–{s.end}
                                </td>
                                <td className="py-2 px-3">{s.mismatches}</td>
                                <td className="py-2 px-3">
                                  {s.pam} ({s.pam_ok ? 'Valid' : 'No PAM'})
                                </td>
                                <td className="py-2 px-3">cut after {s.cut}</td>
                                <td className="py-2 px-3 text-right font-semibold text-[#e8f3f1]">
                                  {s.score.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8aa4ad] pt-2 border-t border-white/10">
                <Download className="w-3.5 h-3.5 text-[#c6ff3d] shrink-0" aria-hidden="true" />
                <span>
                  Exported PDF and CSV reports include the permanent educational disclaimer, inputs, scoring formula, and all detected candidate sites.
                </span>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
