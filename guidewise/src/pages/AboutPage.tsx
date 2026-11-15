import React from 'react';
import { Code2, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import { GlassCard } from '../components/GlassCard.js';
import { AppLanguage, UI_STRINGS } from '../data/i18n.js';
import { EDUCATIONAL_DISCLAIMER } from '../shared/crisprEngine.js';

interface AboutPageProps {
  language?: AppLanguage;
}

export const AboutPage: React.FC<AboutPageProps> = ({ language = 'en' }) => {
  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="space-y-2 pb-2">
        <h1 className="font-display font-bold text-[#e8f3f1] gw-page-title">
          {UI_STRINGS[language].aboutTitle}
        </h1>
        <p className="text-sm sm:text-base text-[#8aa4ad]">
          {language === 'ta'
            ? 'CRISPR-Cas9 வரிசை பொருத்தத்தை வெளிப்படையான, துல்லிய கணித அடிப்படையில் கற்பதற்காக VITAL X8 (Problem HTH-SW-02) ஹாக்கத்தானுக்காக உருவாக்கப்பட்ட கல்வித் தளம்.'
            : 'Built for VITAL X8 (Problem HTH-SW-02) as a transparent, deterministic educational platform for exploring CRISPR-Cas9 sequence matching.'}
        </p>
      </div>

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-[#22d3ee]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#e8f3f1]">
            01. Deterministic Matching &amp; Scoring Logic
          </h2>
        </div>

        <div className="space-y-3 text-sm text-[#c7d8d6] leading-relaxed">
          <p>
            GuideWise runs a pure deterministic TypeScript bioinformatics engine on both client and server:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-[#e8f3f1]">Strict Input Validation:</strong> Strips FASTA headers (<code className="font-mono text-[#22d3ee]">&gt;</code>) and whitespace, converts RNA <code className="font-mono text-[#22d3ee]">U</code> to <code className="font-mono text-[#22d3ee]">T</code>, and rejects any character outside <code className="font-mono text-[#22d3ee]">A/C/G/T</code>. Guides must be 15–25 bases; synthetic DNA must be at least 30 bases.
            </li>
            <li>
              <strong className="text-[#e8f3f1]">Bidirectional Sliding Window:</strong> Slides a window of length <code className="font-mono">L_guide</code> across both the forward (<code className="font-mono">+</code>) strand and reverse complement (<code className="font-mono">-</code>) strand, calculating Hamming distance at every offset with space for the 3&apos; PAM.
            </li>
            <li>
              <strong className="text-[#e8f3f1]">PAM Recognition:</strong> Checks the motif immediately 3&apos; of the window against IUPAC rules for <code className="font-mono">NGG</code>, <code className="font-mono">NAG</code>, or <code className="font-mono">NNGRRT</code>. Sites with missing or mismatched PAMs receive an educational score of <code className="font-mono">0.0</code>.
            </li>
            <li>
              <strong className="text-[#e8f3f1]">Seed-Weighted Educational Estimate:</strong> The last 10 bases adjacent to the PAM form the seed region. Each seed mismatch adds penalty <code className="font-mono">3</code>; each upstream mismatch adds penalty <code className="font-mono">1</code>. Score = <code className="font-mono text-[#c6ff3d]">100 × exp(-0.5 × penalty)</code>.
            </li>
            <li>
              <strong className="text-[#e8f3f1]">Cut Coordinate Mapping:</strong> Cleavage is placed 3 bp before the PAM, mapped to 1-based coordinates on the original forward strand (<code className="font-mono">end - 3</code> on <code className="font-mono">+</code>, <code className="font-mono">start + 2</code> on <code className="font-mono">-</code>).
            </li>
          </ul>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#ffb020]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#e8f3f1]">
            02. Educational Scope &amp; Scientific Limitations
          </h2>
        </div>
        <div className="space-y-3 text-sm text-[#c7d8d6] leading-relaxed">
          <p>
            Every score displayed in GuideWise is strictly labelled an <strong className="text-[#e8f3f1]">educational estimate</strong> and is never presented as an experimentally validated prediction. Real biological Cas9 activity depends on factors outside a short synthetic string:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Chromatin accessibility, nucleosome positioning, and DNA methylation state.</li>
            <li>Guide RNA secondary structure, folding stability, and cellular concentration.</li>
            <li>DNA/RNA bulges and non-canonical PAM kinetics.</li>
            <li>Cellular DNA repair preferences (NHEJ vs MMEJ vs HDR) across cell types.</li>
          </ul>
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#ff4d6d]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#e8f3f1]">
            03. Ethics &amp; Biosafety Boundaries
          </h2>
        </div>
        <p className="text-sm text-[#c7d8d6] leading-relaxed">
          GuideWise operates exclusively on synthetic DNA sequences for classroom and hackathon demonstration. The platform contains zero wet-lab protocols, zero reagent recipes, zero delivery vector instructions, and a strict Q&amp;A guardrail that refuses requests involving real human genes, clinical editing, or pathogens.
        </p>
        <div className="rounded-xl border border-[#ffb020]/35 bg-[#ffb020]/10 p-4 text-xs text-[#ffb020]">
          {EDUCATIONAL_DISCLAIMER}
        </div>
      </GlassCard>

      <GlassCard className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#7c5cff]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#e8f3f1]">
            04. Browser Holographic 3D vs. Offline Cinematics
          </h2>
        </div>
        <p className="text-sm text-[#c7d8d6] leading-relaxed">
          GuideWise renders its holographic double-helix and single-strand RNA locally in WebGL via <strong className="text-[#e8f3f1]">Three.js</strong> using physically based clearcoat materials, procedural <code className="font-mono">RoomEnvironment</code> reflections, and <code className="font-mono">UnrealBloomPass</code>—all bundled locally for offline reliability. Offline high-resolution cinematics could separately be authored in Unreal Engine using exported molecular meshes.
        </p>
      </GlassCard>
    </div>
  );
};
