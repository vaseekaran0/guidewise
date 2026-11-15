import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { HOLO_COLORS, HOLO_MODELS, HoloLanguage, HoloModelId, HoloPartDef } from '../../data/holoParts.js';
import { getHoloModelText, getHoloPartText } from '../../data/holoPartsTamil.js';

export interface HoloSceneProps {
  modelId: HoloModelId;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  explodeFactor: number;
  isolateSelected: boolean;
  xrayMode: boolean;
  compareWithDna: boolean;
  cutAnimPlaying: boolean;
  motionEnabled: boolean;
  language: HoloLanguage;
  resetSignal: number;
  exploredIds: Set<string>;
}

interface PartRuntime {
  def: HoloPartDef;
  group: THREE.Group;
  materials: THREE.ShaderMaterial[];
  basePos: THREE.Vector3;
  explodeDir: THREE.Vector3;
  centerLocal: THREE.Vector3;
  pullFactor: number;
  dragOffset: THREE.Vector3;
  springVel: THREE.Vector3;
  scanY: number;
  scanActive: number;
  glitchAmt: number;
  hoverAmt: number;
  selectAmt: number;
  dimAmt: number;
  labelEl: HTMLDivElement | null;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _camTargetGoal = new THREE.Vector3();
const _camPosGoal = new THREE.Vector3();
const _dragPlane = new THREE.Plane();
const _dragHit = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
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

const ChromaticEdgeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uAmount: { value: 0.0022 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = length(dir);
      vec2 offset = dir * uAmount * dist;
      float r = texture2D(tDiffuse, vUv - offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv + offset).b;
      float vig = smoothstep(0.95, 0.35, dist);
      vec3 col = vec3(r, g, b) * mix(0.84, 1.0, vig);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

function createHoloShaderMaterial(
  baseHex: string,
  secondaryHex: string,
  options: {
    opacity?: number;
    wireframe?: boolean;
    fresnelPower?: number;
    additive?: boolean;
  } = {}
): THREE.ShaderMaterial {
  const isAdditive = options.additive ?? false;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(baseHex) },
      uSecondaryColor: { value: new THREE.Color(secondaryHex) },
      uSelectColor: { value: new THREE.Color(HOLO_COLORS.selected) },
      uSelected: { value: 0 },
      uHovered: { value: 0 },
      uDimmed: { value: 0 },
      uXray: { value: 0 },
      uScanY: { value: 0 },
      uScanActive: { value: 0 },
      uGlitch: { value: 0 },
      uOpacity: { value: options.opacity ?? 0.88 },
      uFresnelPower: { value: options.fresnelPower ?? 2.2 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uGlitch;
      varying vec3 vWorldPos;
      varying vec3 vNormalDir;
      varying vec3 vLocalPos;

      void main() {
        vLocalPos = position;
        vec3 pos = position;
        float glitchWave = sin(pos.y * 18.0 + uTime * 48.0) * cos(pos.z * 11.0 - uTime * 32.0);
        pos.x += glitchWave * uGlitch * 0.22;
        pos.z += glitchWave * uGlitch * 0.14;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalDir = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uSecondaryColor;
      uniform vec3 uSelectColor;
      uniform float uSelected;
      uniform float uHovered;
      uniform float uDimmed;
      uniform float uXray;
      uniform float uScanY;
      uniform float uScanActive;
      uniform float uGlitch;
      uniform float uOpacity;
      uniform float uFresnelPower;

      varying vec3 vWorldPos;
      varying vec3 vNormalDir;
      varying vec3 vLocalPos;

      void main() {
        vec3 n = normalize(vNormalDir);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float ndotv = abs(dot(viewDir, n));
        float fresnel = pow(clamp(1.0 - ndotv, 0.0, 1.0), uFresnelPower);

        // Soft studio key + rim diffuse shading so molecular volumes stay razor-sharp
        vec3 keyDir = normalize(vec3(0.45, 0.85, 0.55));
        float keyDiffuse = 0.54 + 0.44 * max(0.0, dot(n, keyDir));
        float specular = pow(max(0.0, dot(reflect(-keyDir, n), viewDir)), 28.0) * 0.24;

        // Moving horizontal holographic scan lines
        float scanMajor = 0.5 + 0.5 * sin(vWorldPos.y * 14.0 - uTime * 4.0);
        float scanMinor = 0.5 + 0.5 * sin(vWorldPos.y * 54.0 - uTime * 8.5);
        float scanBand = mix(0.90, 1.06, scanMajor * 0.7 + scanMinor * 0.3);

        // Subtle holographic flicker
        float flicker = 0.97 + 0.03 * sin(uTime * 21.0 + vWorldPos.x * 1.8);

        // Vertical scan sweep across newly selected part or model materialization
        float sweepDist = abs(vWorldPos.y - uScanY);
        float sweep = exp(-sweepDist * sweepDist * 3.6) * uScanActive;

        float highlightMix = clamp(max(uSelected, uHovered * 0.85), 0.0, 1.0);
        vec3 col = mix(uBaseColor, uSecondaryColor, clamp(0.14 + fresnel * 0.42, 0.0, 1.0));
        col = mix(col, uSelectColor, highlightMix);
        col = col * keyDiffuse * scanBand * flicker + vec3(specular);

        // Crisp Fresnel holographic edge glow (reduced glare)
        col += mix(uBaseColor, uSelectColor, highlightMix) * fresnel * (0.44 + highlightMix * 0.72);
        col += vec3(0.85, 0.98, 1.0) * sweep * 0.72;
        col += uSelectColor * uGlitch * 0.45;

        float xrayFactor = clamp(max(uDimmed, uXray * 0.78), 0.0, 1.0);
        float coreAlpha = mix(uOpacity, 0.10, xrayFactor);
        float alpha = clamp(coreAlpha + fresnel * mix(0.32, 0.58, highlightMix) + sweep * 0.45, 0.07, 0.98);
        alpha *= mix(1.0, 0.24, uDimmed * (1.0 - highlightMix));

        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: !isAdditive && (options.opacity ?? 0.88) > 0.65,
    side: THREE.DoubleSide,
    blending: isAdditive ? THREE.AdditiveBlending : THREE.NormalBlending,
    wireframe: options.wireframe ?? false,
  });
}

function createSoftParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(34,211,238,0.65)');
  grad.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFloorGridTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.16)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(124, 92, 255, 0.10)';
  ctx.lineWidth = 1;
  for (let i = 32; i < size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, Math.max(1, anisotropy));
  return tex;
}

function createPentagonGeometry(radius = 0.34, depth = 0.11): THREE.ExtrudeGeometry {
  const outer = new THREE.Shape();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) outer.moveTo(x, y);
    else outer.lineTo(x, y);
  }
  outer.closePath();

  const hole = new THREE.Path();
  const innerR = radius * 0.44;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * innerR;
    const y = Math.sin(a) * innerR;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  outer.holes.push(hole);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createBaseRingGeometry(isPurine: boolean): THREE.ExtrudeGeometry {
  const hex = new THREE.Shape();
  const r = 0.42;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) hex.moveTo(x, y);
    else hex.lineTo(x, y);
  }
  hex.closePath();

  const hole = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * (r * 0.48);
    const y = Math.sin(a) * (r * 0.48);
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  hex.holes.push(hole);

  if (isPurine) {
    // Add fused 5-membered ring offset along +X
    const pent = new THREE.Shape();
    const ox = r * 1.15;
    const pr = r * 0.72;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const x = ox + Math.cos(a) * pr;
      const y = Math.sin(a) * pr;
      if (i === 0) pent.moveTo(x, y);
      else pent.lineTo(x, y);
    }
    pent.closePath();
    const phole = new THREE.Path();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const x = ox + Math.cos(a) * (pr * 0.42);
      const y = Math.sin(a) * (pr * 0.42);
      if (i === 0) phole.moveTo(x, y);
      else phole.lineTo(x, y);
    }
    phole.closePath();
    pent.holes.push(phole);

    const geo = new THREE.ExtrudeGeometry([hex, pent], {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    geo.center();
    return geo;
  }

  const geo = new THREE.ExtrudeGeometry(hex, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function addBondCylinder(
  parent: THREE.Group,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  mat: THREE.Material
) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  if (len < 0.001) return;
  const geo = new THREE.CylinderGeometry(radius, radius, len, 10);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(mesh);
}

function addPhosphateCluster(
  parent: THREE.Group,
  pos: THREE.Vector3,
  mat: THREE.Material,
  scale = 1
) {
  const cluster = new THREE.Group();
  cluster.position.copy(pos);
  const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 14, 12), mat);
  cluster.add(pMesh);

  const offsets = [
    new THREE.Vector3(0.24, 0.16, 0),
    new THREE.Vector3(-0.24, 0.16, 0),
    new THREE.Vector3(0, -0.18, 0.24),
    new THREE.Vector3(0, -0.18, -0.24),
  ];
  const oGeo = new THREE.SphereGeometry(0.085 * scale, 10, 8);
  for (const off of offsets) {
    off.multiplyScalar(scale);
    const oMesh = new THREE.Mesh(oGeo, mat);
    oMesh.position.copy(off);
    cluster.add(oMesh);
    addBondCylinder(cluster, new THREE.Vector3(0, 0, 0), off, 0.03 * scale, mat);
  }
  parent.add(cluster);
}

