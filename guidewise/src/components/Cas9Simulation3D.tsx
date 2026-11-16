import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  Play, Pause, RotateCcw, SkipForward, ZoomIn, ZoomOut,
  Eye, EyeOff, Dna, Scissors, Wrench, Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { GlassCard } from './GlassCard.js';

/**
 * Cas9Simulation3D
 *
 * Interactive educational CRISPR-Cas9 molecular visualization.
 *
 * IMPORTANT: Geometry is procedural and illustrative only. It is NOT an
 * experimentally validated molecular structure. The 4-phase animation
 * (Approach → Cas9 Binding → Molecular Cut → After the Cut) and the two
 * repair modes (NHEJ / HDR) are simplified educational models.
 */

// ─── Phase state machine ─────────────────────────────────────────────────────
export type Cas9Phase = 'idle' | 'approach' | 'binding' | 'cutting' | 'cut' | 'nhej' | 'hdr';
export type RepairMode = 'none' | 'nhej' | 'hdr';

export const PHASE_ORDER: Cas9Phase[] = ['idle', 'approach', 'binding', 'cutting', 'cut', 'nhej'];
const PHASE_LABELS: Record<Cas9Phase, string> = {
  idle: 'Ready',
  approach: '1 · Cas9 Approach',
  binding: '2 · Target Recognition',
  cutting: '3 · Molecular Cut',
  cut: '4 · Double-Strand Break',
  nhej: '5 · NHEJ Repair',
  hdr: '5 · HDR Repair',
};

export const PHASE_INFO: Record<Cas9Phase, {
  title: string; component: string; what: string; why: string; result: string;
}> = {
  idle: {
    title: 'Ready to scan',
    component: 'Cas9 + guide RNA + DNA',
    what: 'The Cas9–guide RNA complex is loaded. The DNA double helix is intact and slowly rotating.',
    why: 'Cas9 must first locate a matching 20-nt target next to a PAM before any cut can occur.',
    result: 'No cut yet. Press Play to begin the educational sequence.',
  },
  approach: {
    title: 'Cas9 approaches DNA',
    component: 'Cas9 protein + guide RNA',
    what: 'The Cas9–guide RNA complex moves toward the DNA and begins scanning for a PAM-proximal target.',
    why: 'Cas9 is an RNA-guided endonuclease; the 20-nt guide spacer defines where it will bind.',
    result: 'Cas9 docks near a candidate site; the target region highlights.',
  },
  binding: {
    title: 'Target recognition & R-loop',
    component: 'Guide RNA + target DNA strand',
    what: 'The guide RNA base-pairs with the complementary DNA strand, forming an R-loop while the displaced strand is held aside.',
    why: 'Correct base pairing (especially in the PAM-proximal seed) licenses Cas9 to cleave. Mismatches destabilize binding.',
    result: 'A stable Cas9–DNA R-loop forms; the two strands are locally unwound.',
  },
  cutting: {
    title: 'Molecular cut (conceptual)',
    component: 'Cas9 nuclease domains (RuvC + HNH)',
    what: 'Cas9 makes a blunt double-strand break ~3 bp upstream of the PAM. The two strands are shown separating.',
    why: 'Cas9 has two nuclease domains that each cut one strand, producing a double-strand break (DSB).',
    result: 'The DNA is severed into two ends at the cut site.',
  },
  cut: {
    title: 'After the cut',
    component: 'Broken DNA ends',
    what: 'The two DNA fragments drift apart, exposing the double-strand break. Energy particles mark the cut locus.',
    why: 'The cell must repair the DSB; the repair pathway choice determines the outcome.',
    result: 'Two free DNA ends are visible. Choose NHEJ or HDR to see a simplified repair.',
  },
  nhej: {
    title: 'NHEJ — Non-Homologous End Joining',
    component: 'Illustrative repair machinery + DNA ends',
    what: 'The two broken ends are re-joined directly. This error-prone pathway often introduces small insertions or deletions (indels).',
    why: 'NHEJ is fast and active throughout the cell cycle but can disrupt the target gene.',
    result: 'A repaired but possibly mutated sequence (small indel shown illustratively).',
  },
  hdr: {
    title: 'HDR — Homology-Directed Repair',
    component: 'Repair template + damaged DNA',
    what: 'A homologous repair template aligns with the broken region and is copied to restore or edit the sequence precisely.',
    why: 'HDR is template-guided and precise but mainly occurs in dividing cells; it is not guaranteed.',
    result: 'An illustrative precisely repaired / edited sequence (template-dependent).',
  },
};

interface Cas9Simulation3DProps {
  dna?: string;
  guide?: string;
  pam?: string;
  reducedMotion?: boolean;
  className?: string;
}

const BASE_COLORS: Record<string, number> = {
  A: 0xff5d8f,
  T: 0xffb020,
  G: 0x3ddc84,
  C: 0x4cc9ff,
  U: 0xc084fc,
};

