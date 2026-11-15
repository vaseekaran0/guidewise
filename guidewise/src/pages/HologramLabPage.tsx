import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { HOLO_MODELS, HoloLanguage, HoloModelId } from '../data/holoParts.js';
import { AppLanguage } from '../data/i18n.js';
import { AppPage } from '../types/crispr.js';
import {
  HoloBottomControls,
  HoloInfoCard,
  HoloPartsList,
  HoloQuizModal,
  HoloTopHud,
} from '../components/holo/HoloPanels.js';
import { HoloScene } from '../components/holo/HoloScene.js';

interface HologramLabPageProps {
  motionEnabled: boolean;
  onNavigate: (page: AppPage) => void;
  appLanguage?: AppLanguage;
}

const HOLO_DEMO_PRESETS: Array<{
  id: string;
  label: string;
  labelTa: string;
  modelId: HoloModelId;
  partId: string;
  explode: number;
  note: string;
  noteTa: string;
}> = [
  {
    id: 'demo-dna',
    label: 'Demo 1: DNA Double Helix & A-T / G-C',
    labelTa: 'டெமோ 1: DNA இரட்டைச் சுருள்',
    modelId: 'dna',
    partId: 'dna-at-pair',
    explode: 0.25,
    note: 'Focuses on Adenine-Thymine base pairing and Deoxyribose backbone stability.',
    noteTa: 'A-T அடிப்படை இணைப்பு மற்றும் Deoxyribose முதுகெலும்பு அமைப்பைக் காட்டுகிறது.',
  },
  {
    id: 'demo-rna',
    label: 'Demo 2: Why RNA Uses Uracil (U) & Ribose',
    labelTa: 'டெமோ 2: RNA யுரேசில் (U) & ரைபோஸ்',
    modelId: 'rna',
    partId: 'rna-uracil',
    explode: 0.2,
    note: 'Highlights Uracil (U) and single-strand flexibility needed for guide RNA targeting.',
    noteTa: 'Guide RNA இலக்குக்குத் தேவையான Uracil (U) மற்றும் ஒற்றை இழை நெகிழ்வுத்தன்மை.',
  },
  {
    id: 'demo-crispr',
    label: 'Demo 3: Cas9 PAM Recognition & Cut Site',
    labelTa: 'டெமோ 3: Cas9 PAM & வெட்டு இடம்',
    modelId: 'crispr',
    partId: 'crispr-pam',
    explode: 0.35,
    note: 'Explodes the Cas9-sgRNA-DNA complex onto the NGG PAM anchor and active cleavage pocket.',
    noteTa: 'NGG PAM பிடிப்பு மற்றும் Cas9 வெட்டுப் பகுதியை 3D-இல் பிரித்துக் காட்டுகிறது.',
  },
];