function addDashedHBonds(
  parent: THREE.Group,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  count: 2 | 3,
  mat: THREE.Material
) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const norm = dir.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const perp = new THREE.Vector3().crossVectors(norm, up).normalize();
  if (perp.lengthSq() < 0.01) perp.set(0, 0, 1);

  const offsets = count === 2 ? [-0.14, 0.14] : [-0.22, 0, 0.22];
  const dashes = 4;
  for (const off of offsets) {
    for (let d = 0; d < dashes; d++) {
      const t0 = (d + 0.18) / dashes;
      const t1 = (d + 0.78) / dashes;
      const a = p1.clone().addScaledVector(norm, len * t0).addScaledVector(perp, off);
      const b = p1.clone().addScaledVector(norm, len * t1).addScaledVector(perp, off);
      addBondCylinder(parent, a, b, 0.036, mat);
    }
  }
}

function registerPart(
  partsList: PartRuntime[],
  root: THREE.Group,
  def: HoloPartDef,
  group: THREE.Group,
  materials: THREE.ShaderMaterial[]
) {
  group.userData.partId = def.id;
  group.traverse((obj) => {
    obj.userData.partId = def.id;
  });
  const box = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  if (!box.isEmpty()) {
    box.getCenter(center);
  }
  root.add(group);
  partsList.push({
    def,
    group,
    materials,
    basePos: group.position.clone(),
    explodeDir: new THREE.Vector3(...def.explodeVec),
    centerLocal: center,
    pullFactor: 0,
    dragOffset: new THREE.Vector3(),
    springVel: new THREE.Vector3(),
    scanY: center.y,
    scanActive: 0,
    glitchAmt: 0,
    hoverAmt: 0,
    selectAmt: 0,
    dimAmt: 0,
    labelEl: null,
  });
}

function buildDnaModel(root: THREE.Group): PartRuntime[] {
  const meta = HOLO_MODELS.dna;
  const parts: PartRuntime[] = [];
  const bpCount = 14;
  const stepY = 0.72;
  const radius = 2.45;
  const twist = (Math.PI * 2) / 10.5;
  const halfH = ((bpCount - 1) * stepY) / 2;

  const sequence: Array<['A' | 'T' | 'G' | 'C', 'A' | 'T' | 'G' | 'C']> = [
    ['G', 'C'],
    ['A', 'T'],
    ['T', 'A'],
    ['G', 'C'],
    ['A', 'T'], // idx 4 -> A-T focus
    ['G', 'C'], // idx 5 -> G-C focus
    ['C', 'G'],
    ['T', 'A'],
    ['A', 'T'], // idx 8 -> A-T focus
    ['G', 'C'], // idx 9 -> G-C focus
    ['C', 'G'],
    ['A', 'T'],
    ['T', 'A'],
    ['G', 'C'],
  ];

  const pentGeo = createPentagonGeometry(0.32, 0.1);
  const purineGeo = createBaseRingGeometry(true);
  const pyrimidineGeo = createBaseRingGeometry(false);

  const fwdPts: THREE.Vector3[] = [];
  const revPts: THREE.Vector3[] = [];
  for (let i = 0; i < bpCount; i++) {
    const y = i * stepY - halfH;
    const a = i * twist;
    fwdPts.push(new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
    revPts.push(new THREE.Vector3(-Math.cos(a) * radius, y, -Math.sin(a) * radius));
  }

  // 1. Sugar-phosphate backbone
  const matBackbone = createHoloShaderMaterial('#22d3ee', '#7c5cff', { opacity: 0.76 });
  const grpBackbone = new THREE.Group();
  grpBackbone.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fwdPts), 96, 0.16, 12, false), matBackbone),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(revPts), 96, 0.16, 12, false), matBackbone)
  );
  registerPart(parts, root, meta.parts[0], grpBackbone, [matBackbone]);

  // 2. Deoxyribose sugar
  const matSugar = createHoloShaderMaterial('#38bdf8', '#22d3ee', { opacity: 0.92 });
  const grpSugar = new THREE.Group();
  for (let i = 0; i < bpCount; i++) {
    const a = i * twist;
    const p1 = fwdPts[i];
    const p2 = revPts[i];
    const s1 = new THREE.Mesh(pentGeo, matSugar);
    s1.position.copy(p1).multiplyScalar(0.92);
    s1.position.y = p1.y;
    s1.rotation.y = -a;
    const s2 = new THREE.Mesh(pentGeo, matSugar);
    s2.position.copy(p2).multiplyScalar(0.92);
    s2.position.y = p2.y;
    s2.rotation.y = -a + Math.PI;
    grpSugar.add(s1, s2);
  }
  registerPart(parts, root, meta.parts[1], grpSugar, [matSugar]);

  // 3. Phosphate group (between adjacent sugars on both strands)
  const matPhosphate = createHoloShaderMaterial('#7c5cff', '#22d3ee', { opacity: 0.92 });
  const grpPhosphate = new THREE.Group();
  for (let i = 0; i < bpCount - 1; i++) {
    const mid1 = fwdPts[i].clone().lerp(fwdPts[i + 1], 0.5).multiplyScalar(1.08);
    mid1.y = (fwdPts[i].y + fwdPts[i + 1].y) * 0.5;
    const mid2 = revPts[i].clone().lerp(revPts[i + 1], 0.5).multiplyScalar(1.08);
    mid2.y = (revPts[i].y + revPts[i + 1].y) * 0.5;
    addPhosphateCluster(grpPhosphate, mid1, matPhosphate, 0.92);
    addPhosphateCluster(grpPhosphate, mid2, matPhosphate, 0.92);
  }
  registerPart(parts, root, meta.parts[2], grpPhosphate, [matPhosphate]);

  // 4. Nitrogenous bases (purine double ring + pyrimidine single ring)
  const matA = createHoloShaderMaterial(HOLO_COLORS.A, '#ff9f1c', { opacity: 0.92 });
  const matT = createHoloShaderMaterial(HOLO_COLORS.T, '#ff5d8f', { opacity: 0.92 });
  const matG = createHoloShaderMaterial(HOLO_COLORS.G, '#22d3ee', { opacity: 0.92 });
  const matC = createHoloShaderMaterial(HOLO_COLORS.C, '#7c5cff', { opacity: 0.92 });
  const baseMatMap = { A: matA, T: matT, G: matG, C: matC };
  const grpBases = new THREE.Group();
  const grpAT = new THREE.Group();
  const grpGC = new THREE.Group();

  const matHBonds = createHoloShaderMaterial('#c6ff3d', '#22d3ee', { opacity: 0.9, additive: true });
  const grpHBonds = new THREE.Group();
  const haloRingGeo = new THREE.TorusGeometry(1.65, 0.032, 8, 32);

  for (let i = 0; i < bpCount; i++) {
    const [b1, b2] = sequence[i];
    const p1 = fwdPts[i];
    const p2 = revPts[i];
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    const bPos1 = p1.clone().addScaledVector(dir, 1.15);
    const bPos2 = p2.clone().addScaledVector(dir, -1.15);

    const isATFocus = i === 4 || i === 8;
    const isGCFocus = i === 5 || i === 9;
    const targetGrp = isATFocus ? grpAT : isGCFocus ? grpGC : grpBases;

    const geo1 = b1 === 'A' || b1 === 'G' ? purineGeo : pyrimidineGeo;
    const geo2 = b2 === 'A' || b2 === 'G' ? purineGeo : pyrimidineGeo;

    const m1 = new THREE.Mesh(geo1, baseMatMap[b1]);
    m1.position.copy(bPos1);
    m1.rotation.x = Math.PI / 2;
    m1.rotation.z = -i * twist;

    const m2 = new THREE.Mesh(geo2, baseMatMap[b2]);
    m2.position.copy(bPos2);
    m2.rotation.x = Math.PI / 2;
    m2.rotation.z = -i * twist + Math.PI;

    addBondCylinder(targetGrp, p1, bPos1, 0.055, baseMatMap[b1]);
    addBondCylinder(targetGrp, p2, bPos2, 0.055, baseMatMap[b2]);
    targetGrp.add(m1, m2);

    const hCount: 2 | 3 = b1 === 'A' || b1 === 'T' ? 2 : 3;
    addDashedHBonds(grpHBonds, bPos1, bPos2, hCount, matHBonds);
    if (isATFocus) {
      addDashedHBonds(grpAT, bPos1, bPos2, 2, matT);
      const ring = new THREE.Mesh(haloRingGeo, matT);
      ring.position.set(0, p1.y, 0);
      ring.rotation.x = Math.PI / 2;
      grpAT.add(ring);
    }
    if (isGCFocus) {
      addDashedHBonds(grpGC, bPos1, bPos2, 3, matG);
      const ring = new THREE.Mesh(haloRingGeo, matG);
      ring.position.set(0, p1.y, 0);
      ring.rotation.x = Math.PI / 2;
      grpGC.add(ring);
    }
  }

  registerPart(parts, root, meta.parts[3], grpBases, [matA, matT, matG, matC]);
  registerPart(parts, root, meta.parts[4], grpAT, [matA, matT]);
  registerPart(parts, root, meta.parts[5], grpGC, [matG, matC]);
  registerPart(parts, root, meta.parts[6], grpHBonds, [matHBonds]);

  // 8. Major (wide) and minor (narrow) groove tracer ribbons
  const matGroove = createHoloShaderMaterial('#4cc9ff', '#7c5cff', { opacity: 0.46, additive: true });
  const grpGroove = new THREE.Group();
  const majorPts: THREE.Vector3[] = [];
  const minorPts: THREE.Vector3[] = [];
  for (let i = 0; i < bpCount; i++) {
    const y = i * stepY - halfH;
    const a = i * twist + 1.1;
    majorPts.push(new THREE.Vector3(Math.cos(a) * (radius + 0.56), y, Math.sin(a) * (radius + 0.56)));
    minorPts.push(new THREE.Vector3(Math.cos(a + 2.3) * (radius + 0.45), y, Math.sin(a + 2.3) * (radius + 0.45)));
  }
  grpGroove.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(majorPts), 72, 0.16, 10, false), matGroove),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(minorPts), 72, 0.08, 8, false), matGroove)
  );
  registerPart(parts, root, meta.parts[7], grpGroove, [matGroove]);

  // 9. 5' and 3' antiparallel end caps + orbital direction rings
  const matEnds = createHoloShaderMaterial('#ff9f1c', '#22d3ee', { opacity: 0.94 });
  const grpEnds = new THREE.Group();
  const coneGeo = new THREE.ConeGeometry(0.36, 0.82, 18);
  const capRingGeo = new THREE.TorusGeometry(0.55, 0.04, 10, 24);
  const topFwd = new THREE.Mesh(coneGeo, matEnds);
  topFwd.position.copy(fwdPts[bpCount - 1]).add(new THREE.Vector3(0, 0.52, 0));
  const topFwdRing = new THREE.Mesh(capRingGeo, matEnds);
  topFwdRing.position.copy(topFwd.position);
  topFwdRing.rotation.x = Math.PI / 2;

  const botFwd = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), matEnds);
  botFwd.position.copy(fwdPts[0]).add(new THREE.Vector3(0, -0.4, 0));

  const botRev = new THREE.Mesh(coneGeo, matEnds);
  botRev.position.copy(revPts[0]).add(new THREE.Vector3(0, -0.52, 0));
  botRev.rotation.z = Math.PI;
  const botRevRing = new THREE.Mesh(capRingGeo, matEnds);
  botRevRing.position.copy(botRev.position);
  botRevRing.rotation.x = Math.PI / 2;

  const topRev = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), matEnds);
  topRev.position.copy(revPts[bpCount - 1]).add(new THREE.Vector3(0, 0.4, 0));

  grpEnds.add(topFwd, topFwdRing, botFwd, botRev, botRevRing, topRev);
  registerPart(parts, root, meta.parts[8], grpEnds, [matEnds]);

  return parts;
}