// ─── Scientific references ──────────────────────────────────────────────────
// These are real, experimentally determined structures. The 3D geometry here is
// a procedural *illustration* inspired by them — NOT the deposited coordinates.
export const PDB_REFERENCES = [
  {
    id: '4OO8',
    title: 'Cas9–sgRNA–DNA recognition complex (wild-type Streptococcus pyogenes)',
    journal: 'Nishimasu et al., Cell 2014',
    note: 'HNH + RuvC + REC + NUC domain architecture; PAM-proximal seed.',
  },
  {
    id: '4008',
    title: 'Cas9 HNH nuclease domain in complex with DNA',
    journal: 'Nishimasu et al., Cell 2014',
    note: 'HNH cleaves the target (complementary) strand.',
  },
  {
    id: '5F9R',
    title: 'Cas9 RuvC domain–DNA cleavage intermediate',
    journal: 'Mallery et al., 2018',
    note: 'RuvC cleaves the non-target (displaced) strand.',
  },
  {
    id: '1EHZ',
    title: 'Canonical B-DNA double helix (Dickerson dodecamer)',
    journal: 'Drew & Dickerson, 1981',
    note: 'Validated B-form DNA geometry reference.',
  },
] as const;

export type VizMode = 'ball-stick' | 'ribbon' | 'surface' | 'helix' | 'cutaway';

export const VIZ_MODES: { id: VizMode; label: string }[] = [
  { id: 'ball-stick', label: 'Ball & Stick' },
  { id: 'ribbon', label: 'Ribbon' },
  { id: 'surface', label: 'Surface' },
  { id: 'helix', label: 'DNA Helix' },
  { id: 'cutaway', label: 'Cutaway' },
];

// Domain callouts for Cas9 (illustrative, based on 4OO8 architecture)
export const CAS9_DOMAINS = [
  { key: 'REC1', label: 'REC1', color: 0x34e0ff, note: 'Recognition lobe — binds PAM & DNA backbone' },
  { key: 'REC2', label: 'REC2', color: 0x22d3ee, note: 'Recognition lobe' },
  { key: 'HNH', label: 'HNH', color: 0xff5d8f, note: 'Nuclease domain — cleaves target strand' },
  { key: 'RuvC', label: 'RuvC', color: 0xc084fc, note: 'Nuclease domain — cleaves non-target strand' },
  { key: 'NUC', label: 'NUC', color: 0xffb347, note: 'Nuclease lobe (HNH+RuvC scaffold)' },
  { key: 'PI', label: 'PI', color: 0xffd98a, note: 'PAM-interacting domain — reads 5′-NGG-3′' },
] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,210,140,0.7)');
    grad.addColorStop(1, 'rgba(5,10,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeTree(root: THREE.Object3D) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  root.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.geometry) geos.add(m.geometry);
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach((x) => mats.add(x));
      else mats.add(m.material);
    }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
}

