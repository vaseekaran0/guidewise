import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  GitCompare,
  Layers,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DNA_VS_RNA_CALLOUTS,
  HOLO_MODELS,
  HoloLanguage,
  HoloModelId,
  HoloPartDef,
} from '../../data/holoParts.js';
import {
  getHoloCalloutText,
  getHoloModelText,
  getHoloPartText,
  getHoloQuizText,
} from '../../data/holoPartsTamil.js';

interface HoloTopHudProps {
  modelId: HoloModelId;
  language: HoloLanguage;
  onSelectLanguage: (lang: HoloLanguage) => void;
  exploredCount: number;
  totalParts: number;
  onOpenQuiz: () => void;
  motionEnabled: boolean;
}

export const HoloTopHud: React.FC<HoloTopHudProps> = ({
  modelId,
  language,
  onSelectLanguage,
  exploredCount,
  totalParts,
  onOpenQuiz,
  motionEnabled,
}) => {
  const meta = HOLO_MODELS[modelId];
  const { title: fullTitle, subtitle: fullSub } = getHoloModelText(meta, language);
  const [scanChars, setScanChars] = useState(fullTitle.length);

  useEffect(() => {
    if (!motionEnabled) {
      setScanChars(fullTitle.length);
      return;
    }
    setScanChars(0);
    const id = window.setInterval(() => {
      setScanChars((c) => {
        if (c >= fullTitle.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 2;
      });
    }, 24);
    return () => window.clearInterval(id);
  }, [modelId, fullTitle, motionEnabled]);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-white/10 bg-[#050a14]/75">
      <div className="space-y-0.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#22d3ee]">
          <span>GuideWise Hologram Lab</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#8aa4ad]">
            {language === 'ta'
              ? 'எளிய கல்வி மாதிரி மட்டுமே. அளவுகள் மற்றும் மூலக்கூறு வடிவங்கள் கற்பனை விளக்கம்.'
              : 'Simplified educational illustration. Not to scale. Not exact molecular structures.'}
          </span>
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-[#e8f3f1] tracking-tight truncate">
          {fullTitle.slice(0, scanChars)}
          {motionEnabled && scanChars < fullTitle.length && (
            <span className="inline-block w-2 h-5 ml-1 bg-[#22d3ee] align-middle" aria-hidden="true" />
          )}
        </h1>
        <p className="text-xs text-[#8aa4ad]">{fullSub}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div
          aria-label={`Parts explored ${exploredCount} of ${totalParts}`}
          className="px-3 py-1.5 rounded-xl border border-[#22d3ee]/35 bg-[#22d3ee]/10 text-xs font-mono tabular-nums text-[#22d3ee]"
        >
          {language === 'ta'
            ? `ஆராய்ந்தவை ${exploredCount} / ${totalParts}`
            : `Parts explored ${exploredCount} / ${totalParts}`}
        </div>

        <button
          type="button"
          onClick={onOpenQuiz}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#c6ff3d]/45 bg-[#c6ff3d]/12 text-xs font-semibold text-[#c6ff3d] hover:bg-[#c6ff3d]/20 transition-colors cursor-pointer"
        >
          <Award className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{language === 'ta' ? 'சிறு வினாடி-வினா (3)' : 'Mini Quiz (3 Qs)'}</span>
        </button>

        <div
          role="group"
          aria-label="Hologram lab language"
          className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 p-0.5 text-xs font-mono"
        >
          {(
            [
              { id: 'en', label: 'EN' },
              { id: 'ta', label: 'தமிழ்' },
              { id: 'tanglish', label: 'Tanglish' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectLanguage(opt.id)}
              aria-pressed={language === opt.id}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                language === opt.id
                  ? 'bg-[#c6ff3d] text-[#050a14] font-semibold'
                  : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface HoloPartsListProps {
  parts: HoloPartDef[];
  selectedPartId: string | null;
  exploredIds: Set<string>;
  language: HoloLanguage;
  onSelectPart: (id: string | null) => void;
  mobileOpen: boolean;
  onToggleMobileOpen: () => void;
}

export const HoloPartsList: React.FC<HoloPartsListProps> = ({
  parts,
  selectedPartId,
  exploredIds,
  language,
  onSelectPart,
  mobileOpen,
  onToggleMobileOpen,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onSelectPart(null);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % parts.length;
      const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-part-btn="true"]');
      btns?.[next]?.focus();
      onSelectPart(parts[next].id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + parts.length) % parts.length;
      const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-part-btn="true"]');
      btns?.[prev]?.focus();
      onSelectPart(parts[prev].id);
    }
  };

  const renderButtons = () => (
    <div ref={listRef} className="space-y-1.5 overflow-y-auto max-h-[420px] pr-1">
      {parts.map((part, idx) => {
        const active = part.id === selectedPartId;
        const done = exploredIds.has(part.id);
        return (
          <button
            key={part.id}
            type="button"
            data-part-btn="true"
            aria-pressed={active}
            onClick={() => onSelectPart(active ? null : part.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#c6ff3d] ${
              active
                ? 'border-[#ff9f1c] bg-[#ff9f1c]/15 text-[#e8f3f1]'
                : 'border-white/10 bg-[#050a14]/70 text-[#c7d8d6] hover:border-[#22d3ee]/45'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: active ? '#ff9f1c' : part.color }}
                aria-hidden="true"
              />
              <span className="text-xs font-medium truncate">
                {part.order}. {getHoloPartText(part, language).name}
              </span>
            </div>
            {done && (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3ddc84] shrink-0" aria-label="Explored" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Left Optical Glass Parts List */}
      <div
        className="hidden md:flex flex-col w-64 shrink-0 rounded-[20px] border border-white/14 bg-gradient-to-b from-[#0b172e]/94 to-[#060d1c]/92 shadow-[0_14px_34px_rgba(2,6,18,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] p-3.5 space-y-2.5"
        aria-label="Molecule parts selector"
      >
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono font-semibold text-[#22d3ee]">
            Components ({parts.length})
          </span>
          {selectedPartId && (
            <button
              type="button"
              onClick={() => onSelectPart(null)}
              className="text-[11px] font-mono text-[#8aa4ad] hover:text-[#e8f3f1] cursor-pointer"
            >
              Esc · Clear
            </button>
          )}
        </div>
        {renderButtons()}
        <p className="text-[10px] text-[#8aa4ad] px-1">
          Click 3D part or use ↑/↓ keys. Drag selected part to pull out further.
        </p>
      </div>

      {/* Mobile 360px Bottom Sheet Drawer Toggle + Panel */}
      <div className="md:hidden fixed bottom-16 left-3 right-3 z-30">
        <button
          type="button"
          onClick={onToggleMobileOpen}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-white/15 bg-[#070f20]/95 text-xs font-semibold text-[#e8f3f1] shadow-lg cursor-pointer"
        >
          <span>Parts List ({exploredIds.size}/{parts.length} explored)</span>
          {mobileOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {mobileOpen && (
          <div className="mt-1.5 rounded-2xl border border-white/15 bg-[#070f20]/96 p-3 shadow-2xl max-h-60 overflow-y-auto">
            {renderButtons()}
          </div>
        )}
      </div>
    </>
  );
};

interface HoloInfoCardProps {
  modelId: HoloModelId;
  parts: HoloPartDef[];
  selectedPart: HoloPartDef | null;
  slideDirection: number;
  onJumpToPart: (id: string) => void;
  language: HoloLanguage;
  motionEnabled: boolean;
  tourPlaying: boolean;
  onToggleTour: () => void;
  onPrevPart: () => void;
  onNextPart: () => void;
  onClosePart: () => void;
  compareWithDna: boolean;
  onToggleCompareDna: () => void;
  cutAnimPlaying: boolean;
  onToggleCutAnim: () => void;
  onTryInSimulator: () => void;
}

const partCardVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir * 24,
    rotateY: dir * -10,
    scale: 0.96,
  }),
  center: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -24,
    rotateY: dir * 10,
    scale: 0.96,
  }),
};

export const HoloInfoCard: React.FC<HoloInfoCardProps> = ({
  modelId,
  parts,
  selectedPart,
  slideDirection,
  onJumpToPart,
  language,
  motionEnabled,
  tourPlaying,
  onToggleTour,
  onPrevPart,
  onNextPart,
  onClosePart,
  compareWithDna,
  onToggleCompareDna,
  cutAnimPlaying,
  onToggleCutAnim,
  onTryInSimulator,
}) => {
  const selectedPartText = selectedPart ? getHoloPartText(selectedPart, language) : null;
  const fullExplanation = selectedPartText
    ? selectedPartText.explanation
    : language === 'ta'
    ? '3D ஹாலோகிராம் மீது உள்ள எந்தவொரு பகுதியையும் கிளிக் செய்யுங்கள், அல்லது Guided Tour தொடங்கி ஒவ்வொன்றாகப் பாருங்கள்.'
    : language === 'tanglish'
    ? '3D hologram mela irukura endha oru part aiyum click pannunga, illana Guided Tour aarambichu step-by-step ah paarunga.'
    : 'Tap or click any glowing part on the 3D hologram—or start the Guided Tour—to pull it out and inspect how it works.';

  const [typedCount, setTypedCount] = useState(fullExplanation.length);

  useEffect(() => {
    if (!motionEnabled) {
      setTypedCount(fullExplanation.length);
      return;
    }
    setTypedCount(0);
    const id = window.setInterval(() => {
      setTypedCount((prev) => {
        if (prev >= fullExplanation.length) {
          window.clearInterval(id);
          return prev;
        }
        return prev + 3;
      });
    }, 18);
    return () => window.clearInterval(id);
  }, [fullExplanation, motionEnabled]);

  const activePartIdx = selectedPart ? parts.findIndex((p) => p.id === selectedPart.id) : -1;

  return (
    <div className="relative w-full md:w-80 shrink-0 rounded-[20px] border border-white/15 bg-gradient-to-b from-[#0b172e]/94 to-[#060d1c]/92 shadow-[0_16px_40px_rgba(2,6,18,0.55),inset_0_1px_0_rgba(255,255,255,0.14)] p-4 flex flex-col justify-between gap-4 gw-stage-3d">
      {/* Sci-Fi HUD Corner Brackets */}
      <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#22d3ee]/80 rounded-tl-[20px]" aria-hidden="true" />
      <span className="pointer-events-none absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#22d3ee]/80 rounded-tr-[20px]" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#22d3ee]/80 rounded-bl-[20px]" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#22d3ee]/80 rounded-br-[20px]" aria-hidden="true" />

      <div className="space-y-3 overflow-hidden">
        <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
          <motion.div
            key={selectedPart ? `${modelId}-${selectedPart.id}-${language}` : `${modelId}-overview-${language}`}
            custom={slideDirection}
            variants={motionEnabled ? partCardVariants : undefined}
            initial={motionEnabled ? 'enter' : false}
            animate={motionEnabled ? 'center' : undefined}
            exit={motionEnabled ? 'exit' : undefined}
            transition={{ duration: motionEnabled ? 0.28 : 0, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'center center' }}
            className="space-y-3"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="text-[11px] font-mono text-[#ff9f1c] truncate">
                  {selectedPart
                    ? `${selectedPart.category} · ${selectedPart.calloutTag}`
                    : 'Holographic Inspector'}
                </div>
                <h2 className="font-display text-lg font-bold text-[#e8f3f1] leading-snug">
                  {selectedPartText
                    ? selectedPartText.name
                    : language === 'ta'
                    ? 'ஒரு பகுதியைத் தேர்ந்தெடுக்கவும்'
                    : 'Select a Molecule Part'}
                </h2>
              </div>

              {selectedPart && (
                <button
                  type="button"
                  onClick={onClosePart}
                  aria-label="Deselect current part"
                  className="p-1 rounded-lg border border-white/10 text-[#8aa4ad] hover:text-[#e8f3f1] cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Typing Explanation Body */}
            <div className="rounded-xl border border-white/12 bg-[#050a14]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-3 space-y-2 min-h-[116px]">
              <p className="text-xs sm:text-sm text-[#e8f3f1] leading-relaxed">
                {fullExplanation.slice(0, typedCount)}
                {motionEnabled && typedCount < fullExplanation.length && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#ff9f1c] align-middle" aria-hidden="true" />
                )}
              </p>
              {selectedPartText && (
                <p className="text-[11px] font-mono text-[#22d3ee]">
                  {selectedPartText.keyFact}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mandatory Line on Every Part Card */}
        <div className="text-[11px] font-mono text-[#8aa4ad]">
          Simplified educational illustration
        </div>

        {/* RNA Compare with DNA Animated Callouts */}
        {modelId === 'rna' && (
          <div className="space-y-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={onToggleCompareDna}
              aria-pressed={compareWithDna}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                compareWithDna
                  ? 'border-[#c6ff3d] bg-[#c6ff3d] text-[#050a14]'
                  : 'border-[#22d3ee]/45 bg-[#22d3ee]/10 text-[#22d3ee] hover:bg-[#22d3ee]/20'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {compareWithDna
                  ? language === 'ta'
                    ? 'DNA ஒப்பீட்டை மறை'
                    : 'Hide DNA Comparison'
                  : language === 'ta'
                  ? 'DNA உடன் ஒப்பிடு'
                  : 'Compare with DNA'}
              </span>
            </button>

            <AnimatePresence>
              {compareWithDna && (
                <motion.div
                  initial={motionEnabled ? { opacity: 0, y: 6, scale: 0.98 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={motionEnabled ? { opacity: 0, y: -4, scale: 0.98 } : undefined}
                  transition={{ duration: motionEnabled ? 0.24 : 0 }}
                  className="space-y-1.5"
                >
                  {DNA_VS_RNA_CALLOUTS.map((c) => {
                    const cText = getHoloCalloutText(c, language);
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-white/10 bg-[#050a14]/85 px-2.5 py-2 space-y-0.5"
                      >
                        <div className="text-[11px] font-semibold" style={{ color: c.color }}>
                          {cText.title}
                        </div>
                        <p className="text-[11px] text-[#c7d8d6] leading-snug">{cText.detail}</p>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CRISPR Complex Actions: Cut Animation + Try in Simulator */}
        {modelId === 'crispr' && (
          <div className="space-y-2 pt-1 border-t border-white/10">
            <button
              type="button"
              onClick={onToggleCutAnim}
              aria-pressed={cutAnimPlaying}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                cutAnimPlaying
                  ? 'border-[#ff4fa3] bg-[#ff4fa3]/20 text-[#ff8ac2]'
                  : 'border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#ff4fa3]/50'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{cutAnimPlaying ? 'Pause Cut Animation' : 'Play Cut Animation'}</span>
            </button>

            <button
              type="button"
              onClick={onTryInSimulator}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold gw-btn-lime cursor-pointer"
            >
              <span>Try it in the Simulator</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Guided Tour Slide Rail & Controls */}
      <div className="pt-3 border-t border-white/10 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-[#8aa4ad]">Guided Tour</span>
          <span className="text-[11px] font-mono tabular-nums text-[#22d3ee]">
            {activePartIdx >= 0
              ? `${String(activePartIdx + 1).padStart(2, '0')} / ${String(parts.length).padStart(2, '0')}`
              : `00 / ${String(parts.length).padStart(2, '0')}`}
          </span>
        </div>

        {/* Clickable Slide Dot Rail */}
        <div className="flex items-center gap-1" role="group" aria-label="Part slide selector">
          {parts.map((part, idx) => {
            const isCurrent = selectedPart?.id === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => onJumpToPart(part.id)}
                title={`${idx + 1}. ${part.name}`}
                aria-label={`Inspect part ${idx + 1}: ${part.name}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isCurrent
                    ? 'flex-[2.2] bg-[#c6ff3d] shadow-[0_0_8px_rgba(198,255,61,0.55)]'
                    : 'flex-1 bg-white/18 hover:bg-[#22d3ee]/60'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevPart}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-medium text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Prev
          </button>
          <button
            type="button"
            onClick={onToggleTour}
            aria-pressed={tourPlaying}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer flex items-center gap-1 transition-colors ${
              tourPlaying
                ? 'border-[#ff9f1c] bg-[#ff9f1c]/20 text-[#ff9f1c]'
                : 'border-[#c6ff3d]/50 bg-[#c6ff3d]/15 text-[#c6ff3d]'
            }`}
          >
            {tourPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{tourPlaying ? 'Auto' : 'Tour'}</span>
          </button>
          <button
            type="button"
            onClick={onNextPart}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-medium text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer transition-colors"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface HoloBottomControlsProps {
  modelId: HoloModelId;
  onSelectModel: (id: HoloModelId) => void;
  explodeFactor: number;
  onChangeExplode: (v: number) => void;
  isolateSelected: boolean;
  onToggleIsolate: () => void;
  hasSelected: boolean;
  xrayMode: boolean;
  onToggleXray: () => void;
  onResetView: () => void;
}

export const HoloBottomControls: React.FC<HoloBottomControlsProps> = ({
  modelId,
  onSelectModel,
  explodeFactor,
  onChangeExplode,
  isolateSelected,
  onToggleIsolate,
  hasSelected,
  xrayMode,
  onToggleXray,
  onResetView,
}) => {
  const isExploded = explodeFactor > 0.15;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-white/10 bg-[#050a14]/88">
      {/* Model Tabs with Sliding 3D Glass Pill */}
      <div
        role="tablist"
        aria-label="Hologram molecule model"
        className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#081226]/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        {(
          [
            { id: 'dna', label: 'DNA' },
            { id: 'rna', label: 'RNA' },
            { id: 'crispr', label: 'CRISPR-Cas9' },
          ] as const
        ).map((tab) => {
          const active = modelId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectModel(tab.id)}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active ? 'text-[#050a14]' : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="holo-model-tab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-lg bg-[#c6ff3d] shadow-[0_0_16px_rgba(198,255,61,0.35)]"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Disassemble / Explode / Isolate / X-Ray / Reset Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChangeExplode(isExploded ? 0 : 1)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            isExploded
              ? 'border-[#ff9f1c] bg-[#ff9f1c]/20 text-[#ff9f1c]'
              : 'border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isExploded ? 'Reassemble' : 'Disassemble all'}</span>
        </button>

        <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 text-xs font-mono text-[#c7d8d6]">
          <span>Explode</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={explodeFactor}
            onChange={(e) => onChangeExplode(Number(e.target.value))}
            aria-label="Explode molecule separation slider"
            className="w-24 accent-[#ff9f1c] cursor-pointer"
          />
          <span className="tabular-nums w-8 text-right">{Math.round(explodeFactor * 100)}%</span>
        </label>

        <button
          type="button"
          onClick={onToggleIsolate}
          disabled={!hasSelected && !isolateSelected}
          aria-pressed={isolateSelected}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
            isolateSelected
              ? 'border-[#c6ff3d] bg-[#c6ff3d]/15 text-[#c6ff3d]'
              : 'border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Isolate</span>
        </button>

        <button
          type="button"
          onClick={onToggleXray}
          aria-pressed={xrayMode}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
            xrayMode
              ? 'border-[#22d3ee] bg-[#22d3ee]/15 text-[#22d3ee]'
              : 'border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          <span>X-ray</span>
        </button>

        <button
          type="button"
          onClick={onResetView}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset view</span>
        </button>
      </div>
    </div>
  );
};

interface HoloQuizModalProps {
  modelId: HoloModelId;
  language: HoloLanguage;
  open: boolean;
  onClose: () => void;
  motionEnabled: boolean;
}

export const HoloQuizModal: React.FC<HoloQuizModalProps> = ({
  modelId,
  language,
  open,
  onClose,
  motionEnabled,
}) => {
  const meta = HOLO_MODELS[modelId];
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    setAnswers({});
  }, [modelId, open]);

  const answeredCount = Object.keys(answers).length;
  const correctCount = meta.quiz.filter((q) => answers[q.id] === q.correctIndex).length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="holo-quiz-title"
          initial={motionEnabled ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={motionEnabled ? { opacity: 0 } : undefined}
          transition={{ duration: motionEnabled ? 0.22 : 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#030712]/80 backdrop-blur-md gw-stage-3d"
        >
          <motion.div
            initial={
              motionEnabled
                ? { opacity: 0, scale: 0.94, rotateX: 8, y: 16 }
                : false
            }
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={
              motionEnabled
                ? { opacity: 0, scale: 0.95, rotateX: -6, y: 12 }
                : undefined
            }
            transition={{ duration: motionEnabled ? 0.3 : 0, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto gw-glass rounded-[22px] p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#c6ff3d]">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>3-Question Knowledge Check</span>
                </div>
                <h2 id="holo-quiz-title" className="font-display text-xl font-bold text-[#e8f3f1]">
                  {getHoloModelText(meta, language).title} — {language === 'ta' ? 'சிறு வினாடி-வினா' : 'Mini Quiz'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close mini quiz"
                className="p-2 rounded-xl border border-white/10 text-[#8aa4ad] hover:text-[#e8f3f1] cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              {meta.quiz.map((q, qIdx) => {
                const chosen = answers[q.id];
                const isCorrect = chosen === q.correctIndex;
                const qText = getHoloQuizText(q, language);
                const opts = qText.options;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/10 bg-[#050a14]/80 p-4 space-y-3"
                  >
                    <div className="text-sm font-semibold text-[#e8f3f1]">
                      {qIdx + 1}. {qText.question}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {opts.map((opt, optIdx) => {
                        const selected = chosen === optIdx;
                        const rightOpt = optIdx === q.correctIndex;
                        let cls =
                          'border-white/10 bg-white/5 text-[#c7d8d6] hover:border-[#22d3ee]/40';
                        if (chosen !== undefined) {
                          if (rightOpt) {
                            cls = 'border-[#3ddc84] bg-[#3ddc84]/15 text-[#e8f3f1]';
                          } else if (selected) {
                            cls = 'border-[#ff4fa3] bg-[#ff4fa3]/15 text-[#e8f3f1]';
                          }
                        }
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                            }
                            className={`text-left px-3.5 py-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${cls}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {chosen !== undefined && (
                      <p
                        className={`text-xs leading-relaxed font-medium ${
                          isCorrect ? 'text-[#3ddc84]' : 'text-[#ffb020]'
                        }`}
                      >
                        {isCorrect ? (language === 'ta' ? 'சரி: ' : 'Correct: ') : (language === 'ta' ? 'குறிப்பு: ' : 'Note: ')}
                        {qText.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="text-sm font-mono tabular-nums text-[#e8f3f1]">
                Score: <span className="text-[#c6ff3d] font-bold">{correctCount} / {meta.quiz.length}</span>
                {answeredCount === meta.quiz.length && ' · Quiz complete'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAnswers({})}
                  className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-medium text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl gw-btn-lime text-xs font-semibold cursor-pointer"
                >
                  Back to Hologram
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