function buildRnaModel(root: THREE.Group): {
  parts: PartRuntime[];
  dnaCompareGhost: THREE.Group;
} {
  const meta = HOLO_MODELS.rna;
  const parts: PartRuntime[] = [];
  const pentGeo = createPentagonGeometry(0.3, 0.1);
  const purineGeo = createBaseRingGeometry(true);
  const pyrimidineGeo = createBaseRingGeometry(false);

  // Build curved single strand with a hairpin loop at the top
  const pts: THREE.Vector3[] = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    if (t < 0.45) {
      // Lower mRNA body S-wave
      const u = t / 0.45;
      pts.push(
        new THREE.Vector3(
          -1.6 + Math.sin(u * Math.PI * 1.4) * 1.4,
          -4.8 + u * 5.2,
          Math.cos(u * Math.PI * 1.4) * 1.2
        )
      );
    } else {
      // Hairpin fold climbing up, looping 180 deg, coming down
      const h = (t - 0.45) / 0.55;
      if (h < 0.38) {
        const s = h / 0.38;
        pts.push(new THREE.Vector3(-0.9, 0.6 + s * 3.8, Math.sin(s * 1.2) * 0.6));
      } else if (h < 0.64) {
        const arc = ((h - 0.38) / 0.26) * Math.PI;
        pts.push(new THREE.Vector3(-Math.cos(arc) * 1.15, 4.4 + Math.sin(arc) * 1.15, 0.3));
      } else {
        const s = (h - 0.64) / 0.36;
        pts.push(new THREE.Vector3(1.15, 4.4 - s * 3.8, -Math.sin(s * 1.2) * 0.6));
      }
    }
  }

  const basesSeq: Array<'A' | 'U' | 'G' | 'C'> = [
    'A', 'U', 'G', 'C', 'C', 'A', 'U', 'G', 'G', 'C',
    'A', 'U', 'C', 'G', 'U', 'A', 'A', 'A', 'A', 'A',
  ];

  // 1. Single strand backbone
  const matStrand = createHoloShaderMaterial('#22d3ee', '#c084fc', { opacity: 0.78 });
  const grpStrand = new THREE.Group();
  grpStrand.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 110, 0.16, 12, false), matStrand)
  );
  registerPart(parts, root, meta.parts[0], grpStrand, [matStrand]);

  // 2. Ribose sugar (pentagon + 2'-OH sphere)
  const matRibose = createHoloShaderMaterial('#ffb020', '#22d3ee', { opacity: 0.86 });
  const grpRibose = new THREE.Group();
  for (let i = 1; i < count - 2; i += 2) {
    const s = new THREE.Mesh(pentGeo, matRibose);
    s.position.copy(pts[i]).add(new THREE.Vector3(0.18, 0, 0.18));
    const oh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), matRibose);
    oh.position.copy(s.position).add(new THREE.Vector3(0.36, -0.18, 0.2));
    grpRibose.add(s, oh);
  }
  registerPart(parts, root, meta.parts[1], grpRibose, [matRibose]);

  // 3. Phosphate backbone
  const matPhos = createHoloShaderMaterial('#7c5cff', '#22d3ee', { opacity: 0.86 });
  const grpPhos = new THREE.Group();
  for (let i = 0; i < count - 1; i += 2) {
    const mid = pts[i].clone().lerp(pts[i + 1], 0.5);
    addPhosphateCluster(grpPhos, mid, matPhos, 0.82);
  }
  registerPart(parts, root, meta.parts[2], grpPhos, [matPhos]);

  // 4. Uracil (U) highlights & 5. Bases A, U, G, C
  const matU = createHoloShaderMaterial(HOLO_COLORS.U, '#ff9f1c', { opacity: 0.9 });
  const matA = createHoloShaderMaterial(HOLO_COLORS.A, '#ff9f1c', { opacity: 0.84 });
  const matG = createHoloShaderMaterial(HOLO_COLORS.G, '#22d3ee', { opacity: 0.84 });
  const matC = createHoloShaderMaterial(HOLO_COLORS.C, '#7c5cff', { opacity: 0.84 });
  const rnaMap = { A: matA, U: matU, G: matG, C: matC };

  const grpUracil = new THREE.Group();
  const grpBases = new THREE.Group();
  for (let i = 1; i < 15; i++) {
    const letter = basesSeq[i];
    const p = pts[i];
    const out = new THREE.Vector3(p.x >= 0 ? -0.9 : 0.9, 0, 0.55).normalize();
    const bPos = p.clone().addScaledVector(out, 0.95);
    const geo = letter === 'A' || letter === 'G' ? purineGeo : pyrimidineGeo;
    const mesh = new THREE.Mesh(geo, rnaMap[letter]);
    mesh.position.copy(bPos);
    mesh.rotation.x = Math.PI / 2;

    if (letter === 'U') {
      addBondCylinder(grpUracil, p, bPos, 0.045, matU);
      grpUracil.add(mesh);
    } else {
      addBondCylinder(grpBases, p, bPos, 0.04, rnaMap[letter]);
      grpBases.add(mesh);
    }
  }
  registerPart(parts, root, meta.parts[3], grpUracil, [matU]);
  registerPart(parts, root, meta.parts[4], grpBases, [matA, matG, matC]);

  // 6. Codon reading frame bracket (indices 2..4 -> AUG)
  const matCodon = createHoloShaderMaterial('#c6ff3d', '#22d3ee', { opacity: 0.85 });
  const grpCodon = new THREE.Group();
  const codonCenter = pts[3].clone();
  const frameRing = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 12, 36), matCodon);
  frameRing.position.copy(codonCenter);
  frameRing.rotation.x = Math.PI / 3;
  grpCodon.add(frameRing);
  for (let idx = 2; idx <= 4; idx++) {
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), matCodon);
    marker.position.copy(pts[idx]).add(new THREE.Vector3(0.5, 0, 0.4));
    grpCodon.add(marker);
  }
  registerPart(parts, root, meta.parts[5], grpCodon, [matCodon]);

  // 7. 5' Cap
  const matCap = createHoloShaderMaterial('#3ddc84', '#c6ff3d', { opacity: 0.9 });
  const grpCap = new THREE.Group();
  const capShield = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), matCap);
  capShield.position.copy(pts[0]).add(new THREE.Vector3(-0.35, -0.35, 0));
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 10, 28), matCap);
  capRing.position.copy(capShield.position);
  grpCap.add(capShield, capRing);
  registerPart(parts, root, meta.parts[6], grpCap, [matCap]);

  // 8. Poly-A Tail
  const matPolyA = createHoloShaderMaterial('#ff5d8f', '#ffb020', { opacity: 0.88 });
  const grpPolyA = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const aPos = pts[count - 1].clone().add(new THREE.Vector3(0.45 + k * 0.45, -0.55 - k * 0.35, 0.25));
    const aRing = new THREE.Mesh(purineGeo, matPolyA);
    aRing.position.copy(aPos);
    aRing.rotation.y = k * 0.4;
    grpPolyA.add(aRing);
    if (k > 0) {
      const prev = pts[count - 1].clone().add(new THREE.Vector3(0.45 + (k - 1) * 0.45, -0.55 - (k - 1) * 0.35, 0.25));
      addBondCylinder(grpPolyA, prev, aPos, 0.04, matPolyA);
    }
  }
  registerPart(parts, root, meta.parts[7], grpPolyA, [matPolyA]);

  // 9. Hairpin Loop (stem base-pair hydrogen bonds at top loop)
  const matHairpin = createHoloShaderMaterial('#4cc9ff', '#c084fc', { opacity: 0.86 });
  const grpHairpin = new THREE.Group();
  const loopCrown = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.09, 12, 36, Math.PI), matHairpin);
  loopCrown.position.set(0.12, 4.4, 0.2);
  grpHairpin.add(loopCrown);
  for (let row = 0; row < 4; row++) {
    const y = 1.4 + row * 0.72;
    addDashedHBonds(
      grpHairpin,
      new THREE.Vector3(-0.75, y, 0.1),
      new THREE.Vector3(0.95, y, -0.1),
      row % 2 === 0 ? 3 : 2,
      matHairpin
    );
  }
  registerPart(parts, root, meta.parts[8], grpHairpin, [matHairpin]);

  // Side-by-side DNA Reference Group for "Compare with DNA"
  const dnaCompareGhost = new THREE.Group();
  const ghostMat = createHoloShaderMaterial('#22d3ee', '#7c5cff', { opacity: 0.7 });
  const ghostTMat = createHoloShaderMaterial(HOLO_COLORS.T, '#ffb020', { opacity: 0.9 });
  const cFwd: THREE.Vector3[] = [];
  const cRev: THREE.Vector3[] = [];
  for (let i = 0; i < 12; i++) {
    const y = i * 0.75 - 4.1;
    const a = i * 0.62;
    cFwd.push(new THREE.Vector3(Math.cos(a) * 1.9, y, Math.sin(a) * 1.9));
    cRev.push(new THREE.Vector3(-Math.cos(a) * 1.9, y, -Math.sin(a) * 1.9));
  }
  dnaCompareGhost.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cFwd), 64, 0.13, 10, false), ghostMat),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cRev), 64, 0.13, 10, false), ghostMat)
  );
  for (let i = 0; i < 12; i++) {
    addBondCylinder(dnaCompareGhost, cFwd[i], cRev[i], 0.05, i % 3 === 1 ? ghostTMat : ghostMat);
  }
  dnaCompareGhost.visible = false;
  dnaCompareGhost.position.set(-4.8, 0, 0);
  root.add(dnaCompareGhost);

  return { parts, dnaCompareGhost };
}