export const Cas9Simulation3D: React.FC<Cas9Simulation3DProps> = ({
  dna = 'GATCCGTAACGGTTCAGCTAGGCATCGATCGGGAATTCCGTACGTAGCTAGCT',
  guide = 'GAUCCGUAACGGUUCAGCUA',
  pam = 'NGG',
  reducedMotion = false,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [webglError, setWebglError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Cas9Phase>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepMode, setStepMode] = useState(false);
  const [phaseProgress, setPhaseProgress] = useState(0); // 0..1 within phase
  const [repairMode, setRepairMode] = useState<RepairMode>('none');
  const [vizMode, setVizMode] = useState<VizMode>('ball-stick');

  // Visibility toggles
  const [showLabels, setShowLabels] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [showCas9, setShowCas9] = useState(true);
  const [showBases, setShowBases] = useState(true);

  // Scene refs (imperative three objects)
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    composer: EffectComposer | null;
    helixRoot: THREE.Group;
    strandA: THREE.Group;
    strandB: THREE.Group;
    cas9: THREE.Group;
    guideRNA: THREE.Group;
    pamMarker: THREE.Group;
    cutParticles: THREE.Points;
    baseNodes: THREE.Object3D[];
    targetStart: number;
    cutBp: number;
    halfH: number;
    radius: number;
    domainLabels: THREE.Sprite[];
    resize: () => void;
  } | null>(null);

  const stateRef = useRef({
    phase,
    progress: 0,
    playing: isPlaying,
    reducedMotion,
    showLabels,
    showGuide,
    showCas9,
    showBases,
    repairMode,
    vizMode,
    userInteracting: false,
  });

  useEffect(() => {
    stateRef.current = {
      phase, progress: phaseProgress, playing: isPlaying, reducedMotion,
      showLabels, showGuide, showCas9, showBases, repairMode, vizMode,
      userInteracting: stateRef.current.userInteracting,
    };
  }, [phase, phaseProgress, isPlaying, reducedMotion, showLabels, showGuide, showCas9, showBases, repairMode, vizMode]);

  // ─── Scene setup (runs once) ─────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setWebglError('WebGL is not supported on this device. The 3D simulation requires hardware acceleration.');
      return;
    }

    let isSoftwareGl = false;
    const glCtx = renderer.getContext();
    if (glCtx) {
      const dbg = glCtx.getExtension('WEBGL_debug_renderer_info');
      const rname = dbg ? String(glCtx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      isSoftwareGl = /swiftshader|llvmpipe|software/i.test(rname);
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    const fog = new THREE.FogExp2(0x04060d, 0.016);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 240);
    camera.position.set(0, 2, 30);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 10;
    controls.maxDistance = 70;
    controls.target.set(0, 0, 0);
    const onCtrlStart = () => { stateRef.current.userInteracting = true; };
    const onCtrlEnd = () => { stateRef.current.userInteracting = false; };
    controls.addEventListener('start', onCtrlStart);
    controls.addEventListener('end', onCtrlEnd);

    // Lighting
    scene.add(new THREE.HemisphereLight(0x2a3a5a, 0x04060d, 0.5));
    const key = new THREE.DirectionalLight(0xffd98a, 0.9);
    key.position.set(18, 24, 20);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x22d3ee, 1.0);
    rim.position.set(-20, -6, -18);
    scene.add(rim);
    const gold = new THREE.PointLight(0xffb347, 0.5, 70, 1.4);
    gold.position.set(0, 8, 18);
    scene.add(gold);

    // Post-processing bloom
    let composer: EffectComposer | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.5, 0.82));
      composer.addPass(new OutputPass());
    }

    // Root helix
    const helixRoot = new THREE.Group();
    scene.add(helixRoot);

    // Two strand groups (separated on cut)
    const strandA = new THREE.Group();
    const strandB = new THREE.Group();
    helixRoot.add(strandA, strandB);

    // Cas9 + guide RNA
    const cas9 = new THREE.Group();
    scene.add(cas9);
    const guideRNA = new THREE.Group();
    scene.add(guideRNA);

    // PAM marker
    const pamMarker = new THREE.Group();
    helixRoot.add(pamMarker);

    // Cut particles
    const sparkCount = isSoftwareGl ? 200 : 420;
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sparkCount * 3), 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.5, map: makeGlowTexture(), color: 0xffc247,
      transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const cutParticles = new THREE.Points(sparkGeo, sparkMat);
    helixRoot.add(cutParticles);

    // ── Build DNA ──────────────────────────────────────────────────────────
    const seq = dna.toUpperCase().replace(/[^ATGC]/g, '') || 'ATGCATGCATGCATGCATGC';
    const gSeq = guide.toUpperCase().replace(/U/g, 'T').replace(/[^ATGC]/g, '');
    // find a target site: complement of guide in seq (forward). Fallback to first window.
    let targetStart = 0;
    const comp = (b: string) => ({ A: 'T', T: 'A', G: 'C', C: 'G' }[b] || 'A');
    const rcGuide = gSeq.split('').map(comp).reverse().join('');
    let found = seq.indexOf(rcGuide);
    if (found < 0 && gSeq.length > 0 && gSeq.length <= seq.length) {
      // find best window by hamming distance
      let best = Infinity;
      for (let i = 0; i + gSeq.length <= seq.length; i++) {
        let d = 0;
        for (let j = 0; j < gSeq.length; j++) if (seq[i + j] !== gSeq[j]) d++;
        if (d < best) { best = d; found = i; }
      }
      if (found < 0) found = 0;
    }
    if (found < 0) found = 0;
    targetStart = Math.max(0, Math.min(found, Math.max(0, seq.length - gSeq.length)));

    const n = Math.min(seq.length, 60); // cap geometry for performance
    const stepY = 0.56;
    const twist = (Math.PI * 2) / 10.5;
    const radius = 2.0;
    const halfH = ((n - 1) * stepY) / 2;

    const sugarGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const phosGeo = new THREE.SphereGeometry(0.16, 12, 10);
    const baseGeo = new THREE.SphereGeometry(0.28, 14, 12);
    const bondGeo = new THREE.CylinderGeometry(0.05, 0.05, radius * 1.9, 8);
    bondGeo.rotateZ(Math.PI / 2);

    const sugarMat = new THREE.MeshPhysicalMaterial({
      color: 0xffc247, emissive: 0xff9a1f, emissiveIntensity: 0.12,
      metalness: 0.9, roughness: 0.2, clearcoat: 1.0,
    });
    const phosMat = new THREE.MeshPhysicalMaterial({
      color: 0x34e0ff, emissive: 0x0e7490, emissiveIntensity: 0.16,
      metalness: 0.5, roughness: 0.18, clearcoat: 1.0,
    });

    const baseNodes: THREE.Object3D[] = [];
    const cutBp = Math.max(1, targetStart + Math.floor((gSeq.length || 20) / 2));

    for (let i = 0; i < n; i++) {
      const y = i * stepY - halfH;
      const ang = i * twist;
      const isTarget = i >= targetStart && i < targetStart + (gSeq.length || 20);

      // Forward strand (A)
      const ax = Math.cos(ang) * radius;
      const az = Math.sin(ang) * radius;
      const sugarA = new THREE.Mesh(sugarGeo, sugarMat);
      sugarA.position.set(ax, y, az);
      const phosA = new THREE.Mesh(phosGeo, phosMat);
      phosA.position.set(ax, y - stepY * 0.4, az);
      strandA.add(sugarA, phosA);

      // Reverse strand (B)
      const bx = Math.cos(ang + Math.PI) * radius;
      const bz = Math.sin(ang + Math.PI) * radius;
      const sugarB = new THREE.Mesh(sugarGeo, sugarMat);
      sugarB.position.set(bx, y, bz);
      const phosB = new THREE.Mesh(phosGeo, phosMat);
      phosB.position.set(bx, y - stepY * 0.4, bz);
      strandB.add(sugarB, phosB);

      // Base pair + H-bond strut
      const base = seq[i] || 'A';
      const bColor = isTarget ? 0xffc247 : BASE_COLORS[base] ?? 0xffffff;
      const baseMat = new THREE.MeshPhysicalMaterial({
        color: bColor, emissive: bColor, emissiveIntensity: isTarget ? 0.22 : 0.08,
        metalness: 0.2, roughness: 0.3, clearcoat: 0.8,
      });
      const bA = new THREE.Mesh(baseGeo, baseMat);
      bA.position.set(ax * 0.5, y, az * 0.5);
      const bB = new THREE.Mesh(baseGeo, baseMat);
      bB.position.set(bx * 0.5, y, bz * 0.5);
      const bond = new THREE.Mesh(bondGeo, new THREE.MeshBasicMaterial({
        color: isTarget ? 0xffd98a : 0x8aa4ad, transparent: true, opacity: isTarget ? 0.9 : 0.4,
      }));
      bond.position.set(0, y, 0);
      bond.rotation.y = ang;
      // split bond into two halves (owned by each strand) so they separate on cut
      const bondHalfA = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, radius, 6), (bond.material as THREE.Material));
      bondHalfA.rotation.copy(bond.rotation);
      bondHalfA.position.set(ax * 0.5, y, az * 0.5);
      const bondHalfB = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, radius, 6), (bond.material as THREE.Material));
      bondHalfB.rotation.copy(bond.rotation);
      bondHalfB.position.set(bx * 0.5, y, bz * 0.5);
      strandA.add(bA, bondHalfA);
      strandB.add(bB, bondHalfB);
      baseNodes.push(bA, bB, bondHalfA, bondHalfB);
    }

    // PAM marker at target end
    const pamAng = targetStart * twist;
    const pamMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85 });
    for (let k = 0; k < 3; k++) {
      const idx = targetStart + (gSeq.length || 20) + k;
      if (idx >= n) break;
      const y = idx * stepY - halfH;
      const a = idx * twist;
      const px = Math.cos(a) * radius;
      const pz = Math.sin(a) * radius;
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), pamMat);
      node.position.set(px, y, pz);
      pamMarker.add(node);
    }
    void pamAng;

    // Cas9 protein — procedural illustrative globular blob (labelled illustrative)
    // ── Cas9 protein: multi-domain illustrative architecture (per PDB 4OO8) ──
    // REC lobe (recognition), NUC lobe (HNH + RuvC + PI). Geometry is procedural
    // and illustrative — NOT the deposited atomic coordinates.
    const mkDomain = (color: number, emissive: number, r: number, detail = 2) => {
      const m = new THREE.MeshPhysicalMaterial({
        color, emissive, emissiveIntensity: 0.12, metalness: 0.3, roughness: 0.35,
        clearcoat: 0.6, transparent: true, opacity: 0.88,
      });
      return new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), m);
    };

    // REC1 / REC2 (recognition cleft, cyan)
    const rec1 = mkDomain(0x34e0ff, 0x0e7490, 1.9, 2);
    rec1.position.set(1.6, 1.4, 0.6);
    rec1.scale.set(1.2, 0.9, 1.0);
    const rec2 = mkDomain(0x22d3ee, 0x0e7490, 1.4, 2);
    rec2.position.set(2.4, -0.4, -0.3);

    // NUC lobe scaffold (warm gold)
    const nuc = mkDomain(0xffb347, 0xff9a1f, 2.4, 2);
    nuc.position.set(-0.4, -0.2, -0.4);
    nuc.scale.set(1.0, 1.25, 0.95);

    // HNH domain (magenta-rose) — cleaves target strand
    const hnh = mkDomain(0xff5d8f, 0x8f1d3f, 1.0, 2);
    hnh.position.set(0.7, -1.9, 0.9);

    // RuvC domain (violet) — cleaves non-target strand
    const ruvc = mkDomain(0xc084fc, 0x5b1d8f, 1.1, 2);
    ruvc.position.set(-1.5, 1.3, -0.6);

    // PI (PAM-interacting) domain (pale gold) — reads 5'-NGG-3'
    const pi = mkDomain(0xffd98a, 0xff9a1f, 0.9, 2);
    pi.position.set(-2.0, -0.8, 0.4);

    cas9.add(rec1, rec2, nuc, hnh, ruvc, pi);
    cas9.position.set(0, 8, 0);
    cas9.visible = false;

    // Domain label sprites (only shown when showLabels && vizMode==='surface')
    const domainLabels: THREE.Sprite[] = [];
    const mkLabel = (text: string, color: string): THREE.Sprite => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(5,10,20,0.8)';
        ctx.fillRect(0, 0, 128, 48);
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 126, 46);
        ctx.fillStyle = color; ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 24);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      spr.scale.set(1.6, 0.6, 1);
      return spr;
    };
    const labels: { spr: THREE.Sprite; anchor: THREE.Vector3 }[] = [
      { spr: mkLabel('REC1', '#34e0ff'), anchor: new THREE.Vector3(1.6, 2.6, 0.6) },
      { spr: mkLabel('RuvC', '#c084fc'), anchor: new THREE.Vector3(-1.5, 2.5, -0.6) },
      { spr: mkLabel('HNH', '#ff5d8f'), anchor: new THREE.Vector3(0.7, -3.0, 0.9) },
      { spr: mkLabel('PI', '#ffd98a'), anchor: new THREE.Vector3(-2.0, -1.9, 0.4) },
    ];
    for (const l of labels) {
      l.spr.position.copy(l.anchor);
      cas9.add(l.spr);
      domainLabels.push(l.spr);
    }

    // Guide RNA — a curved colored tube paired against the target
    const gRNApts: THREE.Vector3[] = [];
    const gLen = Math.min(gSeq.length || 20, n - targetStart);
    for (let i = 0; i <= gLen; i++) {
      const bp = targetStart + i;
      const y = bp * stepY - halfH;
      const a = bp * twist + Math.PI; // opposite strand side
      gRNApts.push(new THREE.Vector3(Math.cos(a) * (radius * 0.55), y, Math.sin(a) * (radius * 0.55)));
    }
    if (gRNApts.length > 1) {
      const gCurve = new THREE.CatmullRomCurve3(gRNApts);
      const gTube = new THREE.Mesh(
        new THREE.TubeGeometry(gCurve, Math.max(8, gRNApts.length * 2), 0.16, 8, false),
        new THREE.MeshPhysicalMaterial({ color: 0xc084fc, emissive: 0x5b1d8f, emissiveIntensity: 0.22, metalness: 0.2, roughness: 0.3, clearcoat: 0.8 })
      );
      guideRNA.add(gTube);
    }
    guideRNA.visible = false;

    // Cut spark velocities
    const sparkPos = sparkGeo.getAttribute('position') as THREE.BufferAttribute;
    const sparkVel = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i++) {
      sparkVel[i * 3] = (Math.random() - 0.5) * 0.12;
      sparkVel[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
      sparkVel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }

    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    const resize = () => {
      const w = mount.clientWidth || 800;
      const h = mount.clientHeight || 500;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      composer?.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    sceneRef.current = {
      renderer, scene, camera, controls, composer,
      helixRoot, strandA, strandB, cas9, guideRNA, pamMarker,
      cutParticles, baseNodes, targetStart, cutBp, halfH, radius, domainLabels, resize,
    };
    setLoading(false);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      controls.removeEventListener('start', onCtrlStart);
      controls.removeEventListener('end', onCtrlEnd);
      controls.dispose();
      disposeTree(scene);
      sparkGeo.dispose();
      sparkMat.dispose();
      composer?.dispose();
      renderer.dispose();
      sceneRef.current = null;
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dna, guide]);

  // ─── Animation loop ────────────────────────────────────────────────────
  const frameRef = useRef<number>(0);
  const lastT = useRef<number>(0);
  const sparkSeed = useRef(0);

  useEffect(() => {
    const tick = (now: number) => {
      frameRef.current = requestAnimationFrame(tick);
      const objs = sceneRef.current;
      if (!objs) return;

      const dt = lastT.current ? Math.min(0.05, (now - lastT.current) / 1000) : 0.016;
      lastT.current = now;

      const st = stateRef.current;
      const {
        helixRoot, strandA, strandB, cas9, guideRNA, pamMarker, cutParticles,
        controls, camera, renderer, scene, composer,
      } = objs;

      // Advance phase progress
      let prog = st.progress;
      if (st.playing && !st.reducedMotion) {
        prog = Math.min(1, prog + dt * 0.32);
        stateRef.current.progress = prog;
        if (prog >= 1) {
          // phase complete — advance
          const idx = PHASE_ORDER.indexOf(st.phase === 'hdr' ? 'hdr' : st.phase);
          if (st.phase === 'cut' && st.repairMode === 'hdr') {
            setPhase('hdr');
          } else if (st.phase === 'cut' && st.repairMode === 'nhej') {
            setPhase('nhej');
          } else if (st.phase === 'nhej' || st.phase === 'hdr') {
            setIsPlaying(false);
          } else {
            const next = PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, idx + 1)];
            setPhase(next);
          }
          stateRef.current.progress = 0;
          prog = 0;
        }
      }

      const p = smooth(clamp01(prog));
      const phase = st.phase;

      // Idle rotation
      if (!st.reducedMotion) {
        helixRoot.rotation.y += dt * 0.15;
      }

      // Phase-driven visuals
      // Approach: Cas9 descends toward target
      if (phase === 'approach' || phase === 'binding' || phase === 'cutting' || phase === 'cut' || phase === 'nhej' || phase === 'hdr') {
        const targetY = objs.cutBp * 0.56 - objs.halfH;
        if (phase === 'approach') {
          cas9.visible = st.showCas9;
          guideRNA.visible = st.showGuide;
          cas9.position.lerp(new THREE.Vector3(objs.radius + 2.5, targetY, 0), 0.06 + p * 0.1);
          cas9.rotation.z = Math.sin(now * 0.001) * 0.1;
        } else {
          cas9.position.lerp(new THREE.Vector3(objs.radius + 1.2, targetY, 0), 0.12);
        }
      }

      // Binding: guide RNA fades in
      if (phase === 'binding') {
        guideRNA.visible = st.showGuide;
        guideRNA.scale.setScalar(0.6 + p * 0.4);
      }

      // Cutting + cut: separate strands, spark particles
      if (phase === 'cutting' || phase === 'cut' || phase === 'nhej' || phase === 'hdr') {
        const sepTarget = phase === 'cutting' ? p * 0.6 : 1.0;
        strandA.position.x = -sepTarget * 3.0;
        strandB.position.x = sepTarget * 3.0;
        guideRNA.visible = false;

        // sparks at cut locus
        const cutY = objs.cutBp * 0.56 - objs.halfH;
        const sparkPos = cutParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
        const active = phase === 'cutting' ? 1 : phase === 'cut' ? Math.max(0, 1 - p) : 0;
        (cutParticles.material as THREE.PointsMaterial).opacity = active * 0.9;
        if (active > 0.01) {
          sparkSeed.current += dt;
          for (let i = 0; i < sparkPos.count; i++) {
            let x = sparkPos.getX(i) + (Math.random() - 0.5) * 0.08;
            let y = sparkPos.getY(i) + (Math.random() - 0.5) * 0.08 + 0.01;
            let z = sparkPos.getZ(i) + (Math.random() - 0.5) * 0.08;
            if (Math.abs(x) > 3 || Math.abs(y) > 3 || Math.abs(z) > 3) {
              x = (Math.random() - 0.5) * 0.4;
              y = cutY + (Math.random() - 0.5) * 0.4;
              z = (Math.random() - 0.5) * 0.4;
            }
            sparkPos.setXYZ(i, x, y, z);
          }
          sparkPos.needsUpdate = true;
        }
      }

      // Reset when idle
      if (phase === 'idle') {
        strandA.position.x = 0;
        strandB.position.x = 0;
        cas9.visible = false;
        guideRNA.visible = false;
        (cutParticles.material as THREE.PointsMaterial).opacity = 0;
      }

      // Repair visualization (simple visual: tint the strands)
      if (phase === 'nhej' || phase === 'hdr') {
        strandA.position.x = -0.8;
        strandB.position.x = 0.8;
        if (phase === 'nhej') {
          // small indel jitter
          if (!st.reducedMotion) strandA.position.y = Math.sin(now * 0.004) * 0.05;
        }
      }

      // Visibility toggles
      pamMarker.visible = st.showLabels;
      cas9.visible = st.showCas9 && phase !== 'idle' && phase !== 'binding' && phase !== 'cutting' && phase !== 'cut' && phase !== 'nhej' && phase !== 'hdr' ? st.showCas9 : st.showCas9 && phase !== 'idle';
      if (phase === 'idle') cas9.visible = false;
      guideRNA.visible = st.showGuide && (phase === 'binding' || phase === 'approach');

      // Domain labels: only in surface mode with labels on
      for (const spr of objs.domainLabels) {
        spr.visible = st.showLabels && st.vizMode === 'surface' && cas9.visible;
      }

      // Visualization mode: adjust base/sugar opacity & wireframe-ish look
      for (const b of objs.baseNodes) b.visible = st.showBases;
      const mode = st.vizMode;
      helixRoot.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.material && !Array.isArray(m.material) && 'opacity' in m.material) {
          const mat = m.material as THREE.Material;
          if (mode === 'surface') {
            mat.transparent = false;
            (mat as THREE.MeshPhysicalMaterial).opacity = 1;
          } else if (mode === 'ribbon' || mode === 'cutaway') {
            mat.transparent = true;
            (mat as THREE.MeshPhysicalMaterial).opacity = mode === 'cutaway' ? 0.5 : 0.8;
          }
        }
      });

      // Cinematic camera transitions per stage (skippable for reduced-motion / user interaction)
      if (!st.reducedMotion && !st.userInteracting) {
        const cutY = objs.cutBp * 0.56 - objs.halfH;
        let targetPos: THREE.Vector3 | null = null;
        let targetLook: THREE.Vector3 | null = null;
        if (phase === 'idle' || phase === 'approach') {
          targetPos = new THREE.Vector3(0, 3, 30);
          targetLook = new THREE.Vector3(0, 0, 0);
        } else if (phase === 'binding') {
          targetPos = new THREE.Vector3(10, cutY + 3, 16);
          targetLook = new THREE.Vector3(2, cutY, 0);
        } else if (phase === 'cutting') {
          targetPos = new THREE.Vector3(6, cutY + 1.5, 11);
          targetLook = new THREE.Vector3(0, cutY, 0);
        } else if (phase === 'cut') {
          targetPos = new THREE.Vector3(0, cutY + 1, 15);
          targetLook = new THREE.Vector3(0, cutY, 0);
        } else if (phase === 'nhej' || phase === 'hdr') {
          targetPos = new THREE.Vector3(0, cutY + 2, 13);
          targetLook = new THREE.Vector3(0, cutY, 0);
        }
        if (targetPos) {
          camera.position.lerp(targetPos, 0.02 + p * 0.03);
          if (targetLook) controls.target.lerp(targetLook, 0.04);
        }
      }

      controls.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);

      // propagate progress to React (throttled via raf already)
      if (st.playing) setPhaseProgress(prog);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Controls ──────────────────────────────────────────────────────────
  const startSim = useCallback(() => {
    setPhase('approach');
    setPhaseProgress(0);
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (phase === 'idle' || phase === 'nhej' || phase === 'hdr') {
      setPhase('approach');
      setPhaseProgress(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((v) => !v);
    }
  }, [phase]);

  const restart = useCallback(() => {
    setPhase('idle');
    setPhaseProgress(0);
    setIsPlaying(false);
    setRepairMode('none');
  }, []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    const idx = PHASE_ORDER.indexOf(phase);
    const next = PHASE_ORDER[Math.min(PHASE_ORDER.length - 1, idx + 1)];
    setPhase(next);
    setPhaseProgress(0);
  }, [phase]);

  const zoom = useCallback((factor: number) => {
    const c = sceneRef.current?.camera;
    if (!c) return;
    const dir = c.position.clone().normalize();
    const dist = c.position.length();
    const newDist = THREE.MathUtils.clamp(dist * factor, 10, 70);
    c.position.copy(dir.multiplyScalar(newDist));
  }, []);

  const doNHEJ = useCallback(() => {
    setRepairMode('nhej');
    setPhase('nhej');
    setPhaseProgress(0);
    setIsPlaying(true);
  }, []);

  const doHDR = useCallback(() => {
    setRepairMode('hdr');
    setPhase('hdr');
    setPhaseProgress(0);
    setIsPlaying(true);
  }, []);

  const phaseInfo = PHASE_INFO[phase];
  const phaseIndex = phase === 'hdr' || phase === 'nhej' ? 4 : PHASE_ORDER.indexOf(phase);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 3D canvas */}
        <div className="lg:col-span-8 relative">
          <GlassCard className="p-0 overflow-hidden">
            <div className="relative h-[420px] sm:h-[500px] w-full bg-[#04060d]">
              <div ref={mountRef} className="absolute inset-0" />

              {webglError && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <p className="text-sm text-[#ffb020] max-w-md">{webglError}</p>
                </div>
              )}

              {loading && !webglError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#04060d]">
                  <div className="w-10 h-10 rounded-full border-2 border-[#22d3ee]/30 border-t-[#22d3ee] animate-spin" />
                  <span className="text-[11px] font-mono text-[#22d3ee]">Building molecular scene…</span>
                </div>
              )}

              {/* Phase badge */}
              {showLabels && (
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl border border-[#22d3ee]/40 bg-[#050a14]/85 text-[11px] font-mono text-[#22d3ee]">
                  {PHASE_LABELS[phase]} · {Math.round(phaseProgress * 100)}%
                </div>
              )}

              {/* Zoom buttons */}
              <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom in"
                  className="p-2 rounded-xl border border-white/15 bg-[#050a14]/85 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom out"
                  className="p-2 rounded-xl border border-white/15 bg-[#050a14]/85 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button type="button" onClick={restart} aria-label="Restart"
                  className="p-2 rounded-xl border border-white/15 bg-[#050a14]/85 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Legend */}
              {showLabels && (
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 text-[10px] font-mono">
                  {[
                    { c: '#ffc247', l: 'DNA backbone' },
                    { c: '#34e0ff', l: 'Phosphate' },
                    { c: '#ff5d8f', l: 'A' },
                    { c: '#ffb020', l: 'T' },
                    { c: '#3ddc84', l: 'G' },
                    { c: '#4cc9ff', l: 'C' },
                    { c: '#c084fc', l: 'Guide RNA' },
                    { c: '#22d3ee', l: 'PAM' },
                  ].map((x) => (
                    <span key={x.l} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-white/10 bg-[#050a14]/80 text-[#c7d8d6]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: x.c }} />
                      {x.l}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Control + info panel */}
        <div className="lg:col-span-4 space-y-4">
          {/* Timeline */}
          <GlassCard className="p-4">
            <div className="text-xs font-mono text-[#22d3ee] mb-2">Simulation Timeline</div>
            <div className="flex items-center gap-1">
              {(['approach', 'binding', 'cutting', 'cut'] as Cas9Phase[]).map((ph, i) => (
                <React.Fragment key={ph}>
                  <div
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      i < phaseIndex ? 'bg-[#22d3ee]' : i === phaseIndex ? 'bg-[#ffc247]' : 'bg-white/10'
                    }`}
                  />
                </React.Fragment>
              ))}
            </div>
            <div className="mt-2 text-[10px] font-mono text-[#8aa4ad]">
              Phase {phaseIndex + 1} of 5 · {PHASE_LABELS[phase]}
            </div>
          </GlassCard>

          {/* Playback controls */}
          <GlassCard className="p-4 space-y-2.5">
            <div className="flex gap-2">
              <button type="button" onClick={togglePlay}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold gw-btn-lime cursor-pointer">
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" onClick={stepForward}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer">
                <SkipForward className="w-3.5 h-3.5" /> Step
              </button>
            </div>
            <button type="button" onClick={startSim}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#22d3ee]/40 bg-[#22d3ee]/10 text-[#22d3ee] hover:bg-[#22d3ee]/20 cursor-pointer">
              <Sparkles className="w-3.5 h-3.5" /> Start Simulation
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              {[
                { label: 'Labels', val: showLabels, set: setShowLabels, icon: showLabels ? Eye : EyeOff },
                { label: 'Guide RNA', val: showGuide, set: setShowGuide, icon: showGuide ? Eye : EyeOff },
                { label: 'Cas9', val: showCas9, set: setShowCas9, icon: showCas9 ? Eye : EyeOff },
                { label: 'DNA bases', val: showBases, set: setShowBases, icon: showBases ? Eye : EyeOff },
              ].map((t) => (
                <button key={t.label} type="button" onClick={() => t.set((v) => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border cursor-pointer ${
                    t.val ? 'border-[#22d3ee]/45 bg-[#22d3ee]/12 text-[#22d3ee]' : 'border-white/15 bg-white/5 text-[#8aa4ad]'
                  }`}>
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button type="button" onClick={doNHEJ}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#ffb020]/45 bg-[#ffb020]/10 text-[#ffb020] hover:bg-[#ffb020]/20 cursor-pointer">
                <Wrench className="w-3.5 h-3.5" /> NHEJ
              </button>
              <button type="button" onClick={doHDR}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#3ddc84]/45 bg-[#3ddc84]/10 text-[#3ddc84] hover:bg-[#3ddc84]/20 cursor-pointer">
                <Dna className="w-3.5 h-3.5" /> HDR
              </button>
            </div>
          </GlassCard>

          {/* Visualization mode selector */}
          <GlassCard className="p-4 space-y-2">
            <div className="text-xs font-mono text-[#22d3ee]">Molecular Visualization Mode</div>
            <div className="grid grid-cols-3 gap-1.5">
              {VIZ_MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => setVizMode(m.id)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer ${
                    vizMode === m.id
                      ? 'border-[#c6ff3d] bg-[#c6ff3d] text-[#050a14] font-semibold'
                      : 'border-white/15 bg-white/5 text-[#8aa4ad] hover:text-[#e8f3f1]'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono">
              {CAS9_DOMAINS.slice(0, 6).map((d) => (
                <span key={d.key} className="inline-flex items-center gap-1 text-[#8aa4ad]">
                  <span className="w-2 h-2 rounded-full" style={{ background: `#${d.color.toString(16).padStart(6, '0')}` }} />
                  {d.label}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* PDB references */}
          <GlassCard className="p-4 space-y-2">
            <div className="text-xs font-mono text-[#22d3ee]">Validated Molecular References (PDB)</div>
            <div className="space-y-1.5">
              {PDB_REFERENCES.map((r) => (
                <div key={r.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-[#22d3ee]/15 text-[#22d3ee] font-mono text-[10px] font-semibold">{r.id}</span>
                    <span className="text-[10px] text-[#e8f3f1] truncate">{r.title}</span>
                  </div>
                  <div className="text-[9px] text-[#8aa4ad] mt-0.5">{r.journal} · {r.note}</div>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-[#ffb020] leading-relaxed pt-1 border-t border-white/10">
              3D geometry is procedural &amp; illustrative — inspired by these structures, not the deposited coordinates.
            </p>
          </GlassCard>

          {/* Scientific info */}
          <GlassCard className="p-4 space-y-2">
            <div className="text-xs font-mono text-[#22d3ee]">Phase Explanation</div>
            <div className="font-display text-sm font-semibold text-[#e8f3f1]">{phaseInfo.title}</div>
            <div className="text-[11px] text-[#8aa4ad]">
              <span className="text-[#c7d8d6] font-medium">Component:</span> {phaseInfo.component}
            </div>
            <div className="text-[11px] text-[#c7d8d6] leading-relaxed">
              <span className="text-[#22d3ee] font-medium">What:</span> {phaseInfo.what}
            </div>
            <div className="text-[11px] text-[#c7d8d6] leading-relaxed">
              <span className="text-[#ffc247] font-medium">Why:</span> {phaseInfo.why}
            </div>
            <div className="text-[11px] text-[#c7d8d6] leading-relaxed">
              <span className="text-[#3ddc84] font-medium">Result:</span> {phaseInfo.result}
            </div>
            <p className="pt-2 border-t border-white/10 text-[10px] text-[#ffb020] leading-relaxed">
              Educational simulation only. Molecular geometry is procedural and illustrative — not experimentally validated. Not a laboratory or clinical protocol.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};