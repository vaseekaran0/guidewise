import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  ChevronDown,
  ChevronUp,
  CloudFog,
  Dna,
  Eye,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SiteMatch } from '../types/crispr.js';

export type HelixViewMode = 'dna' | 'rna' | 'compare';

interface DnaHelixViewportProps {
  dna: string;
  sites: SiteMatch[];
  selectedSiteIndex: number | null;
  onSelectSite?: (index: number) => void;
  mode?: 'hero' | 'simulator';
  initialViewMode?: HelixViewMode;
  scrollRotation?: number;
  reducedMotion?: boolean;
  onToggleReducedMotion?: () => void;
  autoPlay?: boolean;
  className?: string;
}

const BASE_COLORS: Record<string, number> = {
  A: 0xff5d8f,
  T: 0xffb020,
  G: 0x3ddc84,
  C: 0x4cc9ff,
  U: 0xc084fc,
};

const COMPLEMENT: Record<string, string> = {
  A: 'T',
  T: 'A',
  G: 'C',
  C: 'G',
};

const CATEGORY_COLORS = {
  'on-target': 0x3ddc84,
  'near-match': 0xffb020,
  'high-mismatch': 0xff4d6d,
  'no-pam': 0x8aa4ad,
  pam: 0x7c5cff,
  mismatchBase: 0xff2a55,
};

// Reusable math objects outside animation loop (zero per-frame GC)
const _vA = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();