function buildCrisprModel(root: THREE.Group): {
  parts: PartRuntime[];
  cutLeftHalf: THREE.Group;
  cutRightHalf: THREE.Group;
  cutSparks: THREE.Points;
  sparkMat: THREE.PointsMaterial;
} {
  const meta = HOLO_MODELS.crispr;
  const parts: PartRuntime[] = [];

  // 1. Cas9 Outer Wireframe / Holographic Shell
  const matShell = createHoloShaderMaterial('#22d3ee', '#7c5cff', {
    opacity: 0.24,
    wireframe: true,
    fresnelPower: 1.5,
    additive: true,
  });
  const grpShell = new THREE.Group();
  const outerGeo = new THREE.IcosahedronGeometry(4.55, 2);
  outerGeo.scale(1.24, 0.94, 0.9);
  grpShell.add(new THREE.Mesh(outerGeo, matShell));
  registerPart(parts, root, meta.parts[0], grpShell, [matShell]);

  // 2. REC Lobe (upper recognition cradle with translucent contour ribs)
  const matRec = createHoloShaderMaterial('#38bdf8', '#22d3ee', { opacity: 0.36 });
  const grpRec = new THREE.Group();
  const recMain = new THREE.Mesh(new THREE.SphereGeometry(2.55, 28, 20), matRec);
  recMain.scale.set(1.35, 0.72, 0.85);
  recMain.position.set(-0.6, 1.55, -0.42);
  const recBridge = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 1.75, 8, 16), matRec);
  recBridge.rotation.z = Math.PI / 2.4;
  recBridge.position.set(-2.3, 0.7, -0.25);
  const recRib = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.035, 8, 48), matRec);
  recRib.position.set(-0.6, 1.55, -0.35);
  recRib.rotation.x = Math.PI / 2.5;
  grpRec.add(recMain, recBridge, recRib);
  registerPart(parts, root, meta.parts[1], grpRec, [matRec]);

  // 3. NUC Lobe (lower nuclease + PAM cleft)
  const matNuc = createHoloShaderMaterial('#7c5cff', '#4cc9ff', { opacity: 0.36 });
  const grpNuc = new THREE.Group();
  const nucMain = new THREE.Mesh(new THREE.SphereGeometry(2.5, 28, 20), matNuc);
  nucMain.scale.set(1.35, 0.75, 0.85);
  nucMain.position.set(-0.2, -1.65, -0.42);
  const pamCleft = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.32, 12, 28), matNuc);
  pamCleft.position.set(2.9, -0.45, 0.0);
  pamCleft.rotation.y = Math.PI / 2;
  grpNuc.add(nucMain, pamCleft);
  registerPart(parts, root, meta.parts[2], grpNuc, [matNuc]);

  // 4. HNH Domain
  const matHnh = createHoloShaderMaterial('#ff5d8f', '#ff9f1c', { opacity: 0.92 });
  const grpHnh = new THREE.Group();
  const hnhCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.86, 1), matHnh);
  hnhCore.position.set(0.6, 0.76, 1.28);
  const hnhRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.055, 10, 28), matHnh);
  hnhRing.position.copy(hnhCore.position);
  hnhRing.rotation.x = Math.PI / 4;
  grpHnh.add(hnhCore, hnhRing);
  registerPart(parts, root, meta.parts[3], grpHnh, [matHnh]);

  // 5. RuvC Domain
  const matRuvc = createHoloShaderMaterial('#ffb020', '#ff5d8f', { opacity: 0.92 });
  const grpRuvc = new THREE.Group();
  const ruvcCore = new THREE.Mesh(new THREE.DodecahedronGeometry(0.86, 1), matRuvc);
  ruvcCore.position.set(0.6, -1.18, 1.2);
  const ruvcRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.055, 10, 28), matRuvc);
  ruvcRing.position.copy(ruvcCore.position);
  ruvcRing.rotation.x = -Math.PI / 4;
  grpRuvc.add(ruvcCore, ruvcRing);
  registerPart(parts, root, meta.parts[4], grpRuvc, [matRuvc]);

  // 6. Guide RNA (20-nt spacer + 3' scaffold hairpin handle)
  const matGrna = createHoloShaderMaterial('#c084fc', '#22d3ee', { opacity: 0.94 });
  const grpGrna = new THREE.Group();
  const gPts = [
    new THREE.Vector3(1.85, 0.25, 0.1),
    new THREE.Vector3(0.4, 0.3, 0.25),
    new THREE.Vector3(-1.3, 0.35, 0.1),
    new THREE.Vector3(-2.6, 1.1, -0.15),
    new THREE.Vector3(-3.3, 2.35, 0.2),
    new THREE.Vector3(-2.4, 3.05, -0.1),
    new THREE.Vector3(-1.6, 2.2, -0.35),
  ];
  grpGrna.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gPts), 72, 0.15, 10, false), matGrna)
  );
  // 20-nt spacer teeth base-pairing clearly to target DNA strand
  for (let i = 0; i < 9; i++) {
    const x = 1.75 - i * 0.4;
    const p1 = new THREE.Vector3(x, 0.3, 0.14);
    const p2 = new THREE.Vector3(x, -0.16, 0.14);
    addBondCylinder(grpGrna, p1, p2, 0.05, matGrna);
  }
  registerPart(parts, root, meta.parts[5], grpGrna, [matGrna]);

  // 7. PAM (NGG) right at x = 2.6..3.6 with glowing beacon rings
  const matPam = createHoloShaderMaterial('#c6ff3d', '#3ddc84', { opacity: 0.96 });
  const grpPam = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const x = 2.62 + k * 0.45;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.78, 0.46), matPam);
    block.position.set(x, -0.22, 0.0);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 8), matPam);
    spire.position.set(x, 0.34, 0.0);
    grpPam.add(block, spire);
  }
  registerPart(parts, root, meta.parts[6], grpPam, [matPam]);

  // 8. Target DNA & R-Loop (unwound target strand inside + displaced ssDNA loop + upstream/downstream cut halves)
  const matDna = createHoloShaderMaterial('#4cc9ff', '#22d3ee', { opacity: 0.92 });
  const grpRloop = new THREE.Group();
  const cutLeftHalf = new THREE.Group();
  const cutRightHalf = new THREE.Group();

  // Upstream DNA (left of cut x = 0.6)
  const leftTopPts = [
    new THREE.Vector3(-5.2, 0.35, 0.2),
    new THREE.Vector3(-3.6, 0.15, -0.2),
    new THREE.Vector3(-1.8, -0.18, 0.12),
    new THREE.Vector3(0.55, -0.18, 0.12),
  ];
  const leftBotPts = [
    new THREE.Vector3(-5.2, -0.45, -0.2),
    new THREE.Vector3(-3.5, -0.65, 0.2),
    new THREE.Vector3(-1.4, -1.28, 0.75), // Displaced R-loop bulge!
    new THREE.Vector3(0.55, -1.05, 0.55),
  ];
  cutLeftHalf.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftTopPts), 40, 0.14, 10, false), matDna),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftBotPts), 40, 0.14, 10, false), matDna)
  );

  // Downstream DNA (right of cut x = 0.6 -> through PAM at x = 3.0)
  const rightTopPts = [
    new THREE.Vector3(0.68, -0.18, 0.12),
    new THREE.Vector3(2.2, 0.12, 0.0),
    new THREE.Vector3(4.8, 0.35, 0.25),
  ];
  const rightBotPts = [
    new THREE.Vector3(0.68, -1.02, 0.52),
    new THREE.Vector3(2.2, -0.58, 0.0),
    new THREE.Vector3(4.8, -0.45, -0.25),
  ];
  cutRightHalf.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightTopPts), 36, 0.14, 10, false), matDna),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightBotPts), 36, 0.14, 10, false), matDna)
  );
  grpRloop.add(cutLeftHalf, cutRightHalf);
  registerPart(parts, root, meta.parts[7], grpRloop, [matDna]);

  // 9. Cut Site Ring + Sparks at x = 0.62 (3 bp before PAM)
  const matCut = createHoloShaderMaterial('#ff4fa3', '#ff9f1c', { opacity: 0.96, additive: true });
  const grpCut = new THREE.Group();
  const bladeDisc = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.065, 12, 32), matCut);
  bladeDisc.position.set(0.62, -0.55, 0.3);
  bladeDisc.rotation.y = Math.PI / 2;
  const cutUpperDot = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), matCut);
  cutUpperDot.position.set(0.62, -0.18, 0.12);
  const cutLowerDot = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), matCut);
  cutLowerDot.position.set(0.62, -1.02, 0.52);
  grpCut.add(bladeDisc, cutUpperDot, cutLowerDot);

  const sparkCount = 48;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.28,
    color: 0xff9f1c,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const cutSparks = new THREE.Points(sparkGeo, sparkMat);
  cutSparks.position.set(0.62, -0.55, 0.3);
  grpCut.add(cutSparks);

  registerPart(parts, root, meta.parts[8], grpCut, [matCut]);

  return { parts, cutLeftHalf, cutRightHalf, cutSparks, sparkMat };
}

