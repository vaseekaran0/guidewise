import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, MessageSquare, Search, Send, ShieldAlert, X } from 'lucide-react';
import { DnaHelixViewport } from '../components/DnaHelixViewport.js';
import { GlassCard } from '../components/GlassCard.js';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import { EDUCATIONAL_DISCLAIMER, TEST_VECTOR } from '../shared/crisprEngine.js';
import { CRISPR_KNOWLEDGE_BASE } from '../shared/knowledgeBase.js';
import { AnalyzeApiResponse, ChatMessage } from '../types/crispr.js';

interface LearnPageProps {
  latestRun: AnalyzeApiResponse | null;
  motionEnabled?: boolean;
  language?: AppLanguage;
}

const DNA_RNA_SCENES = [
  {
    id: 'strands',
    badge: 'DNA vs RNA · Strands',
    title: 'Double Helix vs Single Strand',
    dnaLabel: 'DNA: Double-Stranded Duplex (A-T, G-C)',
    rnaLabel: 'RNA: Single-Stranded Guide (A-U, G-C)',
    caption:
      'DNA stores information in a stable double helix; guide RNA stays single-stranded so its exposed bases can pair with one unwound DNA strand inside Cas9.',
  },
  {
    id: 'bases',
    badge: 'DNA vs RNA · Bases',
    title: 'Thymine (T) vs Uracil (U)',
    dnaLabel: 'DNA Uses Thymine (T · #ffb020)',
    rnaLabel: 'RNA Uses Uracil (U · #c084fc)',
    caption:
      'RNA replaces Thymine (T) with Uracil (U). During GuideWise matching, U converts cleanly to T because both pair identically with Adenine (A).',
  },
  {
    id: 'sugar',
    badge: 'DNA vs RNA · Sugar Backbone',
    title: 'Deoxyribose vs Ribose',
    dnaLabel: 'DNA Sugar: Deoxyribose (lacks 2′-OH)',
    rnaLabel: 'RNA Sugar: Ribose (has 2′-OH group)',
    caption:
      'Deoxyribose lacks an oxygen atom at the 2′ carbon, making DNA chemically resilient; Ribose carries a 2′-OH group, suited for flexible transient guide RNAs.',
  },
];

const SUGGESTED_QUESTIONS = [
  'Why does site 80-99 score 0.0 even though it has 0 mismatches?',
  'How does the seed region affect the educational estimate score?',
  'Where does Cas9 cut relative to the PAM on forward and reverse strands?',
  'Can you give me a wet-lab protocol to edit BRCA1 in human cells?',
];