interface BpNode {
  bpIndex1: number;
  baseFwd: string;
  baseRev: string;
  y: number;
  angle: number;
  group: THREE.Group;
  fwdSide: THREE.Group;
  revSide: THREE.Group;
  rungMesh: THREE.Group;
  ringMarker: THREE.Mesh;
  isMismatchNode: boolean;
  fwdBaseMesh: THREE.Mesh;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createProceduralGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(34,211,238,0.65)');
    grad.addColorStop(1, 'rgba(5,10,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function disposeObject3DTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => materials.add(m));
      } else {
        materials.add(mesh.material);
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

interface EnergyTrailOptions {
  color: number;
  phase: number;
  radius: number;
  turns: number;
  halfHeight: number;
  headLength?: number;
  tailLength?: number;
  segments?: number;
}

/**
 * A curved, tapered additive ribbon that reads as a glowing comet/energy streak
 * flowing along a helical path. The head is bright and wide; the tail fades out.
 */
class EnergyTrail {
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.BufferGeometry;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly headLength: number;
  private readonly tailLength: number;
  private readonly segments: number;
  private readonly total = 1;
  private readonly turns: number;
  private readonly radius: number;
  private readonly halfHeight: number;
  private readonly phase: number;
  private readonly color: THREE.Color;
  private readonly white: THREE.Color;

  constructor(opts: EnergyTrailOptions) {
    this.headLength = opts.headLength ?? 0.16;
    this.tailLength = opts.tailLength ?? 0.55;
    this.segments = opts.segments ?? 120;
    this.turns = opts.turns;
    this.radius = opts.radius;
    this.halfHeight = opts.halfHeight;
    this.phase = opts.phase;
    this.color = new THREE.Color(opts.color);
    this.white = new THREE.Color(0xffffff);

    const vertCount = (this.segments + 1) * 2;
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const indices: number[] = [];
    for (let i = 0; i < this.segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, d, a, d, c);
    }

    this.geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.colAttr = new THREE.BufferAttribute(colors, 3);
    this.geo.setAttribute('position', this.posAttr);
    this.geo.setAttribute('color', this.colAttr);
    this.geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
  }

  /** headT in [0,1] along the helix path; length is fraction of the full path */
  update(headT: number, length: number) {
    const pos = this.posAttr.array as Float32Array;
    const col = this.colAttr.array as Float32Array;
    const headAngle = headT * Math.PI * 2 * this.turns + this.phase;

    for (let s = 0; s <= this.segments; s++) {
      const u = s / this.segments;
      const back = u * length;
      const tRaw = headT - back;
      const wrapped = ((tRaw % 1) + 1) % 1;
      const angle = wrapped * Math.PI * 2 * this.turns + this.phase;
      const y = (wrapped - 0.5) * this.halfHeight * 2;
      const r = this.radius;
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;

      const fade = 1 - u;
      const taper = fade * fade;
      const width = 0.02 + taper * 0.3;
      const dx = Math.cos(angle) * width;
      const dz = Math.sin(angle) * width;

      const idx = s * 6;
      pos[idx] = cx - dx;
      pos[idx + 1] = y;
      pos[idx + 2] = cz - dz;
      pos[idx + 3] = cx + dx;
      pos[idx + 4] = y;
      pos[idx + 5] = cz + dz;

      const headMix = Math.max(0, 1 - u * 2.5);
      const cr = this.color.r + (this.white.r - this.color.r) * headMix * 0.55;
      const cg = this.color.g + (this.white.g - this.color.g) * headMix * 0.55;
      const cb = this.color.b + (this.white.b - this.color.b) * headMix * 0.55;
      const f = fade * fade;

      col[idx] = cr * f;
      col[idx + 1] = cg * f;
      col[idx + 2] = cb * f;
      col[idx + 3] = cr * f;
      col[idx + 4] = cg * f;
      col[idx + 5] = cb * f;
    }

    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    // Keep the (unused but referenced) head angle from tripping tree-shaking hints
    void headAngle;
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export const DnaHelixViewport: React.FC<DnaHelixViewportProps> = ({
  dna,
  sites,
  selectedSiteIndex,
  onSelectSite,
  mode = 'simulator',
  initialViewMode = 'dna',
  scrollRotation = 0,
  reducedMotion: externalReducedMotion,
  onToggleReducedMotion,
  autoPlay = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [internalReducedMotion, setInternalReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const reducedMotion = externalReducedMotion ?? internalReducedMotion;
  const toggleReducedMotion =
    onToggleReducedMotion ?? (() => setInternalReducedMotion((prev) => !prev));

  const [viewMode, setViewMode] = useState<HelixViewMode>(initialViewMode);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay || mode === 'hero');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [fogEnabled, setFogEnabled] = useState<boolean>(true);
  const [ambientIntensity, setAmbientIntensity] = useState<number>(0.46);
  const [particlesEnabled, setParticlesEnabled] = useState<boolean>(true);
  const [fxPanelOpen, setFxPanelOpen] = useState<boolean>(false);
  const [caption, setCaption] = useState<string>(
    mode === 'hero'
      ? 'Holographic Cas9 + guide RNA scanning synthetic DNA for 3′ PAM anchors.'
      : 'Press Play to watch Cas9 + guide RNA scan the holographic helix and cleave 3 bp before a valid PAM.'
  );
  const [activeScanBp, setActiveScanBp] = useState<number>(1);
  const [activeCallout, setActiveCallout] = useState<{
    siteNumber: number;
    pam: string;
    pamOk: boolean;
    mismatches: number;
    cut: number;
    score: number;
  } | null>(null);

  // Sync initialViewMode prop changes
  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const maxRenderBp = 120;
  const activeSite = selectedSiteIndex !== null ? sites[selectedSiteIndex] ?? null : null;
  let sliceStart1 = 1;
  let sliceEnd1 = dna.length;
  if (dna.length > maxRenderBp) {
    const focusCenter = activeSite ? Math.round((activeSite.start + activeSite.end) / 2) : 60;
    sliceStart1 = Math.max(1, focusCenter - Math.floor(maxRenderBp / 2));
    sliceEnd1 = Math.min(dna.length, sliceStart1 + maxRenderBp - 1);
    if (sliceEnd1 - sliceStart1 + 1 < maxRenderBp) {
      sliceStart1 = Math.max(1, sliceEnd1 - maxRenderBp + 1);
    }
  }
  const visibleDna = dna.slice(sliceStart1 - 1, sliceEnd1);

  const simStateRef = useRef({
    isPlaying,
    reducedMotion,
    speedMultiplier,
    viewMode,
    scrollRotation,
    sites,
    selectedSiteIndex,
    sliceStart1,
    sliceEnd1,
    visibleLength: visibleDna.length,
    scanProgress: 0,
    dwellTimer: 0,
    cutAnim: 0, // 0..1 separation -> rejoin wave
    cutCycleTime: 0,
    userInteracting: false,
    cameraFollow: mode === 'simulator',
    mode,
    mouseX: 0,
    mouseY: 0,
    isPageVisible: true,
    isInViewport: true,
    lastCaption: '',
    lastBpReported: 1,
    lastCalloutKey: '',
    resetCameraRequested: false,
    introCamProgress: 0,
    fogEnabled,
    ambientIntensity,
    particlesEnabled,
  });

  simStateRef.current.isPlaying = isPlaying;
  simStateRef.current.reducedMotion = reducedMotion;
  simStateRef.current.speedMultiplier = speedMultiplier;
  simStateRef.current.viewMode = viewMode;
  simStateRef.current.scrollRotation = scrollRotation;
  simStateRef.current.sites = sites;
  simStateRef.current.selectedSiteIndex = selectedSiteIndex;
  simStateRef.current.sliceStart1 = sliceStart1;
  simStateRef.current.sliceEnd1 = sliceEnd1;
  simStateRef.current.visibleLength = visibleDna.length;
  simStateRef.current.mode = mode;
  simStateRef.current.fogEnabled = fogEnabled;
  simStateRef.current.ambientIntensity = ambientIntensity;
  simStateRef.current.particlesEnabled = particlesEnabled;

  // Jump scanner smoothly when user clicks a site row
  useEffect(() => {
    if (selectedSiteIndex === null) return;
    const site = sites[selectedSiteIndex];
    if (!site) return;
    const centerBp = (site.start + site.end) / 2;
    const denom = Math.max(1, simStateRef.current.visibleLength - 1);
    const norm = THREE.MathUtils.clamp((centerBp - simStateRef.current.sliceStart1) / denom, 0, 1);
    simStateRef.current.scanProgress = norm;
    simStateRef.current.dwellTimer = site.pamOk && site.mismatches <= 2 ? 2.4 : 0.9;
    simStateRef.current.cutCycleTime = 0;
    simStateRef.current.cameraFollow = true;
  }, [selectedSiteIndex, sites]);

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    helixRoot: THREE.Group;
    rnaCompareGroup: THREE.Group;
    bpNodes: BpNode[];
    cas9Group: THREE.Group;
    cas9RecMesh: THREE.Mesh;
    cas9NucMesh: THREE.Mesh;
    cas9PamMesh: THREE.Mesh;
    cas9RnaMesh: THREE.Mesh;
    hudRingOuter: THREE.Mesh;
    hudRingTicks: THREE.LineSegments;
    cutSparkPoints: THREE.Points;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    helixStepY: number;
    helixHalfHeight: number;
    isSoftwareGl: boolean;
    shellParticles: THREE.Points;
    trailGold: EnergyTrail;
    trailCyan: EnergyTrail;
    trailGold2: EnergyTrail;
    trailGroup: THREE.Group;
  } | null>(null);

  // Initialize Three.js WebGLRenderer, Composer, Atmosphere, and Loop
  useEffect(() => {
    const container = mountRef.current;
    const outerContainer = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL is unavailable in this browser context. Use the 2D sequence alignment and map views.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = mode === 'hero' ? 1.0 : 0.92;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 260);
    renderer.setSize(width, height, false);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('3D WebGL context was interrupted. Showing friendly 2D fallback.');
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060d);
    const sceneFog = new THREE.FogExp2(0x04060d, mode === 'hero' ? 0.019 : 0.014);
    scene.fog = simStateRef.current.fogEnabled ? sceneFog : null;

    // Procedural Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 240);
    if (mode === 'hero') {
      // Start dolly further out; eases in over the first ~2.5s for a cinematic reveal
      camera.position.set(20, 6.5, 28);
    } else {
      camera.position.set(16, 3.5, 21);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 7;
    controls.maxDistance = 68;
    controls.enablePan = true;
    controls.enableZoom = mode !== 'hero';
    controls.addEventListener('start', () => {
      simStateRef.current.userInteracting = true;
      simStateRef.current.cameraFollow = false;
    });
    controls.addEventListener('end', () => {
      simStateRef.current.userInteracting = false;
    });

    // Post-processing UnrealBloomPass on GPU (balanced subtle halo, low glare)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        mode === 'hero' ? 0.28 : 0.18,
        0.5,
        0.82
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // Cinematic Dual-Tone Studio Lighting: warm golden key + electric cyan rim
    const hemiLight = new THREE.HemisphereLight(0x2a3a5a, 0x04060d, 0.40);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffd98a, 0.85);
    keyLight.position.set(16, 22, 18);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.0);
    rimLight.position.set(-18, -6, -16);
    scene.add(rimLight);

    const goldAccent = new THREE.PointLight(0xffb347, 0.55, 60, 1.4);
    goldAccent.position.set(0, 6, 16);
    scene.add(goldAccent);

    const violetAccent = new THREE.PointLight(0x7c5cff, 0.55, 48, 1.4);
    violetAccent.position.set(0, -8, 12);
    scene.add(violetAccent);

    // 1. Atmosphere: dense drifting golden/cyan volumetric dust (adaptive count)
    const particleTex = createProceduralGlowTexture();
    const particleCount = isSoftwareGl ? 700 : 1400;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const cGold = new THREE.Color(0xffb347);
    const cWarmWhite = new THREE.Color(0xffe6a8);
    const cCyan = new THREE.Color(0x22d3ee);
    const cViolet = new THREE.Color(0x7c5cff);
    const dustPalette = [cGold, cGold, cWarmWhite, cCyan, cCyan, cViolet];

    for (let i = 0; i < particleCount; i++) {
      // Distribute in a wide slab with a soft central density bias for depth
      const rx = (Math.random() - 0.5) * 66;
      const ry = (Math.random() - 0.5) * 48;
      const rz = (Math.random() - 0.5) * 52 - 6;
      pPositions[i * 3] = rx;
      pPositions[i * 3 + 1] = ry;
      pPositions[i * 3 + 2] = rz;
      const col = dustPalette[i % dustPalette.length];
      pColors[i * 3] = col.r;
      pColors[i * 3 + 1] = col.g;
      pColors[i * 3 + 2] = col.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.42,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustPoints = new THREE.Points(particleGeo, particleMat);
    scene.add(dustPoints);

    // 1b. Organic helical particle shell hugging the DNA strands (golden energy corona)
    const shellCount = isSoftwareGl ? 1600 : 3600;
    const shellPos = new Float32Array(shellCount * 3);
    const shellColor = new Float32Array(shellCount * 3);
    for (let i = 0; i < shellCount; i++) {
      const t = i / shellCount;
      const strand = i % 2 === 0 ? 1 : -1;
      const angle = t * Math.PI * 2 * 8 + (strand > 0 ? 0 : Math.PI);
      const shellR = 2.35 + Math.random() * 1.5;
      shellPos[i * 3] = Math.cos(angle) * shellR;
      shellPos[i * 3 + 1] = (t - 0.5) * 22 + (Math.random() - 0.5) * 0.6;
      shellPos[i * 3 + 2] = Math.sin(angle) * shellR;
      const col = i % 3 === 0 ? cCyan : i % 3 === 1 ? cGold : cWarmWhite;
      shellColor[i * 3] = col.r;
      shellColor[i * 3 + 1] = col.g;
      shellColor[i * 3 + 2] = col.b;
    }
    const shellGeo = new THREE.BufferGeometry();
    shellGeo.setAttribute('position', new THREE.BufferAttribute(shellPos, 3));
    shellGeo.setAttribute('color', new THREE.BufferAttribute(shellColor, 3));
    const shellMat = new THREE.PointsMaterial({
      size: 0.16,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shellParticles = new THREE.Points(shellGeo, shellMat);
    scene.add(shellParticles);

    // 2. Atmosphere: Floating Procedural Ball-and-Stick Molecules in Background
    const floatingMolecules = new THREE.Group();
    const molSphereGeo = new THREE.SphereGeometry(0.24, 12, 10);
    const molBondGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.72, 8);
    const molMatA = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x0e4a5e,
      roughness: 0.2,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.7,
    });
    const molMatB = new THREE.MeshPhysicalMaterial({
      color: 0xc084fc,
      emissive: 0x3b1f6e,
      roughness: 0.25,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.7,
    });

    const molCoords = [
      [-15, 7, -10],
      [14, -7, -12],
      [-12, -8, -8],
      [16, 8, -14],
    ];
    for (const [mx, my, mz] of molCoords) {
      const cluster = new THREE.Group();
      const center = new THREE.Mesh(molSphereGeo, molMatA);
      const sat1 = new THREE.Mesh(molSphereGeo, molMatB);
      sat1.position.set(0.65, 0.35, 0);
      const sat2 = new THREE.Mesh(molSphereGeo, molMatB);
      sat2.position.set(-0.55, -0.45, 0.25);
      const bond1 = new THREE.Mesh(molBondGeo, molMatA);
      bond1.position.set(0.32, 0.17, 0);
      bond1.rotation.z = -1.05;
      const bond2 = new THREE.Mesh(molBondGeo, molMatA);
      bond2.position.set(-0.27, -0.22, 0.12);
      bond2.rotation.z = -0.9;
      cluster.add(center, sat1, sat2, bond1, bond2);
      cluster.position.set(mx, my, mz);
      floatingMolecules.add(cluster);
    }
    scene.add(floatingMolecules);

    // 3. Primary Helix Root & Side-by-Side RNA Compare Group
    const helixRoot = new THREE.Group();
    if (mode === 'hero') {
      helixRoot.rotation.z = -Math.PI / 3.4;
      helixRoot.rotation.x = 0.18;
    } else {
      helixRoot.rotation.z = -Math.PI / 2.25;
      helixRoot.rotation.x = 0.12;
    }
    scene.add(helixRoot);

    const rnaCompareGroup = new THREE.Group();
    rnaCompareGroup.rotation.copy(helixRoot.rotation);
    rnaCompareGroup.visible = false;
    scene.add(rnaCompareGroup);

    // 5. Dynamic golden + cyan energy-trail ribbons flowing along the double helix
    const trailGroup = new THREE.Group();
    const TRAIL_RADIUS = 2.02;
    const TRAIL_TURNS = 10.5;
    const trailHalfH = 11;
    const trailGold = new EnergyTrail({
      color: 0xffc247,
      phase: 0,
      radius: TRAIL_RADIUS,
      turns: TRAIL_TURNS,
      halfHeight: trailHalfH,
      headLength: 0.14,
      tailLength: 0.5,
      segments: 140,
    });
    const trailCyan = new EnergyTrail({
      color: 0x34e0ff,
      phase: Math.PI,
      radius: TRAIL_RADIUS,
      turns: TRAIL_TURNS,
      halfHeight: trailHalfH,
      headLength: 0.12,
      tailLength: 0.46,
      segments: 140,
    });
    const trailGold2 = new EnergyTrail({
      color: 0xfff0c0,
      phase: Math.PI * 0.5,
      radius: TRAIL_RADIUS * 1.14,
      turns: TRAIL_TURNS,
      halfHeight: trailHalfH,
      headLength: 0.08,
      tailLength: 0.32,
      segments: 120,
    });
    trailGroup.add(trailGold.mesh, trailCyan.mesh, trailGold2.mesh);
    helixRoot.add(trailGroup);

    // 4. Glassy Translucent Cas9 + Guide RNA Complex + Holographic HUD Rings + Cut Sparks
    const cas9Group = new THREE.Group();
    const cas9BubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x0b3b4e,
      emissiveIntensity: 0.12,
      roughness: 0.22,
      metalness: 0.05,
      transparent: true,
      opacity: isSoftwareGl ? 0.24 : 0.20,
      transmission: isSoftwareGl ? 0 : 0.48,
      thickness: 1.5,
      ior: 1.42,
      clearcoat: 0.75,
      depthWrite: false,
    });