export const HologramLabPage: React.FC<HologramLabPageProps> = ({
  motionEnabled,
  onNavigate,
  appLanguage = 'en',
}) => {
  const [modelId, setModelId] = useState<HoloModelId>('dna');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [isolateSelected, setIsolateSelected] = useState(false);
  const [xrayMode, setXrayMode] = useState(false);
  const [compareWithDna, setCompareWithDna] = useState(false);
  const [cutAnimPlaying, setCutAnimPlaying] = useState(true);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [language, setLanguage] = useState<HoloLanguage>(appLanguage);

  useEffect(() => {
    setLanguage(appLanguage);
  }, [appLanguage]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [mobilePartsOpen, setMobilePartsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [partSlideDir, setPartSlideDir] = useState<number>(1);

  const [exploredByModel, setExploredByModel] = useState<Record<HoloModelId, Set<string>>>({
    dna: new Set(),
    rna: new Set(),
    crispr: new Set(),
  });

  const activeMeta = HOLO_MODELS[modelId];
  const parts = activeMeta.parts;

  const selectedPart = useMemo(
    () => parts.find((p) => p.id === selectedPartId) ?? null,
    [parts, selectedPartId]
  );

  const handleSelectPart = useCallback(
    (partId: string | null, explicitDir?: number) => {
      if (explicitDir !== undefined) {
        setPartSlideDir(explicitDir);
      } else if (partId && selectedPartId) {
        const oldIdx = parts.findIndex((p) => p.id === selectedPartId);
        const newIdx = parts.findIndex((p) => p.id === partId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          setPartSlideDir(newIdx > oldIdx ? 1 : -1);
        }
      } else {
        setPartSlideDir(1);
      }

      setSelectedPartId(partId);
      if (!partId) {
        setIsolateSelected(false);
        return;
      }
      setExploredByModel((prev) => {
        const nextSet = new Set(prev[modelId]);
        nextSet.add(partId);
        return { ...prev, [modelId]: nextSet };
      });
    },
    [modelId, parts, selectedPartId]
  );

  const handleSelectModel = (nextModel: HoloModelId) => {
    setModelId(nextModel);
    setSelectedPartId(null);
    setPartSlideDir(1);
    setExplodeFactor(0);
    setIsolateSelected(false);
    setCompareWithDna(false);
    setTourPlaying(false);
    setMobilePartsOpen(false);
    setResetSignal((n) => n + 1);
  };

  const handleNextPart = useCallback(() => {
    const idx = selectedPartId ? parts.findIndex((p) => p.id === selectedPartId) : -1;
    const nextIdx = (idx + 1) % parts.length;
    handleSelectPart(parts[nextIdx].id, 1);
  }, [parts, selectedPartId, handleSelectPart]);

  const handlePrevPart = useCallback(() => {
    const idx = selectedPartId ? parts.findIndex((p) => p.id === selectedPartId) : 0;
    const prevIdx = (idx - 1 + parts.length) % parts.length;
    handleSelectPart(parts[prevIdx].id, -1);
  }, [parts, selectedPartId, handleSelectPart]);

  const handleResetView = () => {
    setSelectedPartId(null);
    setPartSlideDir(1);
    setExplodeFactor(0);
    setIsolateSelected(false);
    setXrayMode(false);
    setCompareWithDna(false);
    setTourPlaying(false);
    setResetSignal((n) => n + 1);
  };

  // Escape key deselects cleanly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedPartId && !quizOpen) {
        handleSelectPart(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedPartId, quizOpen, handleSelectPart]);

  // Guided tour auto-advance
  useEffect(() => {
    if (!tourPlaying) return;
    if (!selectedPartId) {
      handleSelectPart(parts[0].id, 1);
    }
    const interval = window.setInterval(() => {
      setPartSlideDir(1);
      setSelectedPartId((curr) => {
        const currIdx = curr ? parts.findIndex((p) => p.id === curr) : -1;
        if (currIdx >= parts.length - 1) {
          setTourPlaying(false);
          return curr;
        }
        const nextId = parts[currIdx + 1].id;
        setExploredByModel((prev) => {
          const nextSet = new Set(prev[modelId]);
          nextSet.add(nextId);
          return { ...prev, [modelId]: nextSet };
        });
        return nextId;
      });
    }, motionEnabled ? 3800 : 4500);
    return () => window.clearInterval(interval);
  }, [tourPlaying, modelId, parts, motionEnabled, selectedPartId, handleSelectPart]);

  const launchDemoPreset = (preset: (typeof HOLO_DEMO_PRESETS)[number]) => {
    setModelId(preset.modelId);
    setExplodeFactor(preset.explode);
    setIsolateSelected(false);
    setXrayMode(false);
    setCompareWithDna(preset.modelId === 'rna');
    setResetSignal((n) => n + 1);
    setTourPlaying(false);
    handleSelectPart(preset.partId, 1);
  };

  const exploredSet = exploredByModel[modelId];

  return (
    <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex-1 flex flex-col">
      <div className="rounded-[22px] border border-white/15 bg-[#050a14]/92 shadow-[0_24px_60px_rgba(2,6,18,0.65),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden flex-1 flex flex-col">
        {/* Top Re-Scanning Title & Progress HUD */}
        <HoloTopHud
          modelId={modelId}
          language={language}
          onSelectLanguage={setLanguage}
          exploredCount={exploredSet.size}
          totalParts={parts.length}
          onOpenQuiz={() => setQuizOpen(true)}
          motionEnabled={motionEnabled}
        />

        {/* Quick Presenter Demo Presets Bar */}
        <div className="px-4 py-2 border-b border-white/10 bg-[#060f20]/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#22d3ee]">
              <Sparkles className="w-3.5 h-3.5 text-[#c6ff3d]" aria-hidden="true" />
              {language === 'ta' ? 'விரைவு டெமோ:' : 'Quick Demo:'}
            </span>
            {HOLO_DEMO_PRESETS.map((preset) => {
              const isCurrent = modelId === preset.modelId && selectedPartId === preset.partId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={language === 'ta' ? preset.noteTa : preset.note}
                  onClick={() => launchDemoPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-[#c6ff3d] bg-[#c6ff3d] text-[#050a14] font-semibold'
                      : 'border-white/15 bg-white/5 text-[#c7d8d6] hover:border-[#22d3ee]/50 hover:text-[#e8f3f1]'
                  }`}
                >
                  {language === 'ta' ? preset.labelTa : preset.label}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-[#8aa4ad] hidden xl:inline">
            {language === 'ta'
              ? 'எந்தப் பகுதியையும் கிளிக் செய்து 3D விளக்கத்தைக் காணலாம்.'
              : 'Click any demo preset or 3D structure to inspect its role.'}
          </span>
        </div>

        {/* Main 3-Column Holographic Lab Workspace */}
        <div className="flex-1 flex flex-col md:flex-row items-stretch gap-3 p-3 sm:p-4 pb-20 md:pb-4">
          {/* Left Parts List (Bottom Sheet on 360px Mobile) */}
          <HoloPartsList
            parts={parts}
            selectedPartId={selectedPartId}
            exploredIds={exploredSet}
            language={language}
            onSelectPart={(id) => {
              setTourPlaying(false);
              setMobilePartsOpen(false);
              handleSelectPart(id);
            }}
            mobileOpen={mobilePartsOpen}
            onToggleMobileOpen={() => setMobilePartsOpen((o) => !o)}
          />

          {/* Center 3D Holographic Viewport */}
          <div className="flex-1 min-w-0 min-h-[540px] flex">
            <HoloScene
              modelId={modelId}
              selectedPartId={selectedPartId}
              onSelectPart={(id) => {
                setTourPlaying(false);
                handleSelectPart(id);
              }}
              explodeFactor={explodeFactor}
              isolateSelected={isolateSelected}
              xrayMode={xrayMode}
              compareWithDna={compareWithDna}
              cutAnimPlaying={cutAnimPlaying}
              motionEnabled={motionEnabled}
              language={language}
              resetSignal={resetSignal}
              exploredIds={exploredSet}
            />
          </div>

          {/* Right Info Card with HUD Corner Brackets & 3D Slide Transitions */}
          <HoloInfoCard
            modelId={modelId}
            parts={parts}
            selectedPart={selectedPart}
            slideDirection={partSlideDir}
            onJumpToPart={(id) => {
              setTourPlaying(false);
              handleSelectPart(id);
            }}
            language={language}
            motionEnabled={motionEnabled}
            tourPlaying={tourPlaying}
            onToggleTour={() => setTourPlaying((t) => !t)}
            onPrevPart={() => {
              setTourPlaying(false);
              handlePrevPart();
            }}
            onNextPart={() => {
              setTourPlaying(false);
              handleNextPart();
            }}
            onClosePart={() => handleSelectPart(null)}
            compareWithDna={compareWithDna}
            onToggleCompareDna={() => setCompareWithDna((c) => !c)}
            cutAnimPlaying={cutAnimPlaying}
            onToggleCutAnim={() => setCutAnimPlaying((c) => !c)}
            onTryInSimulator={() => onNavigate('simulator')}
          />
        </div>

        {/* Bottom Model Switcher & Explode / Isolate / X-Ray / Reset Bar */}
        <HoloBottomControls
          modelId={modelId}
          onSelectModel={handleSelectModel}
          explodeFactor={explodeFactor}
          onChangeExplode={setExplodeFactor}
          isolateSelected={isolateSelected}
          onToggleIsolate={() => setIsolateSelected((i) => !i)}
          hasSelected={Boolean(selectedPartId)}
          xrayMode={xrayMode}
          onToggleXray={() => setXrayMode((x) => !x)}
          onResetView={handleResetView}
        />
      </div>

      {/* 3-Question Mini Quiz Modal */}
      <HoloQuizModal
        modelId={modelId}
        language={language}
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        motionEnabled={motionEnabled}
      />
    </div>
  );
};