export const LearnPage: React.FC<LearnPageProps> = ({
  latestRun,
  motionEnabled = true,
  language = 'en',
}) => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [chatOpen, setChatOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 640
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Ask any conceptual question about DNA, RNA, PAM motifs, mismatch scoring, or your current simulation run.\n\n${EDUCATIONAL_DISCLAIMER}`,
      mode: 'kb-deterministic',
      sources: ['GuideWise Knowledge Base (32 entries)'],
      timestamp: new Date().toISOString(),
    },
  ]);
  const [questionInput, setQuestionInput] = useState('');
  const [asking, setAsking] = useState(false);

  const activeScene = DNA_RNA_SCENES[sceneIdx];

  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    if (!q) return CRISPR_KNOWLEDGE_BASE;
    return CRISPR_KNOWLEDGE_BASE.filter(
      (item) =>
        item.topic.toLowerCase().includes(q) ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    );
  }, [glossaryQuery]);

  const sendQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || asking) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setAsking(true);

    try {
      const runContext = latestRun
        ? {
            dnaLength: latestRun.dna.length,
            pam: latestRun.pam,
            maxMm: latestRun.max_mm,
            guide: latestRun.guide,
            totalSites: latestRun.sites.length,
            bestScore: latestRun.summary.bestScore,
          }
        : undefined;

      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, runContext }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.ok
          ? data.answer
          : `${data.error || 'Unable to answer right now.'}\n\n${EDUCATIONAL_DISCLAIMER}`,
        mode: data.mode,
        sources: data.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Local server connection unavailable.\n\n${EDUCATIONAL_DISCLAIMER}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(questionInput);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8 pb-24">
      <div className="space-y-1">
        <h1 className="font-display font-bold text-[#e8f3f1] gw-page-title">
          {UI_STRINGS[language].learnTitle}
        </h1>
        <p className="text-sm text-[#8aa4ad]">
          {language === 'ta'
            ? 'இயங்கும் DNA vs RNA ஒப்பீடு, தேடக்கூடிய 32-பகுதி கலைச்சொல் அகராதி, மற்றும் கல்வி கேள்வி-பதில் உதவியாளர்.'
            : 'Interactive holographic DNA vs RNA comparison, searchable 32-entry glossary, and grounded educational Q&A assistant.'}
        </p>
      </div>

      {/* Animated Holographic DNA vs RNA Scene (Inspired by Reference Video) */}
      <GlassCard className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="text-xs font-mono text-[#22d3ee]">Interactive Holographic Lesson</div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#e8f3f1]">
              DNA vs RNA Comparison Stage
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DNA_RNA_SCENES.map((sc, idx) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSceneIdx(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                  sceneIdx === idx
                    ? 'border-[#c6ff3d] bg-[#c6ff3d] text-[#050a14] font-semibold'
                    : 'border-white/15 bg-white/5 text-[#8aa4ad] hover:text-[#e8f3f1]'
                }`}
              >
                {sc.badge}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 relative min-h-[380px]">
            <DnaHelixViewport
              dna={TEST_VECTOR.dna.slice(0, 44)}
              sites={[]}
              selectedSiteIndex={null}
              mode="simulator"
              initialViewMode="compare"
              reducedMotion={!motionEnabled}
              autoPlay
              className="h-full min-h-[380px]"
            />

            {/* Sci-Fi Animated Callout Overlay */}
            <div className="pointer-events-none absolute top-14 left-4 right-4 flex justify-between gap-4">
              <div className="rounded-xl border border-[#22d3ee]/40 bg-[#050a14]/85 px-3 py-2 text-[11px] font-mono text-[#22d3ee] max-w-[46%]">
                <div className="font-semibold text-[#e8f3f1]">DNA (Double Helix)</div>
                <div>{activeScene.dnaLabel}</div>
              </div>
              <div className="rounded-xl border border-[#c084fc]/45 bg-[#050a14]/85 px-3 py-2 text-[11px] font-mono text-[#c084fc] max-w-[46%] text-right">
                <div className="font-semibold text-[#e8f3f1]">RNA (Single Strand)</div>
                <div>{activeScene.rnaLabel}</div>
              </div>
            </div>
          </div>

          {/* Animated Caption & Chemical Callout Card */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-[#050a14]/65 p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeScene.id}
                initial={motionEnabled ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={motionEnabled ? { opacity: 0, y: -8 } : undefined}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <span className="inline-flex px-3 py-1 rounded-full bg-[#22d3ee]/15 border border-[#22d3ee]/35 text-xs font-mono text-[#22d3ee]">
                  {activeScene.badge}
                </span>
                <h3 className="font-display text-2xl font-bold text-[#e8f3f1]">
                  {activeScene.title}
                </h3>
                <p className="text-sm text-[#c7d8d6] leading-relaxed">{activeScene.caption}</p>

                {/* Base Legend Chips */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {[
                    { base: 'A', name: 'Adenine', color: 'border-[#ff5d8f]/50 text-[#ff5d8f]' },
                    { base: 'T', name: 'DNA only', color: 'border-[#ffb020]/50 text-[#ffb020]' },
                    { base: 'G', name: 'Guanine', color: 'border-[#3ddc84]/50 text-[#3ddc84]' },
                    { base: 'C', name: 'Cytosine', color: 'border-[#4cc9ff]/50 text-[#4cc9ff]' },
                    { base: 'U', name: 'RNA only', color: 'border-[#c084fc]/50 text-[#c084fc]' },
                  ].map((b) => (
                    <div
                      key={b.base}
                      className={`rounded-xl border bg-white/5 p-2 text-center ${b.color}`}
                    >
                      <div className="font-mono text-base font-bold">{b.base}</div>
                      <div className="text-[10px] text-[#8aa4ad] truncate">{b.name}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Animated SVG Callout Line Diagram */}
            <svg
              viewBox="0 0 360 72"
              className="w-full h-18 rounded-xl border border-white/10 bg-[#050a14]/80"
              role="img"
              aria-label="DNA Deoxyribose versus RNA Ribose base pairing callout diagram"
            >
              <line x1="28" y1="36" x2="148" y2="36" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 3" />
              <line x1="212" y1="36" x2="332" y2="36" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx="28" cy="36" r="6" fill="#22d3ee" />
              <circle cx="148" cy="36" r="5" fill="#ffb020" />
              <circle cx="212" cy="36" r="5" fill="#c084fc" />
              <circle cx="332" cy="36" r="6" fill="#c084fc" />
              <text x="88" y="24" textAnchor="middle" fill="#e8f3f1" fontSize="10" fontFamily="monospace">
                DNA · A-T-C-G
              </text>
              <text x="272" y="24" textAnchor="middle" fill="#e8f3f1" fontSize="10" fontFamily="monospace">
                RNA · A-U-C-G
              </text>
              <text x="180" y="58" textAnchor="middle" fill="#8aa4ad" fontSize="9.5" fontFamily="monospace">
                Deoxyribose (no 2′-OH) ↔ Ribose (2′-OH)
              </text>
            </svg>
          </div>
        </div>
      </GlassCard>

      {/* Searchable 32-Entry Glossary Cards */}
      <GlassCard className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#22d3ee]" aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold text-[#e8f3f1]">
              CRISPR Glossary ({filteredGlossary.length})
            </h2>
          </div>
          <div className="relative w-full sm:w-80">
            <Search
              className="w-4 h-4 text-[#8aa4ad] absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={glossaryQuery}
              onChange={(e) => setGlossaryQuery(e.target.value)}
              placeholder="Filter glossary (PAM, seed, FASTA...)"
              className="w-full rounded-xl border border-white/15 bg-[#050a14]/80 pl-9 pr-3 py-2 text-xs text-[#e8f3f1] placeholder-[#8aa4ad]/60 focus:border-[#c6ff3d] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[540px] overflow-y-auto pr-1">
          {filteredGlossary.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/10 bg-[#050a14]/65 p-4 space-y-2 hover:border-[#22d3ee]/35 transition-colors"
            >
              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-[#22d3ee]">
                {entry.topic}
              </span>
              <h3 className="text-sm font-semibold text-[#e8f3f1]">{entry.question}</h3>
              <p className="text-xs text-[#c7d8d6] leading-relaxed">{entry.answer}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Floating Glass Chat Widget */}
      <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-[420px]">
        {!chatOpen ? (
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="ml-auto flex items-center gap-2 px-4 py-3 rounded-2xl gw-btn-lime text-sm font-semibold cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" aria-hidden="true" />
            Ask CRISPR Assistant
          </button>
        ) : (
          <GlassCard className="p-4 space-y-3 shadow-2xl border-white/20 bg-[#070d1c]/95">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#c6ff3d]" aria-hidden="true" />
                <span className="font-display text-sm font-semibold text-[#e8f3f1]">
                  Grounded Q&amp;A Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                aria-label="Minimize chat assistant"
                className="p-1 rounded-lg text-[#8aa4ad] hover:text-[#e8f3f1] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendQuestion(q)}
                  className="text-left text-[11px] px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-[#c7d8d6] hover:border-[#22d3ee]/50 hover:text-[#e8f3f1] cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3 space-y-1.5 text-xs ${
                    m.role === 'user'
                      ? 'border-[#c6ff3d]/40 bg-[#c6ff3d]/10 ml-6'
                      : m.mode === 'safety-refusal'
                      ? 'border-[#ffb020]/50 bg-[#ffb020]/10 mr-2'
                      : 'border-white/10 bg-[#050a14]/80 mr-2'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8aa4ad]">
                    <span className="font-semibold text-[#e8f3f1]">
                      {m.role === 'user' ? 'Student' : 'GuideWise Assistant'}
                    </span>
                    {m.mode && (
                      <span>
                        {m.mode === 'safety-refusal'
                          ? 'Safety refusal'
                          : m.mode === 'kb-gemini'
                          ? 'KB + Gemini'
                          : 'KB Offline'}
                      </span>
                    )}
                  </div>
                  <div className="text-[#c7d8d6] whitespace-pre-line leading-relaxed">{m.content}</div>
                </div>
              ))}
              {asking && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-mono text-[#22d3ee]">
                  <span>Assistant is checking knowledge base...</span>
                </div>
              )}
            </div>

            {/* Ask Input */}
            <form onSubmit={handleAskSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Ask about PAM, seed, cut sites..."
                className="flex-1 rounded-xl border border-white/15 bg-[#050a14]/85 px-3 py-2 text-xs text-[#e8f3f1] placeholder-[#8aa4ad]/60 focus:border-[#c6ff3d] focus:outline-none"
              />
              <button
                type="submit"
                disabled={asking || questionInput.trim().length < 2}
                aria-label="Send question"
                className="px-3 py-2 rounded-xl gw-btn-lime disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </form>

            <div className="flex items-center gap-1.5 text-[10px] text-[#8aa4ad]">
              <ShieldAlert className="w-3 h-3 text-[#ffb020] shrink-0" aria-hidden="true" />
              <span>Refuses wet-lab protocols &amp; real-gene/pathogen design.</span>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};