    const cas9NucMat = new THREE.MeshPhysicalMaterial({
      color: 0x4cc9ff,
      emissive: 0x0b253a,
      emissiveIntensity: 0.10,
      roughness: 0.28,
      transparent: true,
      opacity: 0.22,
      clearcoat: 0.65,
      depthWrite: false,
    });

    const cas9PamMat = new THREE.MeshPhysicalMaterial({
      color: 0x7c5cff,
      emissive: 0x4b24cc,
      emissiveIntensity: 0.14,
      roughness: 0.24,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    const cas9RecMesh = new THREE.Mesh(new THREE.SphereGeometry(3.35, 28, 22), cas9BubbleMat);
    cas9RecMesh.scale.set(1.06, 1.45, 0.94);
    cas9RecMesh.position.set(0.35, 0.35, 0);
    cas9RecMesh.renderOrder = 4;
    cas9Group.add(cas9RecMesh);

    const cas9NucMesh = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 20), cas9NucMat);
    cas9NucMesh.position.set(-0.5, -0.75, 0.2);
    cas9NucMesh.renderOrder = 4;
    cas9Group.add(cas9NucMesh);

    const cas9PamMesh = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.22, 14, 44), cas9PamMat);
    cas9PamMesh.rotation.x = Math.PI / 2;
    cas9PamMesh.position.set(0, 2.55, 0);
    cas9PamMesh.renderOrder = 5;
    cas9Group.add(cas9PamMesh);

    // Guide RNA single strand pairing ribbon inside Cas9
    const rnaCurvePts: THREE.Vector3[] = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24;
      const ang = t * Math.PI * 2.2;
      rnaCurvePts.push(new THREE.Vector3(Math.cos(ang) * 1.05, (t - 0.5) * 4.4, Math.sin(ang) * 1.05));
    }
    const cas9RnaMesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rnaCurvePts), 36, 0.13, 10, false),
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0xc084fc,
        emissiveIntensity: 0.16,
        roughness: 0.28,
      })
    );
    cas9Group.add(cas9RnaMesh);

    // Thin Holographic HUD Ring + Ticks around active site
    const hudRingOuter = new THREE.Mesh(
      new THREE.TorusGeometry(3.65, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    hudRingOuter.rotation.x = Math.PI / 2;
    cas9Group.add(hudRingOuter);

    const tickPositions: number[] = [];
    const tickCount = 32;
    for (let i = 0; i < tickCount; i++) {
      const a = (i / tickCount) * Math.PI * 2;
      const rIn = i % 4 === 0 ? 3.25 : 3.45;
      const rOut = 3.65;
      tickPositions.push(Math.cos(a) * rIn, 0, Math.sin(a) * rIn);
      tickPositions.push(Math.cos(a) * rOut, 0, Math.sin(a) * rOut);
    }
    const tickGeo = new THREE.BufferGeometry();
    tickGeo.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
    const hudRingTicks = new THREE.LineSegments(
      tickGeo,
      new THREE.LineBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.55,
      })
    );
    cas9Group.add(hudRingTicks);

    // Cut Spark Particles (burst when cleaving)
    const sparkCount = 42;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const cutSparkPoints = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        size: 0.36,
        color: 0xc6ff3d,
        map: particleTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    cutSparkPoints.position.set(0, 0.7, 0);
    cas9Group.add(cutSparkPoints);

    helixRoot.add(cas9Group);

    sceneObjectsRef.current = {
      scene,
      helixRoot,
      rnaCompareGroup,
      bpNodes: [],
      cas9Group,
      cas9RecMesh,
      cas9NucMesh,
      cas9PamMesh,
      cas9RnaMesh,
      hudRingOuter,
      hudRingTicks,
      cutSparkPoints,
      camera,
      controls,
      helixStepY: 0.56,
      helixHalfHeight: 10,
      isSoftwareGl,
      shellParticles,
      trailGold,
      trailCyan,
      trailGold2,
      trailGroup,
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Mouse Parallax Listener
    const handlePointerMove = (e: PointerEvent) => {
      if (!outerContainer) return;
      const rect = outerContainer.getBoundingClientRect();
      simStateRef.current.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      simStateRef.current.mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    outerContainer?.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Visibility & Offscreen Pause Listeners
    const handleVisibility = () => {
      simStateRef.current.isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let intersectionObs: IntersectionObserver | null = null;
    if (outerContainer && typeof IntersectionObserver !== 'undefined') {
      intersectionObs = new IntersectionObserver(
        (entries) => {
          if (entries[0]) {
            simStateRef.current.isInViewport = entries[0].isIntersecting;
          }
        },
        { threshold: 0.05 }
      );
      intersectionObs.observe(outerContainer);
    }

    // Resize Observer (deferred via rAF + updateStyle=false to avoid ResizeObserver loops)
    let resizeRafId = 0;
    let lastObservedW = width;
    let lastObservedH = height;
    const applyResize = () => {
      resizeRafId = 0;
      if (!container) return;
      const w = Math.max(container.clientWidth, 280);
      const h = Math.max(container.clientHeight, 220);
      if (w === lastObservedW && h === lastObservedH) return;
      lastObservedW = w;
      lastObservedH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      bloomPass?.setSize(w, h);
    };
    const handleResize = () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(applyResize);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick(now: number) {
      if (disposed) return;
      const st = simStateRef.current;

      // Pause rendering work when tab is hidden or canvas is offscreen
      if (!st.isPageVisible || !st.isInViewport) {
        lastTime = now;
        if (isSoftwareGl) {
          frameId = window.setTimeout(() => tick(performance.now()), 250);
        } else {
          frameId = requestAnimationFrame(tick);
        }
        return;
      }

      const dt = Math.min(0.08, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Sync live cinematic atmosphere settings (fog, ambient light, particles)
      scene.fog = st.fogEnabled ? sceneFog : null;
      hemiLight.intensity = st.ambientIntensity;
      dustPoints.visible = st.particlesEnabled;
      shellParticles.visible = st.particlesEnabled;
      floatingMolecules.visible = st.particlesEnabled;
      trailGroup.visible = st.particlesEnabled;

      const objs = sceneObjectsRef.current;
      if (objs && objs.bpNodes.length > 0) {
        const bpCount = objs.bpNodes.length;
        const halfH = objs.helixHalfHeight;

        if (st.resetCameraRequested) {
          st.resetCameraRequested = false;
          st.cameraFollow = st.mode === 'simulator';
          _targetCamPos.set(st.mode === 'hero' ? 14 : 16, 3.5, st.mode === 'hero' ? 19 : 21);
          camera.position.copy(_targetCamPos);
          controls.target.set(0, 0, 0);
          controls.update();
        }

        // Cinematic hero camera dolly intro (eases from wide to framing position)
        if (st.mode === 'hero' && st.introCamProgress < 1 && !st.userInteracting) {
          st.introCamProgress = Math.min(1, st.introCamProgress + dt * 0.4);
          const e = 1 - Math.pow(1 - st.introCamProgress, 3);
          _targetCamPos.set(
            THREE.MathUtils.lerp(20, 14, e),
            THREE.MathUtils.lerp(6.5, 3.5, e),
            THREE.MathUtils.lerp(28, 19, e)
          );
          camera.position.lerp(_targetCamPos, 0.08 + e * 0.12);
        }

        // Toggle Compare Layout (DNA left, RNA right)
        if (st.viewMode === 'compare') {
          objs.helixRoot.position.x = -5.4;
          objs.rnaCompareGroup.position.x = 5.4;
          objs.rnaCompareGroup.visible = true;
          objs.cas9Group.visible = false;
        } else {
          objs.helixRoot.position.x = 0;
          objs.rnaCompareGroup.visible = false;
          objs.cas9Group.visible = st.viewMode === 'dna';
        }

        // Advance scanning
        if (st.isPlaying && st.viewMode === 'dna') {
          if (st.dwellTimer > 0) {
            st.dwellTimer = Math.max(0, st.dwellTimer - dt * st.speedMultiplier);
          } else {
            const scanRate = (st.mode === 'hero' ? 0.085 : 0.11) * st.speedMultiplier;
            st.scanProgress += dt * scanRate * (st.reducedMotion ? 0.35 : 1);
            if (st.scanProgress > 1) st.scanProgress = 0;
          }
        }

        const currentIdx = Math.min(
          bpCount - 1,
          Math.max(0, Math.round(st.scanProgress * Math.max(1, bpCount - 1)))
        );
        const currentBp1 = objs.bpNodes[currentIdx].bpIndex1;

        if (currentBp1 !== st.lastBpReported) {
          st.lastBpReported = currentBp1;
          setActiveScanBp(currentBp1);
        }

        // Locate active site near scanner
        let activeFocusSite: SiteMatch | null = null;
        let activeFocusIdx = -1;
        if (st.selectedSiteIndex !== null && st.sites[st.selectedSiteIndex]) {
          const sel = st.sites[st.selectedSiteIndex];
          const center = (sel.start + sel.end) / 2;
          if (Math.abs(currentBp1 - center) <= 12) {
            activeFocusSite = sel;
            activeFocusIdx = st.selectedSiteIndex;
          }
        }
        if (!activeFocusSite) {
          for (let si = 0; si < st.sites.length; si++) {
            const s = st.sites[si];
            if (currentBp1 >= s.start && currentBp1 <= s.end) {
              activeFocusSite = s;
              activeFocusIdx = si;
              break;
            }
          }
        }

        // Update HUD callout badge
        const calloutKey = activeFocusSite
          ? `${activeFocusIdx}:${activeFocusSite.pam}:${activeFocusSite.mismatches}`
          : 'none';
        if (calloutKey !== st.lastCalloutKey) {
          st.lastCalloutKey = calloutKey;
          if (activeFocusSite) {
            setActiveCallout({
              siteNumber: activeFocusIdx + 1,
              pam: activeFocusSite.pam,
              pamOk: activeFocusSite.pamOk,
              mismatches: activeFocusSite.mismatches,
              cut: activeFocusSite.cut,
              score: activeFocusSite.score,
            });
          } else {
            setActiveCallout(null);
          }
        }

        // DNA separation -> rejoin animation at valid on-target / near-match cut site
        const shouldCleave =
          st.viewMode === 'dna' &&
          Boolean(activeFocusSite && activeFocusSite.pamOk && activeFocusSite.mismatches <= 2) &&
          (st.dwellTimer > 0 || !st.isPlaying);

        if (shouldCleave) {
          st.cutCycleTime += dt * st.speedMultiplier;
          // Smooth bell curve: separates then rejoins over 2.4s loop
          const wave = Math.sin(Math.min(Math.PI, (st.cutCycleTime % 2.6) * (Math.PI / 2.2)));
          st.cutAnim = st.reducedMotion ? 0.85 : Math.max(0, wave);
        } else {
          st.cutCycleTime = 0;
          st.cutAnim = st.reducedMotion ? 0 : THREE.MathUtils.damp(st.cutAnim, 0, 6.0, dt);
        }

        // Move Cas9 smoothly
        const targetLocalY = (currentIdx / Math.max(1, bpCount - 1) - 0.5) * (halfH * 2);
        objs.cas9Group.position.y = st.reducedMotion
          ? targetLocalY
          : THREE.MathUtils.damp(objs.cas9Group.position.y, targetLocalY, 6.5, dt);

        if (!st.reducedMotion) {
          objs.cas9RnaMesh.rotation.y += dt * 1.3;
          objs.hudRingOuter.rotation.z += dt * 0.65;
          objs.hudRingTicks.rotation.y -= dt * 0.45;
        }

        // Update cut spark burst
        const sparkMat = objs.cutSparkPoints.material as THREE.PointsMaterial;
        if (st.cutAnim > 0.25) {
          sparkMat.opacity = st.cutAnim * 0.9;
          const attr = objs.cutSparkPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
          const arr = attr.array as Float32Array;
          const spread = 1.6 + st.cutAnim * 2.2;
          for (let i = 0; i < sparkCount; i++) {
            const ang = (i / sparkCount) * Math.PI * 2 + st.cutCycleTime * 1.5;
            const r = ((i % 5) / 5) * spread;
            arr[i * 3] = Math.cos(ang) * r;
            arr[i * 3 + 1] = ((i % 3) - 1) * 0.6 * st.cutAnim;
            arr[i * 3 + 2] = Math.sin(ang) * r;
          }
          attr.needsUpdate = true;
        } else {
          sparkMat.opacity = 0;
        }

        // Color Cas9 bubble & set plain-language caption
        let nextCaption =
          st.viewMode === 'rna'
            ? 'Single-strand Guide RNA mode: Uracil (U, violet) replaces Thymine (T).'
            : st.viewMode === 'compare'
            ? 'Side-by-side Holographic Comparison: Double-stranded DNA (left) vs Single-stranded RNA (right).'
            : 'Cas9 + guide RNA scanning the holographic DNA helix...';

        const recMat = objs.cas9RecMesh.material as THREE.MeshPhysicalMaterial;
        const hudMat = objs.hudRingOuter.material as THREE.MeshBasicMaterial;

        if (st.viewMode === 'dna' && activeFocusSite) {
          if (!activeFocusSite.pamOk) {
            recMat.color.setHex(CATEGORY_COLORS['no-pam']);
            hudMat.color.setHex(CATEGORY_COLORS['no-pam']);
            nextCaption = `Site ${activeFocusSite.start}–${activeFocusSite.end}: ${activeFocusSite.mismatches} MM, PAM "${activeFocusSite.pam}" invalid (score 0.0). Cas9 skips cleavage.`;
          } else if (activeFocusSite.mismatches === 0) {
            recMat.color.setHex(CATEGORY_COLORS['on-target']);
            hudMat.color.setHex(0xc6ff3d);
            nextCaption = `Cas9 cuts 3 bp before the PAM (${activeFocusSite.pam}) at bp ${activeFocusSite.cut} · Score 100.0 (Educational Estimate).`;
          } else if (activeFocusSite.mismatches <= 2) {
            recMat.color.setHex(CATEGORY_COLORS['near-match']);
            hudMat.color.setHex(CATEGORY_COLORS['near-match']);
            nextCaption = `Off-target candidate (${activeFocusSite.mismatches} MM at pos ${activeFocusSite.mismatchPositions.join(', ')}), PAM ${activeFocusSite.pam} · Score ${activeFocusSite.score.toFixed(1)}.`;
          } else {
            recMat.color.setHex(CATEGORY_COLORS['high-mismatch']);
            hudMat.color.setHex(CATEGORY_COLORS['high-mismatch']);
            nextCaption = `High-mismatch region (${activeFocusSite.mismatches} MM) destabilizes guide RNA pairing (score ${activeFocusSite.score.toFixed(1)}).`;
          }
        } else if (st.viewMode === 'dna') {
          recMat.color.setHex(0x22d3ee);
          hudMat.color.setHex(0x22d3ee);
        }

        if (nextCaption !== st.lastCaption) {
          st.lastCaption = nextCaption;
          setCaption(nextCaption);
        }

        // Flash mismatched bases red & separate cut site strands
        const pulse = 0.65 + 0.55 * Math.sin(now * 0.008);
        const cutBp = activeFocusSite && activeFocusSite.pamOk ? activeFocusSite.cut : -999;

        for (const node of objs.bpNodes) {
          const distFromCut = Math.abs(node.bpIndex1 - cutBp);
          const sep =
            distFromCut <= 4 && st.cutAnim > 0.01
              ? st.cutAnim * (1 - distFromCut / 5) * 1.05
              : 0;
          node.fwdSide.position.x = -sep;
          node.revSide.position.x = sep;
          node.rungMesh.scale.x = Math.max(0.08, 1 - sep * 0.65);
          node.rungMesh.visible = sep < 0.72;

          if (node.isMismatchNode && !st.reducedMotion) {
            const mat = node.fwdBaseMesh.material as THREE.MeshPhysicalMaterial;
            mat.emissiveIntensity = 0.12 + pulse * 0.16;
          }
        }

        // Idle rotation + Scroll-linked rotation + Mouse parallax
        if (!st.reducedMotion) {
          const baseSpin = st.mode === 'hero' ? 0.18 : 0.12;
          objs.helixRoot.rotation.y += dt * baseSpin;
          objs.rnaCompareGroup.rotation.y = objs.helixRoot.rotation.y;
          if (st.mode === 'hero') {
            objs.helixRoot.rotation.x = 0.18 + st.scrollRotation * 0.7 + st.mouseY * 0.08;
            objs.helixRoot.rotation.z = -Math.PI / 3.4 + st.mouseX * 0.08;
          }
          dustPoints.rotation.y += dt * 0.02;
          shellParticles.rotation.y += dt * (st.mode === 'hero' ? 0.22 : 0.12);
          // Dynamic golden + cyan energy ribbons flowing along both backbones
          const t = now * 0.001;
          objs.trailGold.update((t * 0.11) % 1, 0.42);
          objs.trailCyan.update((t * 0.09 + 0.5) % 1, 0.38);
          objs.trailGold2.update((t * 0.14 + 0.25) % 1, 0.3);
          floatingMolecules.children.forEach((child, idx) => {
            child.rotation.x += dt * (0.18 + idx * 0.05);
            child.rotation.y += dt * (0.24 + idx * 0.04);
          });
        }

        // Camera follow on active Cas9 in simulator mode
        if (
          st.cameraFollow &&
          !st.userInteracting &&
          !st.reducedMotion &&
          st.mode === 'simulator' &&
          st.viewMode === 'dna'
        ) {
          _vA.copy(objs.cas9Group.position);
          objs.helixRoot.localToWorld(_vA);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _vA.x, 3.5, dt);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _vA.y, 3.5, dt);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _vA.z, 3.5, dt);
        }
      }

      controls.update();
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed) tick(performance.now());
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      frameId = window.setTimeout(() => tick(performance.now()), 16);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      intersectionObs?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      outerContainer?.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      disposeObject3DTree(scene);
      particleTex.dispose();
      envTex.dispose();
      controls.dispose();
      composer?.dispose();
      renderer.dispose();
      sceneObjectsRef.current = null;
    };
  }, [mode]);

  // Rebuild / update holographic DNA & RNA helices when DNA, sites, or viewMode change
  useEffect(() => {
    const objs = sceneObjectsRef.current;
    if (!objs) return;

    // Cleanly dispose old helix node geometries/materials to prevent memory leaks
    for (const node of objs.bpNodes) {
      objs.helixRoot.remove(node.group);
      disposeObject3DTree(node.group);
    }
    objs.bpNodes = [];

    while (objs.rnaCompareGroup.children.length > 0) {
      const child = objs.rnaCompareGroup.children[0];
      objs.rnaCompareGroup.remove(child);
      disposeObject3DTree(child);
    }

    const bpCount = visibleDna.length;
    const stepY = 0.56;
    const twistPerBp = (Math.PI * 2) / 10.5;
    const radius = 1.95;
    const halfH = ((bpCount - 1) * stepY) / 2;
    objs.helixStepY = stepY;
    objs.helixHalfHeight = halfH;

    const sugarGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const phosphateGeo = new THREE.SphereGeometry(0.19, 14, 12);
    const baseGeo = new THREE.SphereGeometry(0.32, 16, 14);
    const hBondStrutGeo = new THREE.CylinderGeometry(0.038, 0.038, radius * 1.38, 8);
    hBondStrutGeo.rotateZ(Math.PI / 2);
    const singleRnaStubGeo = new THREE.CylinderGeometry(0.065, 0.065, radius * 0.65, 10);
    singleRnaStubGeo.rotateZ(Math.PI / 2);
    const ringGeo = new THREE.TorusGeometry(2.38, 0.04, 8, 32);
    ringGeo.rotateX(Math.PI / 2);

    const backboneHoloMat = new THREE.MeshPhysicalMaterial({
      color: 0xffc247,
      emissive: 0xff9a1f,
      emissiveIntensity: 0.12,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
    });

    const sugarHoloMat = new THREE.MeshPhysicalMaterial({
      color: 0x34e0ff,
      emissive: 0x0e7490,
      emissiveIntensity: 0.16,
      metalness: 0.55,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.96,
    });

    const rnaBackboneMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd98a,
      emissive: 0xff9a1f,
      emissiveIntensity: 0.12,
      metalness: 0.85,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
    });

    // Site annotations
    const bpHighlight = new Map<
      number,
      { siteCategory?: SiteMatch['category']; isPam?: boolean; isMismatch?: boolean }
    >();

    for (const s of sites) {
      for (let p = s.pamStart; p <= s.pamEnd; p++) {
        const prev = bpHighlight.get(p) ?? {};
        bpHighlight.set(p, { ...prev, isPam: s.pamOk, siteCategory: prev.siteCategory ?? s.category });
      }
      for (let p = s.start; p <= s.end; p++) {
        const guideIdx1 = s.strand === '+' ? p - s.start + 1 : s.end - p + 1;
        const isMm = s.mismatchPositions.includes(guideIdx1);
        const prev = bpHighlight.get(p) ?? {};
        const priority = { 'on-target': 4, 'near-match': 3, 'high-mismatch': 2, 'no-pam': 1 };
        const bestCat =
          !prev.siteCategory || priority[s.category] > priority[prev.siteCategory]
            ? s.category
            : prev.siteCategory;
        bpHighlight.set(p, {
          ...prev,
          siteCategory: bestCat,
          isMismatch: prev.isMismatch || isMm,
        });
      }
    }

    const fwdBackbonePts: THREE.Vector3[] = [];
    const revBackbonePts: THREE.Vector3[] = [];
    const rnaPts: THREE.Vector3[] = [];
    const isSingleRnaOnly = viewMode === 'rna';

    for (let i = 0; i < bpCount; i++) {
      const bpIndex1 = sliceStart1 + i;
      const rawBase = visibleDna[i];
      const baseFwd = isSingleRnaOnly && rawBase === 'T' ? 'U' : rawBase;
      const baseRev = COMPLEMENT[rawBase] ?? 'T';
      const y = i * stepY - halfH;
      const angle = i * twistPerBp;

      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = -x1;
      const z2 = -z1;

      fwdBackbonePts.push(new THREE.Vector3(x1, y, z1));
      revBackbonePts.push(new THREE.Vector3(x2, y, z2));
      rnaPts.push(new THREE.Vector3(x1 * 0.9, y, z1 * 0.9));

      const ann = bpHighlight.get(bpIndex1);
      const fwdColor =
        !isSingleRnaOnly && ann?.isMismatch
          ? CATEGORY_COLORS.mismatchBase
          : !isSingleRnaOnly && ann?.isPam
          ? CATEGORY_COLORS.pam
          : BASE_COLORS[baseFwd] ?? 0x22d3ee;

      const revColor = ann?.isPam ? CATEGORY_COLORS.pam : BASE_COLORS[baseRev] ?? 0x4cc9ff;

      const fwdBaseMat = new THREE.MeshPhysicalMaterial({
        color: fwdColor,
        emissive: ann?.isMismatch ? 0xff1e4d : ann?.isPam ? 0x5b35ff : fwdColor,
        emissiveIntensity: ann?.isMismatch ? 0.24 : ann?.isPam ? 0.14 : 0.06,
        roughness: 0.20,
        metalness: 0.08,
        clearcoat: 0.75,
      });

      const revBaseMat = new THREE.MeshPhysicalMaterial({
        color: revColor,
        emissive: ann?.isPam ? 0x5b35ff : revColor,
        emissiveIntensity: ann?.isPam ? 0.12 : 0.05,
        roughness: 0.20,
        metalness: 0.08,
        clearcoat: 0.75,
      });

      const rungColor = ann?.siteCategory ? CATEGORY_COLORS[ann.siteCategory] : 0x5eead4;
      const rungMat = new THREE.MeshStandardMaterial({
        color: rungColor,
        emissive: rungColor,
        emissiveIntensity: ann?.siteCategory ? 0.12 : 0.04,
        roughness: 0.30,
        metalness: 0.22,
      });

      const bpGroup = new THREE.Group();
      bpGroup.position.y = y;

      const fwdSide = new THREE.Group();
      const revSide = new THREE.Group();

      const useSugarBead = i % 2 === 0;
      const fwdBackboneMesh = new THREE.Mesh(
        useSugarBead ? sugarGeo : phosphateGeo,
        isSingleRnaOnly ? rnaBackboneMat : useSugarBead ? sugarHoloMat : backboneHoloMat
      );
      fwdBackboneMesh.position.set(x1, 0, z1);
      fwdSide.add(fwdBackboneMesh);

      const fwdBaseMesh = new THREE.Mesh(baseGeo, fwdBaseMat);
      fwdBaseMesh.position.set(x1 * 0.62, 0, z1 * 0.62);
      fwdSide.add(fwdBaseMesh);

      const revBackboneMesh = new THREE.Mesh(
        useSugarBead ? phosphateGeo : sugarGeo,
        useSugarBead ? backboneHoloMat : sugarHoloMat
      );
      revBackboneMesh.position.set(x2, 0, z2);
      revSide.add(revBackboneMesh);

      const revBaseMesh = new THREE.Mesh(baseGeo, revBaseMat);
      revBaseMesh.position.set(x2 * 0.62, 0, z2 * 0.62);
      revSide.add(revBaseMesh);

      // Clear anatomical H-bond pattern: 3 struts for G-C, 2 struts for A-T
      const rungGroup = new THREE.Group();
      rungGroup.rotation.y = -angle;

      if (isSingleRnaOnly) {
        revSide.visible = false;
        const stubMesh = new THREE.Mesh(singleRnaStubGeo, rungMat);
        stubMesh.position.set(radius * 0.34, 0, 0);
        rungGroup.add(stubMesh);
      } else {
        const isTripleBond = rawBase === 'G' || rawBase === 'C';
        const offsets = isTripleBond ? [-0.085, 0, 0.085] : [-0.06, 0.06];
        for (const zOff of offsets) {
          const bondStrut = new THREE.Mesh(hBondStrutGeo, rungMat);
          bondStrut.position.z = zOff;
          rungGroup.add(bondStrut);
        }
      }

      const ringMat = new THREE.MeshBasicMaterial({
        color: ann?.isPam ? CATEGORY_COLORS.pam : CATEGORY_COLORS[ann?.siteCategory ?? 'on-target'],
        transparent: true,
        opacity: ann?.siteCategory && !isSingleRnaOnly ? 0.28 : 0,
      });
      const ringMarker = new THREE.Mesh(ringGeo, ringMat);
      ringMarker.visible = Boolean(ann?.siteCategory && !isSingleRnaOnly);

      bpGroup.add(fwdSide, revSide, rungGroup, ringMarker);
      objs.helixRoot.add(bpGroup);

      objs.bpNodes.push({
        bpIndex1,
        baseFwd,
        baseRev,
        y,
        angle,
        group: bpGroup,
        fwdSide,
        revSide,
        rungMesh: rungGroup,
        ringMarker,
        isMismatchNode: Boolean(ann?.isMismatch),
        fwdBaseMesh,
      });
    }

    // Continuous holographic backbone tubes
    if (fwdBackbonePts.length > 2 && objs.bpNodes[0]) {
      const fwdTube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fwdBackbonePts), bpCount * 2, 0.13, 10, false),
        isSingleRnaOnly ? rnaBackboneMat : backboneHoloMat
      );
      const ribbonGroup = new THREE.Group();
      ribbonGroup.add(fwdTube);
      if (!isSingleRnaOnly) {
        const revTube = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(revBackbonePts), bpCount * 2, 0.13, 10, false),
          backboneHoloMat
        );
        ribbonGroup.add(revTube);
      }
      ribbonGroup.position.y = -objs.bpNodes[0].y;
      objs.bpNodes[0].group.add(ribbonGroup);
    }

    // Build side-by-side single-strand RNA helix when viewMode === 'compare'
    if (viewMode === 'compare' && rnaPts.length > 2) {
      const rnaTube = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rnaPts), bpCount * 2, 0.14, 10, false),
        rnaBackboneMat
      );
      objs.rnaCompareGroup.add(rnaTube);
      for (let i = 0; i < bpCount; i += 2) {
        const rawBase = visibleDna[i];
        const rnaBase = rawBase === 'T' ? 'U' : rawBase;
        const p = rnaPts[i];
        const bMesh = new THREE.Mesh(
          baseGeo,
          new THREE.MeshPhysicalMaterial({
            color: BASE_COLORS[rnaBase] ?? 0xc084fc,
            emissive: BASE_COLORS[rnaBase] ?? 0xc084fc,
            emissiveIntensity: 0.16,
            roughness: 0.15,
            clearcoat: 1.0,
          })
        );
        bMesh.position.set(p.x * 0.65, p.y, p.z * 0.65);
        objs.rnaCompareGroup.add(bMesh);
      }
    }
  }, [visibleDna, sliceStart1, sites, viewMode]);

  const handleStepSite = () => {
    if (sites.length === 0) return;
    const nextIdx = selectedSiteIndex === null ? 0 : (selectedSiteIndex + 1) % sites.length;
    onSelectSite?.(nextIdx);
  };

  const handleResetCamera = () => {
    simStateRef.current.resetCameraRequested = true;
  };

  if (webglError) {
    return (
      <div
        className={`relative rounded-[20px] border border-white/10 bg-[#070d1c] p-6 flex flex-col items-center justify-center text-center gap-3 ${className}`}
      >
        <Dna className="w-8 h-8 text-[#22d3ee]" aria-hidden="true" />
        <h3 className="font-display text-lg font-semibold text-[#e8f3f1]">
          2D Holographic Fallback Active
        </h3>
        <p className="text-sm text-[#8aa4ad] max-w-md">{webglError}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-[20px] border border-white/10 bg-[#050a14] ${className}`}
    >
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full min-h-[360px]"
        aria-label="Interactive 3D holographic DNA and Cas9 simulation"
      />

      {/* Top HUD Bar: Mode Toggle (DNA | RNA | DNA vs RNA) & Active Site Callout */}
      {mode === 'simulator' && (
        <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-start justify-between gap-2 z-10">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl border border-white/18 bg-[#050a14]/92 shadow-[0_10px_24px_rgba(2,6,18,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] text-xs font-mono text-[#e8f3f1] flex items-center gap-2.5">
              <span>{sliceStart1}–{sliceEnd1} bp</span>
              <span className="text-[#8aa4ad]" aria-hidden="true">·</span>
              <span className="text-[#22d3ee]">bp {activeScanBp}</span>
            </div>

            {/* DNA / RNA / Compare Toggle */}
            <div
              role="group"
              aria-label="3D molecule view mode"
              className="flex items-center rounded-xl border border-white/18 bg-[#050a14]/92 shadow-[0_10px_24px_rgba(2,6,18,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] p-0.5 text-xs"
            >
              {(
                [
                  { id: 'dna', label: 'DNA' },
                  { id: 'rna', label: 'RNA' },
                  { id: 'compare', label: 'DNA vs RNA' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewMode(item.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === item.id
                      ? 'bg-[#c6ff3d] text-[#050a14] font-semibold'
                      : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Scene FX Toggle Button */}
            <button
              type="button"
              onClick={() => setFxPanelOpen((o) => !o)}
              aria-expanded={fxPanelOpen}
              aria-controls="gw-3d-atmosphere-panel"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium shadow-[0_10px_24px_rgba(2,6,18,0.45)] transition-colors cursor-pointer whitespace-nowrap ${
                fxPanelOpen
                  ? 'border-[#22d3ee]/60 bg-[#08172e]/95 text-[#22d3ee]'
                  : 'border-white/18 bg-[#050a14]/92 text-[#c7d8d6] hover:border-[#22d3ee]/50 hover:text-[#e8f3f1]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
              <span>Scene FX</span>
            </button>
          </div>

          {/* Callout Line Card for Active Site */}
          {activeCallout && viewMode === 'dna' && (
            <div className="pointer-events-auto px-3 py-1.5 rounded-xl border border-[#22d3ee]/45 bg-[#050a14]/94 shadow-[0_10px_24px_rgba(2,6,18,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] text-xs font-mono flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#22d3ee]" aria-hidden="true" />
              <span className="text-[#e8f3f1]">Site #{activeCallout.siteNumber}</span>
              <span className="text-[#7c5cff]">PAM {activeCallout.pam}</span>
              <span className={activeCallout.mismatches === 0 ? 'text-[#3ddc84]' : 'text-[#ffb020]'}>
                {activeCallout.mismatches} MM
              </span>
              <span className="text-[#c6ff3d] font-semibold">
                {activeCallout.score.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Floating Cinematic Atmosphere Control Panel */}
      {mode === 'simulator' && (
        <AnimatePresence>
          {fxPanelOpen && (
            <motion.div
              id="gw-3d-atmosphere-panel"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="gw-glass absolute top-14 left-3 z-20 w-64 p-3.5 space-y-3 text-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display font-semibold text-[#e8f3f1] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
                  Cinematic Scene FX
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFogEnabled(true);
                    setAmbientIntensity(0.46);
                    setParticlesEnabled(true);
                  }}
                  className="text-[11px] font-mono text-[#22d3ee] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Scene Fog Toggle */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#c7d8d6]">
                  <CloudFog className="w-3.5 h-3.5 text-[#22d3ee]" aria-hidden="true" />
                  Scene depth fog
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={fogEnabled}
                  onClick={() => setFogEnabled((f) => !f)}
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                    fogEnabled
                      ? 'border-[#3ddc84]/50 bg-[#3ddc84]/20 text-[#3ddc84]'
                      : 'border-white/15 bg-white/5 text-[#8aa4ad]'
                  }`}
                >
                  {fogEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Particle Effects Toggle */}
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#c7d8d6]">
                  <Sparkles className="w-3.5 h-3.5 text-[#c084fc]" aria-hidden="true" />
                  Particle field
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={particlesEnabled}
                  onClick={() => setParticlesEnabled((p) => !p)}
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                    particlesEnabled
                      ? 'border-[#c084fc]/50 bg-[#c084fc]/20 text-[#c084fc]'
                      : 'border-white/15 bg-white/5 text-[#8aa4ad]'
                  }`}
                >
                  {particlesEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Ambient Light Intensity Slider */}
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label htmlFor="gw-ambient-slider" className="flex items-center gap-2 text-[#c7d8d6]">
                    <Sun className="w-3.5 h-3.5 text-[#ffb020]" aria-hidden="true" />
                    Ambient light
                  </label>
                  <span className="font-mono text-[11px] font-semibold text-[#c6ff3d] tabular-nums">
                    {Math.round(ambientIntensity * 100)}%
                  </span>
                </div>
                <input
                  id="gw-ambient-slider"
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.05}
                  value={ambientIntensity}
                  onChange={(e) => setAmbientIntensity(Number(e.target.value))}
                  className="w-full accent-[#22d3ee] cursor-pointer"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Collapsible Bottom Control Dock */}
      {mode === 'simulator' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-3xl z-10 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="mb-1.5 px-3 py-1 rounded-t-xl border border-b-0 border-white/18 bg-[#050a14]/94 text-xs font-medium text-[#8aa4ad] hover:text-[#e8f3f1] flex items-center gap-1.5 cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                Show controls
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                Hide controls
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="w-full rounded-2xl border border-white/18 bg-[#050a14]/94 shadow-[0_16px_38px_rgba(2,6,18,0.6),inset_0_1px_0_rgba(255,255,255,0.14)] px-4 py-3 space-y-2.5">
              <p className="text-xs sm:text-sm text-[#e8f3f1] leading-snug">{caption}</p>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold gw-btn-lime cursor-pointer whitespace-nowrap"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        Play simulation
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleStepSite}
                    disabled={sites.length === 0 || viewMode !== 'dna'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                  >
                    <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
                    Next site
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-white/15 bg-white/5 text-[#e8f3f1] hover:border-[#22d3ee]/50 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    Reset view
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl border border-white/15 bg-white/5 p-0.5 text-xs">
                    {[0.5, 1, 2].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setSpeedMultiplier(spd)}
                        className={`px-2 py-1 rounded-lg font-mono cursor-pointer ${
                          speedMultiplier === spd
                            ? 'bg-white/15 text-[#c6ff3d]'
                            : 'text-[#8aa4ad] hover:text-[#e8f3f1]'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={toggleReducedMotion}
                    aria-pressed={reducedMotion}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer whitespace-nowrap ${
                      reducedMotion
                        ? 'border-[#22d3ee] bg-[#22d3ee]/15 text-[#22d3ee]'
                        : 'border-white/15 bg-white/5 text-[#8aa4ad] hover:text-[#e8f3f1]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    Reduced motion
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