function disposeObject3DTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const anyObj = obj as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (anyObj.geometry) {
      anyObj.geometry.dispose();
    }
    if (anyObj.material) {
      if (Array.isArray(anyObj.material)) {
        anyObj.material.forEach((m) => m.dispose());
      } else {
        anyObj.material.dispose();
      }
    }
  });
}

export const HoloScene: React.FC<HoloSceneProps> = ({
  modelId,
  selectedPartId,
  onSelectPart,
  explodeFactor,
  isolateSelected,
  xrayMode,
  compareWithDna,
  cutAnimPlaying,
  motionEnabled,
  language,
  resetSignal,
  exploredIds,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelsContainerRef = useRef<HTMLDivElement | null>(null);
  const leaderLineRef = useRef<SVGLineElement | null>(null);
  const leaderDotRef = useRef<SVGCircleElement | null>(null);
  const leaderEndDotRef = useRef<SVGCircleElement | null>(null);

  const [webglLost, setWebglLost] = useState(false);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const stateRef = useRef({
    modelId,
    selectedPartId,
    explodeFactor,
    isolateSelected,
    xrayMode,
    compareWithDna,
    cutAnimPlaying,
    motionEnabled,
    language,
    onSelectPart,
    parts: [] as PartRuntime[],
    modelRoot: null as THREE.Group | null,
    dnaCompareGhost: null as THREE.Group | null,
    cutLeftHalf: null as THREE.Group | null,
    cutRightHalf: null as THREE.Group | null,
    cutSparks: null as THREE.Points | null,
    sparkMat: null as THREE.PointsMaterial | null,
    hudRing: null as THREE.Group | null,
    cameraFlying: false,
    userInteracting: false,
    resetRequested: false,
    hoveredPartId: null as string | null,
    draggingPart: null as PartRuntime | null,
    isPageVisible: true,
    isInViewport: true,
    cutTime: 0,
    modelEnter: 1,
    materializeRing: null as THREE.Mesh | null,
  });

  // Sync latest React props into mutable simulation state without recreating renderer
  useEffect(() => {
    const prevSelected = stateRef.current.selectedPartId;
    stateRef.current.selectedPartId = selectedPartId;
    stateRef.current.explodeFactor = explodeFactor;
    stateRef.current.isolateSelected = isolateSelected;
    stateRef.current.xrayMode = xrayMode;
    stateRef.current.compareWithDna = compareWithDna;
    stateRef.current.cutAnimPlaying = cutAnimPlaying;
    stateRef.current.motionEnabled = motionEnabled;
    stateRef.current.language = language;
    stateRef.current.onSelectPart = onSelectPart;

    if (selectedPartId && selectedPartId !== prevSelected) {
      stateRef.current.cameraFlying = true;
      const target = stateRef.current.parts.find((p) => p.def.id === selectedPartId);
      if (target) {
        target.scanActive = 1.0;
        target.scanY = target.centerLocal.y - 4.0;
        target.glitchAmt = motionEnabled ? 1.0 : 0.0;
      }
    }
  }, [
    selectedPartId,
    explodeFactor,
    isolateSelected,
    xrayMode,
    compareWithDna,
    cutAnimPlaying,
    motionEnabled,
    language,
    onSelectPart,
  ]);

  useEffect(() => {
    stateRef.current.resetRequested = true;
  }, [resetSignal]);

  // Core Three.js Initialization (mounted once, model switches cleanly inside dedicated modelRoot)
  useEffect(() => {
    const mountEl = mountRef.current;
    const outerEl = containerRef.current;
    if (!mountEl || !outerEl) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(mountEl.clientWidth, 320);
    const height = Math.max(mountEl.clientHeight, 340);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.015);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 140);
    camera.position.set(11, 2.8, 16);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5.5;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minPolarAngle = 0.25;
    controls.target.set(0, 0, 0);

    controls.addEventListener('start', () => {
      stateRef.current.userInteracting = true;
      stateRef.current.cameraFlying = false;
    });
    controls.addEventListener('end', () => {
      stateRef.current.userInteracting = false;
    });

    // Balanced Studio Lighting (reduced glare for clear molecular structure)
    const hemi = new THREE.HemisphereLight(0x22d3ee, 0x0b1026, 0.54);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
    keyLight.position.set(8, 14, 10);
    const rimLight = new THREE.DirectionalLight(0x7c5cff, 0.62);
    rimLight.position.set(-10, -4, -10);
    const platformSpot = new THREE.PointLight(0x22d3ee, 1.1, 26);
    platformSpot.position.set(0, -7.2, 0);
    scene.add(hemi, keyLight, rimLight, platformSpot);

    // 1. Perspective Grid Floor
    const floorTex = createFloorGridTexture(renderer.capabilities.getMaxAnisotropy());
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(76, 76),
      new THREE.MeshBasicMaterial({
        map: floorTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -8.5;
    scene.add(floorMesh);

    // 2. Glowing Circular Holographic Projector Platform + Rotating Concentric Rings + Light Beam
    const projectorGroup = new THREE.Group();
    projectorGroup.position.y = -8.35;

    const baseRim = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 6.2, 0.36, 48),
      new THREE.MeshStandardMaterial({
        color: 0x0b1528,
        metalness: 0.85,
        roughness: 0.28,
      })
    );
    projectorGroup.add(baseRim);

    const ringOuter = new THREE.Mesh(
      new THREE.RingGeometry(5.15, 5.45, 64),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    ringOuter.rotation.x = -Math.PI / 2;
    ringOuter.position.y = 0.22;

    const ringMid = new THREE.Mesh(
      new THREE.TorusGeometry(4.1, 0.04, 10, 64, Math.PI * 1.45),
      new THREE.MeshBasicMaterial({ color: 0x7c5cff, transparent: true, opacity: 0.72 })
    );
    ringMid.rotation.x = -Math.PI / 2;
    ringMid.position.y = 0.25;

    const ringInner = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.035, 10, 48, Math.PI * 1.6),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.82 })
    );
    ringInner.rotation.x = -Math.PI / 2;
    ringInner.position.y = 0.27;

    const beamMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0x22d3ee) }, uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 1.9);
          float streak = 0.82 + 0.18 * sin(vUv.x * 36.0 + uTime * 1.4);
          gl_FragColor = vec4(uColor, fade * streak * 0.08);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const lightBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 5.2, 16.5, 48, 1, true),
      beamMat
    );
    lightBeam.position.y = 8.4;

    projectorGroup.add(ringOuter, ringMid, ringInner, lightBeam);
    scene.add(projectorGroup);

    // 3. Drifting Volumetric Dust Particles (400-720 adaptive)
    const particleTex = createSoftParticleTexture();
    const isSmallScreen = width < 640;
    const particleCount = isSoftwareGl ? 420 : isSmallScreen ? 460 : 720;
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 34;
      pPos[i * 3 + 1] = (Math.random() - 0.45) * 18;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const dustPoints = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        size: 0.24,
        map: particleTex,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(dustPoints);

    // 4. Tiny Floating Molecular Props in Deep Background
    const floatingProps = new THREE.Group();
    const propMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    });
    const propCoords = [
      [-11, 4.5, -8],
      [12, 3.2, -9],
      [-9, -3.5, -10],
      [10, -4.2, -7],
      [0, 6.5, -12],
    ];
    for (const [x, y, z] of propCoords) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 1), propMat);
      m.position.set(x, y, z);
      floatingProps.add(m);
    }
    scene.add(floatingProps);

    // 5. Thin 3D HUD Target Ring around Selected Part
    const hudRing = new THREE.Group();
    const hudTorus1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.025, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xff9f1c, transparent: true, opacity: 0.78 })
    );
    const hudTorus2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.018, 8, 48, Math.PI * 1.2),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.65 })
    );
    hudTorus2.rotation.x = Math.PI / 2;
    hudRing.add(hudTorus1, hudTorus2);
    hudRing.visible = false;
    scene.add(hudRing);
    stateRef.current.hudRing = hudRing;

    // 6. Dedicated Molecule Model Root + Model Materialization Sweep Ring
    const modelRoot = new THREE.Group();
    scene.add(modelRoot);
    stateRef.current.modelRoot = modelRoot;

    const materializeRing = new THREE.Mesh(
      new THREE.TorusGeometry(4.9, 0.055, 10, 64),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    materializeRing.rotation.x = Math.PI / 2;
    scene.add(materializeRing);
    stateRef.current.materializeRing = materializeRing;

    // Post-processing Composer (skipped on Software WebGL for reliable fast rendering)
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.36, 0.84);
      composer.addPass(bloomPass);
      composer.addPass(new ShaderPass(ChromaticEdgeShader));
      composer.addPass(new OutputPass());
    }

    // Raycasting & Pointer Dragging Mechanics
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let isDraggingPart = false;
    let lastHoverCheck = 0;

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      return {
        localX: clientX - rect.left,
        localY: clientY - rect.top,
      };
    };

    const pickPart = (): PartRuntime | null => {
      if (!stateRef.current.modelRoot) return null;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(stateRef.current.modelRoot.children, true);
      for (const hit of hits) {
        if (!hit.object.visible) continue;
        const pid = hit.object.userData?.partId as string | undefined;
        if (pid) {
          return stateRef.current.parts.find((p) => p.def.id === pid) ?? null;
        }
      }
      return null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = stateRef.current;
      const { localX, localY } = updateNdc(e.clientX, e.clientY);

      if (isDraggingPart && st.draggingPart) {
        raycaster.setFromCamera(pointerNdc, camera);
        if (raycaster.ray.intersectPlane(_dragPlane, _dragHit)) {
          _v1.copy(_dragHit).sub(_v2); // delta from drag origin
          const proj = _v1.dot(_v3); // project onto part's pull direction
          const clamped = THREE.MathUtils.clamp(proj, -1.0, 5.5);
          st.draggingPart.dragOffset.copy(_v3).multiplyScalar(clamped);
        }
        return;
      }

      const now = performance.now();
      if (now - lastHoverCheck < 45) return;
      lastHoverCheck = now;

      const hit = pickPart();
      st.hoveredPartId = hit ? hit.def.id : null;
      if (hit) {
        renderer.domElement.style.cursor =
          hit.def.id === st.selectedPartId ? 'grab' : 'pointer';
        setHoveredName(getHoloPartText(hit.def, st.language).name);
        setHoverPos({ x: localX, y: localY });
      } else {
        renderer.domElement.style.cursor = 'default';
        setHoveredName(null);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      updateNdc(e.clientX, e.clientY);
      const hit = pickPart();
      const st = stateRef.current;
      if (hit && hit.def.id === st.selectedPartId) {
        isDraggingPart = true;
        st.draggingPart = hit;
        controls.enabled = false;
        renderer.domElement.style.cursor = 'grabbing';
        // Setup drag plane facing camera through hit part world position
        hit.group.getWorldPosition(_v2);
        camera.getWorldDirection(_v1).negate();
        _dragPlane.setFromNormalAndCoplanarPoint(_v1, _v2);
        _v3.copy(hit.explodeDir).normalize();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const st = stateRef.current;
      if (isDraggingPart) {
        isDraggingPart = false;
        st.draggingPart = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = 'grab';
        return;
      }
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 6) {
        updateNdc(e.clientX, e.clientY);
        const hit = pickPart();
        if (hit) {
          st.onSelectPart(hit.def.id);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    // Resize, Visibility, Intersection Observers (rAF-deferred to avoid ResizeObserver loops)
    let resizeRafId = 0;
    let lastObservedW = width;
    let lastObservedH = height;
    const applyResize = () => {
      resizeRafId = 0;
      if (!mountEl) return;
      const w = Math.max(mountEl.clientWidth, 320);
      const h = Math.max(mountEl.clientHeight, 340);
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
    resizeObs.observe(mountEl);

    const handleVisibility = () => {
      stateRef.current.isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let intObs: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intObs = new IntersectionObserver(
        (entries) => {
          if (entries[0]) stateRef.current.isInViewport = entries[0].isIntersecting;
        },
        { threshold: 0.05 }
      );
      intObs.observe(outerEl);
    }

    // Frame Loop with Software WebGL afterDraw pacing & Zero GC
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

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
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
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
      const st = stateRef.current;

      if (!st.isPageVisible || !st.isInViewport) {
        lastTime = now;
        if (isSoftwareGl) frameId = window.setTimeout(() => tick(performance.now()), 250);
        else frameId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      if (st.motionEnabled) elapsed += dt;

      // Reset camera cleanly
      if (st.resetRequested) {
        st.resetRequested = false;
        st.cameraFlying = false;
        camera.position.set(11, 2.8, 16);
        controls.target.set(0, 0, 0);
        controls.update();
      }

      // Projector animations
      beamMat.uniforms.uTime.value = elapsed;
      if (st.motionEnabled) {
        ringMid.rotation.z += dt * 0.42;
        ringInner.rotation.z -= dt * 0.65;
        dustPoints.rotation.y += dt * 0.025;
        floatingProps.children.forEach((p, idx) => {
          p.rotation.x += dt * (0.2 + idx * 0.05);
          p.rotation.y += dt * (0.25 + idx * 0.04);
        });
      }

      // Smooth 3D Holographic Model Materialization Entrance & Idle Spin
      if (st.modelRoot) {
        if (st.modelEnter < 1) {
          st.modelEnter = st.motionEnabled ? Math.min(1, st.modelEnter + dt * 1.85) : 1;
          const ease = 1 - Math.pow(1 - st.modelEnter, 3);
          st.modelRoot.scale.setScalar(0.84 + 0.16 * ease);
          st.modelRoot.position.y = (1 - ease) * -1.45;
          if (st.materializeRing) {
            const mat = st.materializeRing.material as THREE.MeshBasicMaterial;
            st.materializeRing.position.y = -6.2 + ease * 12.4;
            mat.opacity = Math.sin(ease * Math.PI) * 0.78;
          }
        } else {
          st.modelRoot.scale.setScalar(1);
          st.modelRoot.position.y = 0;
          if (st.materializeRing) {
            (st.materializeRing.material as THREE.MeshBasicMaterial).opacity = 0;
          }
        }

        if (st.modelId === 'rna' && st.dnaCompareGhost) {
          st.dnaCompareGhost.visible = st.compareWithDna;
          if (st.compareWithDna) {
            st.modelRoot.position.x = st.motionEnabled
              ? THREE.MathUtils.damp(st.modelRoot.position.x, 4.4, 6, dt)
              : 4.4;
            st.dnaCompareGhost.position.x = -8.8;
            if (st.motionEnabled) {
              st.dnaCompareGhost.rotation.y += dt * 0.25;
            }
          } else {
            st.modelRoot.position.x = st.motionEnabled
              ? THREE.MathUtils.damp(st.modelRoot.position.x, 0, 6, dt)
              : 0;
          }
        } else {
          st.modelRoot.position.x = 0;
        }

        // Gentle idle float rotation when not isolated or dragging
        if (st.motionEnabled && !st.selectedPartId && !st.userInteracting && !st.compareWithDna) {
          st.modelRoot.rotation.y += dt * 0.14;
        }
      }

      // CRISPR Cleavage + Spark Burst + Rejoin Loop
      if (
        st.modelId === 'crispr' &&
        st.cutLeftHalf &&
        st.cutRightHalf &&
        st.cutSparks &&
        st.sparkMat
      ) {
        const shouldPlayCut = st.cutAnimPlaying || st.selectedPartId === 'cas9-cut';
        if (shouldPlayCut && st.motionEnabled) {
          st.cutTime += dt;
          const phase = st.cutTime % 3.2;
          const sep = phase < 2.2 ? Math.sin((phase / 2.2) * Math.PI) : 0;
          st.cutLeftHalf.position.x = -sep * 1.15;
          st.cutRightHalf.position.x = sep * 1.15;
          if (sep > 0.2) {
            st.sparkMat.opacity = sep * 0.95;
            const attr = st.cutSparks.geometry.getAttribute('position') as THREE.BufferAttribute;
            const arr = attr.array as Float32Array;
            for (let i = 0; i < arr.length / 3; i++) {
              const ang = (i / (arr.length / 3)) * Math.PI * 2 + st.cutTime * 2.2;
              const r = 0.25 + sep * 1.9 * ((i % 4) / 3 + 0.25);
              arr[i * 3] = Math.cos(ang) * r * 0.55;
              arr[i * 3 + 1] = Math.sin(ang) * r;
              arr[i * 3 + 2] = Math.cos(ang * 1.7) * r * 0.7;
            }
            attr.needsUpdate = true;
          } else {
            st.sparkMat.opacity = 0;
          }
        } else {
          st.cutLeftHalf.position.x = st.motionEnabled
            ? THREE.MathUtils.damp(st.cutLeftHalf.position.x, 0, 7, dt)
            : 0;
          st.cutRightHalf.position.x = st.motionEnabled
            ? THREE.MathUtils.damp(st.cutRightHalf.position.x, 0, 7, dt)
            : 0;
          st.sparkMat.opacity = 0;
        }
      }

      // Update each part: pull-out, drag spring-back, scan sweep, highlight uniforms, HUD ring & leader line
      let activePart: PartRuntime | null = null;
      const w = mountEl ? mountEl.clientWidth : 1000;
      const h = mountEl ? mountEl.clientHeight : 600;

      for (const p of st.parts) {
        const isSelected = p.def.id === st.selectedPartId;
        const isHovered = p.def.id === st.hoveredPartId;
        if (isSelected) activePart = p;

        // Isolate visibility
        if (st.isolateSelected && st.selectedPartId) {
          p.group.visible = isSelected;
        } else {
          p.group.visible = true;
        }

        // Smooth pull-out + explode offset
        const pullTarget = isSelected ? Math.max(0.42, st.explodeFactor) : st.explodeFactor;
        p.pullFactor = st.motionEnabled
          ? THREE.MathUtils.damp(p.pullFactor, pullTarget, 7.5, dt)
          : pullTarget;

        // Underdamped spring-back for dragOffset when released
        if (st.draggingPart !== p) {
          if (st.motionEnabled) {
            const k = 120;
            const c = 14;
            p.springVel.addScaledVector(p.dragOffset, -k * dt);
            p.springVel.multiplyScalar(Math.exp(-c * dt));
            p.dragOffset.addScaledVector(p.springVel, dt);
          } else {
            p.dragOffset.set(0, 0, 0);
          }
        }

        p.group.position
          .copy(p.basePos)
          .addScaledVector(p.explodeDir, p.pullFactor)
          .add(p.dragOffset);

        // Uniform transitions
        p.selectAmt = st.motionEnabled
          ? THREE.MathUtils.damp(p.selectAmt, isSelected ? 1 : 0, 9, dt)
          : isSelected
          ? 1
          : 0;
        p.hoverAmt = st.motionEnabled
          ? THREE.MathUtils.damp(p.hoverAmt, isHovered ? 1 : 0, 12, dt)
          : isHovered
          ? 1
          : 0;
        const shouldDim = Boolean(st.selectedPartId && !isSelected);
        p.dimAmt = st.motionEnabled
          ? THREE.MathUtils.damp(p.dimAmt, shouldDim ? 1 : 0, 7, dt)
          : shouldDim
          ? 1
          : 0;

        if (p.scanActive > 0.01) {
          p.scanY += dt * 7.5;
          p.scanActive = Math.max(0, p.scanActive - dt * 0.72);
        }
        p.glitchAmt = Math.max(0, p.glitchAmt - dt * 3.8);

        for (const mat of p.materials) {
          mat.uniforms.uTime.value = elapsed;
          mat.uniforms.uSelected.value = p.selectAmt;
          mat.uniforms.uHovered.value = p.hoverAmt;
          mat.uniforms.uDimmed.value = p.dimAmt;
          mat.uniforms.uXray.value = st.xrayMode ? 1 : 0;
          mat.uniforms.uScanY.value = p.scanY;
          mat.uniforms.uScanActive.value = p.scanActive;
          mat.uniforms.uGlitch.value = p.glitchAmt;
        }

        // Project floating exploded label
        if (p.labelEl) {
          if (st.explodeFactor > 0.25 && p.group.visible) {
            _v1.copy(p.centerLocal).add(p.group.position);
            st.modelRoot?.localToWorld(_v1);
            _v1.project(camera);
            if (_v1.z < 1) {
              const lx = ((_v1.x + 1) / 2) * w;
              const ly = ((-_v1.y + 1) / 2) * h;
              p.labelEl.style.opacity = '1';
              p.labelEl.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0) translate(-50%, -50%)`;
            } else {
              p.labelEl.style.opacity = '0';
            }
          } else {
            p.labelEl.style.opacity = '0';
          }
        }
      }

      // HUD Target Ring & Leader Line + Smooth Camera Fly-To
      if (activePart && st.hudRing) {
        _v1.copy(activePart.centerLocal).add(activePart.group.position);
        st.modelRoot?.localToWorld(_v1);
        st.hudRing.visible = true;
        st.hudRing.position.copy(_v1);
        if (st.motionEnabled) {
          st.hudRing.rotation.z += dt * 1.1;
          st.hudRing.rotation.y += dt * 0.8;
        }

        // Fly camera smoothly when requested
        if (st.cameraFlying && !st.userInteracting) {
          _camTargetGoal.copy(_v1);
          _camPosGoal.copy(_v1).add(
            _v2.set(...activePart.def.focusOffset)
          );
          if (st.motionEnabled) {
            controls.target.lerp(_camTargetGoal, 1 - Math.exp(-5.0 * dt));
            camera.position.lerp(_camPosGoal, 1 - Math.exp(-4.0 * dt));
            if (camera.position.distanceTo(_camPosGoal) < 0.08) {
              st.cameraFlying = false;
            }
          } else {
            controls.target.copy(_camTargetGoal);
            camera.position.copy(_camPosGoal);
            st.cameraFlying = false;
          }
        }

        // Update SVG Leader Line from projected 3D part center to right HUD card anchor
        _v1.project(camera);
        if (_v1.z < 1 && leaderLineRef.current && leaderDotRef.current && leaderEndDotRef.current) {
          const sx = ((_v1.x + 1) / 2) * w;
          const sy = ((-_v1.y + 1) / 2) * h;
          const ex = w > 768 ? w - 348 : w * 0.5;
          const ey = w > 768 ? Math.min(Math.max(150, sy), h - 180) : h - 190;
          leaderLineRef.current.setAttribute('x1', sx.toFixed(1));
          leaderLineRef.current.setAttribute('y1', sy.toFixed(1));
          leaderLineRef.current.setAttribute('x2', ex.toFixed(1));
          leaderLineRef.current.setAttribute('y2', ey.toFixed(1));
          leaderLineRef.current.setAttribute('opacity', '0.85');
          leaderDotRef.current.setAttribute('cx', sx.toFixed(1));
          leaderDotRef.current.setAttribute('cy', sy.toFixed(1));
          leaderDotRef.current.setAttribute('opacity', '1');
          leaderEndDotRef.current.setAttribute('cx', ex.toFixed(1));
          leaderEndDotRef.current.setAttribute('cy', ey.toFixed(1));
          leaderEndDotRef.current.setAttribute('opacity', '1');
        }
      } else {
        if (st.hudRing) st.hudRing.visible = false;
        if (leaderLineRef.current && leaderDotRef.current && leaderEndDotRef.current) {
          leaderLineRef.current.setAttribute('opacity', '0');
          leaderDotRef.current.setAttribute('opacity', '0');
          leaderEndDotRef.current.setAttribute('opacity', '0');
        }
      }

      controls.update();
      if (composer) composer.render();
      else renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed) tick(performance.now());
        });
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) frameId = window.setTimeout(() => tick(performance.now()), 16);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      intObs?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      disposeObject3DTree(scene);
      floorTex.dispose();
      particleTex.dispose();
      envTex.dispose();
      controls.dispose();
      composer?.dispose();
      renderer.dispose();
      stateRef.current.modelRoot = null;
      stateRef.current.parts = [];
    };
  }, []);

  // Swap Procedural Model Cleanly with Complete Geometry/Material Disposal on Model Switch
  useEffect(() => {
    const modelRoot = stateRef.current.modelRoot;
    if (!modelRoot) return;

    while (modelRoot.children.length > 0) {
      const child = modelRoot.children[0];
      modelRoot.remove(child);
      disposeObject3DTree(child);
    }
    stateRef.current.parts = [];
    stateRef.current.dnaCompareGhost = null;
    stateRef.current.cutLeftHalf = null;
    stateRef.current.cutRightHalf = null;
    stateRef.current.cutSparks = null;
    stateRef.current.sparkMat = null;
    stateRef.current.modelId = modelId;
    stateRef.current.modelEnter = stateRef.current.motionEnabled ? 0 : 1;
    stateRef.current.resetRequested = true;
    modelRoot.rotation.set(0, 0, 0);

    if (modelId === 'dna') {
      stateRef.current.parts = buildDnaModel(modelRoot);
    } else if (modelId === 'rna') {
      const built = buildRnaModel(modelRoot);
      stateRef.current.parts = built.parts;
      stateRef.current.dnaCompareGhost = built.dnaCompareGhost;
    } else {
      const built = buildCrisprModel(modelRoot);
      stateRef.current.parts = built.parts;
      stateRef.current.cutLeftHalf = built.cutLeftHalf;
      stateRef.current.cutRightHalf = built.cutRightHalf;
      stateRef.current.cutSparks = built.cutSparks;
      stateRef.current.sparkMat = built.sparkMat;
    }

    // Bind exploded floating DOM labels cleanly
    if (labelsContainerRef.current) {
      labelsContainerRef.current.innerHTML = '';
      for (const p of stateRef.current.parts) {
        const div = document.createElement('div');
        div.className =
          'absolute top-0 left-0 px-2 py-0.5 rounded-lg border border-white/20 bg-[#050a14]/90 text-[10px] font-mono text-[#e8f3f1] whitespace-nowrap transition-opacity duration-150 pointer-events-none';
        div.style.opacity = '0';
        div.textContent = p.def.name;
        labelsContainerRef.current.appendChild(div);
        p.labelEl = div;
      }
    }
  }, [modelId]);

  // WebGL Context Lost 2D Educational Fallback
  if (webglLost) {
    const meta = HOLO_MODELS[modelId];
    return (
      <div className="w-full h-full min-h-[540px] rounded-[20px] border border-white/10 bg-[#050a14] p-6 overflow-y-auto space-y-4">
        <div className="space-y-1">
          <div className="text-xs font-mono text-[#ff9f1c]">
            WebGL Context Unavailable — 2D Interactive Parts Mode
          </div>
          <h3 className="font-display text-xl font-bold text-[#e8f3f1]">
            {getHoloModelText(meta, language).title}
          </h3>
          <p className="text-xs text-[#8aa4ad]">
            Simplified educational illustration. Select any part below to explore its role.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {meta.parts.map((part) => {
            const active = part.id === selectedPartId;
            const partText = getHoloPartText(part, language);
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => onSelectPart(part.id)}
                className={`text-left rounded-2xl border p-4 space-y-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-[#ff9f1c] bg-[#ff9f1c]/15'
                    : 'border-white/10 bg-white/5 hover:border-[#22d3ee]/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span style={{ color: part.color }}>{part.calloutTag}</span>
                  <span className="text-[#8aa4ad]">
                    {exploredIds.has(part.id) ? 'Explored' : `#${part.order}`}
                  </span>
                </div>
                <div className="font-display font-semibold text-sm text-[#e8f3f1]">
                  {partText.name}
                </div>
                <p className="text-xs text-[#c7d8d6] leading-relaxed">
                  {partText.explanation}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[540px] overflow-hidden rounded-[20px] border border-white/10 bg-[#030712]"
    >
      {/* Dedicated WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full min-h-[540px]"
        aria-label="Interactive 3D holographic molecular inspection stage"
      />

      {/* Exploded-View Floating 3D-Projected Labels */}
      <div ref={labelsContainerRef} className="pointer-events-none absolute inset-0 overflow-hidden z-10" />

      {/* 2D SVG Holographic Leader Line Connecting Selected Part to Info Card */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full z-10"
        aria-hidden="true"
      >
        <line
          ref={leaderLineRef}
          x1="0"
          y1="0"
          x2="0"
          y2="0"
          stroke="#ff9f1c"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0"
        />
        <circle ref={leaderDotRef} cx="0" cy="0" r="5" fill="#ff9f1c" opacity="0" />
        <circle ref={leaderEndDotRef} cx="0" cy="0" r="3.5" fill="#22d3ee" opacity="0" />
      </svg>

      {/* Hover Tooltip */}
      {hoveredName && (
        <div
          className="pointer-events-none absolute z-20 px-2.5 py-1 rounded-lg border border-[#ff9f1c]/70 bg-[#050a14]/92 text-xs font-medium text-[#ff9f1c] whitespace-nowrap"
          style={{
            left: Math.min(hoverPos.x + 14, 520),
            top: Math.max(hoverPos.y - 28, 12),
          }}
        >
          {hoveredName}
        </div>
      )}
    </div>
  );
};
