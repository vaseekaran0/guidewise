/**
 * GuideWise Deterministic CRISPR-Cas9 Educational Simulation Engine
 *
 * Pure deterministic bioinformatics logic (no LLM, no external APIs).
 * Designed for educational demonstration on synthetic DNA sequences only.
 */

export const EDUCATIONAL_DISCLAIMER =
  'Educational Simulation Only: Synthetic DNA sequences and educational estimates are shown for learning purposes. Scores are not experimentally validated and no real genetic modification or laboratory protocol is provided.';

export type PamType = 'NGG' | 'NAG' | 'NNGRRT';
export type Strand = '+' | '-';

export interface DnaStats {
  length: number;
  gcCount: number;
  gcPercent: number;
  counts: {
    A: number;
    T: number;
    G: number;
    C: number;
  };
}

export interface SiteMatch {
  strand: Strand;
  /** 1-based inclusive start coordinate on the original forward strand */
  start: number;
  /** 1-based inclusive end coordinate on the original forward strand */
  end: number;
  /** Target protospacer sequence in 5' -> 3' orientation of the matched strand */
  targetSeq: string;
  /** Guide sequence normalized (U -> T) in 5' -> 3' orientation */
  guideSeq: string;
  /** Number of base mismatches (Hamming distance) */
  mismatches: number;
  /** 1-based positions within the guide (5' -> 3', 1..guideLength) that differ */
  mismatchPositions: number[];
  /** Number of mismatches falling inside the seed region (last 10 bases next to PAM) */
  seedMismatches: number;
  /** Weighted mismatch penalty (3 per seed mismatch, 1 per non-seed mismatch) */
  penalty: number;
  /** Observed PAM sequence immediately 3' of the target window on the matched strand */
  pam: string;
  /** 1-based inclusive [start, end] of the PAM on the original forward strand */
  pamStart: number;
  pamEnd: number;
  /** Whether the observed PAM matches the selected PAM pattern (e.g., NGG) */
  pamOk: boolean;
  /** Educational estimate score: 100 * exp(-0.5 * penalty) if pamOk, else 0.0 */
  score: number;
  /**
   * Cut site coordinate (1-based original strand): "cut after <cut>".
   * Forward (+): 3 bp upstream of PAM = end - 3 (cleaves between end-3 and end-2).
   * Reverse (-): 3 bp upstream of PAM (on - strand) = start + 2 (cleaves between start+2 and start+3).
   */
  cut: number;
  /** Classification category for UI & 3D color coding */
  category: 'on-target' | 'near-match' | 'high-mismatch' | 'no-pam';
}

export interface GuideAnalysisResult {
  guide: string;
  sites: SiteMatch[];
  summary: {
    totalSites: number;
    validPamSites: number;
    perfectMatches: number;
    bestScore: number;
  };
}

export interface HypotheticalEditResult {
  cut: number;
  strand: Strand;
  insertedBase: string;
  contextStart: number;
  contextEnd: number;
  originalContext: string;
  deletionContext: string;
  deletedBase: string;
  insertionContext: string;
  originalFull: string;
  deletionFull: string;
  insertionFull: string;
  /** Local index within context strings where the cut occurs (after this index) */
  localCutOffset: number;
  label: string;
  disclaimer: string;
}

export const TEST_VECTOR = {
  guide: 'GATCCGTAACGGTTCAGCTA',
  pam: 'NGG' as PamType,
  maxMm: 4,
  dna: 'ATTGCCATGACTAGATCCGTAACGGTTCAGCTATGGCCATTAGCATGATGCGTAACGGTTCATCTAAGGTTACGGATCAGATCCGTAACGGTTCAGCTATCAGGCATTAC',
};

const COMPLEMENT_MAP: Record<string, string> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

const IUPAC_MAP: Record<string, Set<string>> = {
  A: new Set(['A']),
  C: new Set(['C']),
  G: new Set(['G']),
  T: new Set(['T']),
  R: new Set(['A', 'G']),
  Y: new Set(['C', 'T']),
  N: new Set(['A', 'C', 'G', 'T']),
};

export const SUPPORTED_PAMS: Record<PamType, { label: string; description: string; length: number }> = {
  NGG: {
    label: 'NGG (SpCas9 canonical)',
    description: 'Standard Streptococcus pyogenes Cas9 PAM: any base followed by two Guanines.',
    length: 3,
  },
  NAG: {
    label: 'NAG (SpCas9 alternate)',
    description: 'Non-canonical weaker SpCas9 PAM: any base followed by Adenine and Guanine.',
    length: 3,
  },
  NNGRRT: {
    label: 'NNGRRT (SaCas9)',
    description: 'Staphylococcus aureus Cas9 PAM: two any bases, G, two purines (A or G), and T.',
    length: 6,
  },
};

/**
 * Strips FASTA header lines (starting with '>') and whitespace,
 * converts lowercase to uppercase, and converts RNA 'U' to DNA 'T'.
 */
export function parseFastaOrPlain(rawInput: string): string {
  const lines = rawInput.split(/\r?\n/);
  const sequenceLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip FASTA header lines
    if (trimmed.startsWith('>')) continue;
    sequenceLines.push(trimmed);
  }

  return sequenceLines.join('').replace(/\s+/g, '').toUpperCase().replace(/U/g, 'T');
}

/**
 * Validates a synthetic DNA sequence.
 * Rejects any character outside A/C/G/T (after U -> T conversion) and enforces length >= 30.
 */
export function validateDnaInput(rawDna: string): { valid: true; sequence: string } | { valid: false; error: string } {
  if (!rawDna || !rawDna.trim()) {
    return { valid: false, error: 'Synthetic DNA sequence cannot be empty. Paste plain text or FASTA (minimum 30 bases).' };
  }

  const lines = rawDna.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.every((l) => l.trim().startsWith('>'))) {
    return { valid: false, error: 'FASTA header found, but no nucleotide sequence lines were provided below it.' };
  }

  const normalized = parseFastaOrPlain(rawDna);
  if (normalized.length === 0) {
    return { valid: false, error: 'No nucleotide bases found after parsing input.' };
  }

  const invalidChars = Array.from(new Set(normalized.replace(/[ACGT]/g, '').split('')));
  if (invalidChars.length > 0) {
    return {
      valid: false,
      error: `Invalid DNA characters detected: ${invalidChars.join(', ')}. Only A, C, G, T (or U, converted to T) are allowed.`,
    };
  }

  if (normalized.length < 30) {
    return {
      valid: false,
      error: `Synthetic DNA sequence must be at least 30 bases long (currently ${normalized.length} bases).`,
    };
  }

  if (normalized.length > 5000) {
    return {
      valid: false,
      error: `For responsive educational visualization, synthetic DNA length is capped at 5,000 bases (currently ${normalized.length} bases).`,
    };
  }

  return { valid: true, sequence: normalized };
}

/**
 * Validates a synthetic guide RNA / protospacer sequence.
 * Accepts A/C/G/T/U (U converts to T), enforces length 15-25 bases.
 */
export function validateGuideInput(rawGuide: string): { valid: true; sequence: string } | { valid: false; error: string } {
  if (!rawGuide || !rawGuide.trim()) {
    return { valid: false, error: 'Guide RNA sequence cannot be empty (15-25 bases required).' };
  }

  const normalized = parseFastaOrPlain(rawGuide);
  const invalidChars = Array.from(new Set(normalized.replace(/[ACGT]/g, '').split('')));
  if (invalidChars.length > 0) {
    return {
      valid: false,
      error: `Invalid guide RNA characters detected: ${invalidChars.join(', ')}. Only A, C, G, T, or U are allowed.`,
    };
  }

  if (normalized.length < 15 || normalized.length > 25) {
    return {
      valid: false,
      error: `Guide RNA must be between 15 and 25 bases long (currently ${normalized.length} bases).`,
    };
  }

  return { valid: true, sequence: normalized };
}

/**
 * Computes reverse complement of a DNA sequence (5' -> 3' of opposite strand).
 */
export function reverseComplement(seq: string): string {
  let out = '';
  for (let i = seq.length - 1; i >= 0; i--) {
    out += COMPLEMENT_MAP[seq[i]] ?? 'N';
  }
  return out;
}

/**
 * Computes basic composition statistics for a validated DNA sequence.
 */
export function computeDnaStats(dna: string): DnaStats {
  const counts = { A: 0, T: 0, G: 0, C: 0 };
  for (let i = 0; i < dna.length; i++) {
    const ch = dna[i] as keyof typeof counts;
    if (ch in counts) counts[ch]++;
  }
  const gcCount = counts.G + counts.C;
  const gcPercent = dna.length > 0 ? Number(((gcCount / dna.length) * 100).toFixed(1)) : 0;
  return {
    length: dna.length,
    gcCount,
    gcPercent,
    counts,
  };
}

/**
 * Checks whether an observed DNA substring matches an IUPAC PAM pattern (e.g., NGG, NAG, NNGRRT).
 */
export function matchesPam(observedPam: string, pamPattern: PamType): boolean {
  if (observedPam.length !== pamPattern.length) return false;
  for (let i = 0; i < pamPattern.length; i++) {
    const allowed = IUPAC_MAP[pamPattern[i]];
    if (!allowed || !allowed.has(observedPam[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluates a single target window against a guide sequence.
 *
 * Scoring formula:
 * - Seed region = last 10 bases of the guide closest to the 3' PAM.
 *   Each mismatch in the seed region incurs penalty 3.
 *   Each mismatch upstream of the seed region incurs penalty 1.
 * - Educational score = 100 * exp(-0.5 * penalty) when PAM is valid, else 0.0.
 */
function scoreWindow(
  targetWindow: string,
  guide: string,
  observedPam: string,
  pamPattern: PamType
): {
  mismatches: number;
  mismatchPositions: number[];
  seedMismatches: number;
  penalty: number;
  pamOk: boolean;
  score: number;
} {
  const guideLen = guide.length;
  const seedStart1Based = Math.max(1, guideLen - 9); // last 10 bases: e.g. 11..20 for 20-nt guide
  const mismatchPositions: number[] = [];
  let seedMismatches = 0;
  let penalty = 0;

  for (let i = 0; i < guideLen; i++) {
    if (targetWindow[i] !== guide[i]) {
      const pos1Based = i + 1;
      mismatchPositions.push(pos1Based);
      if (pos1Based >= seedStart1Based) {
        seedMismatches++;
        penalty += 3;
      } else {
        penalty += 1;
      }
    }
  }

  const pamOk = matchesPam(observedPam, pamPattern);
  const rawScore = pamOk ? 100 * Math.exp(-0.5 * penalty) : 0.0;
  const score = Number(rawScore.toFixed(1));

  return {
    mismatches: mismatchPositions.length,
    mismatchPositions,
    seedMismatches,
    penalty,
    pamOk,
    score,
  };
}

function classifySite(mismatches: number, pamOk: boolean): SiteMatch['category'] {
  if (!pamOk) return 'no-pam';
  if (mismatches === 0) return 'on-target';
  if (mismatches <= 2) return 'near-match';
  return 'high-mismatch';
}

/**
 * Runs deterministic CRISPR-Cas9 guide RNA matching on both forward (+) and reverse (-) strands.
 *
 * Matching logic:
 * 1. Slide a window of length `guide.length` along the 5'->3' strand where `pamLength` bases remain 3' of the window.
 * 2. Compute Hamming distance (mismatch count) between the target window and the guide.
 * 3. Retain all candidate sites with `mismatches <= maxMm` (including sites lacking a valid PAM,
 *    which receive `pamOk = false` and `score = 0.0` for educational comparison).
 * 4. For reverse complement (-) strand hits, map coordinates back to 1-based original forward strand:
 *    - An index `k` (0-based) on `rcDna` corresponds to 1-based position `L - k` on the original strand.
 *    - Target window `[i .. i + G - 1]` on `rcDna` maps to `[L - (i + G - 1) .. L - i]` on original strand.
 *    - Cut site is 3 bp upstream of the PAM: `end - 3` on (+), `start + 2` on (-).
 */
export function analyzeGuideAgainstDna(
  dna: string,
  guide: string,
  pamPattern: PamType = 'NGG',
  maxMm: number = 4
): GuideAnalysisResult {
  const L = dna.length;
  const G = guide.length;
  const P = pamPattern.length;
  const sites: SiteMatch[] = [];

  // 1. Scan forward (+) strand
  for (let i = 0; i <= L - G - P; i++) {
    const windowSeq = dna.slice(i, i + G);
    const observedPam = dna.slice(i + G, i + G + P);
    const evalResult = scoreWindow(windowSeq, guide, observedPam, pamPattern);

    if (evalResult.mismatches <= maxMm) {
      const start = i + 1;
      const end = i + G;
      const pamStart = i + G + 1;
      const pamEnd = i + G + P;
      // Cut site = 3 bp before PAM (between end-3 and end-2 -> "cut after end-3")
      const cut = end - 3;

      sites.push({
        strand: '+',
        start,
        end,
        targetSeq: windowSeq,
        guideSeq: guide,
        mismatches: evalResult.mismatches,
        mismatchPositions: evalResult.mismatchPositions,
        seedMismatches: evalResult.seedMismatches,
        penalty: evalResult.penalty,
        pam: observedPam,
        pamStart,
        pamEnd,
        pamOk: evalResult.pamOk,
        score: evalResult.score,
        cut,
        category: classifySite(evalResult.mismatches, evalResult.pamOk),
      });
    }
  }

  // 2. Scan reverse complement (-) strand
  const rcDna = reverseComplement(dna);
  for (let i = 0; i <= L - G - P; i++) {
    const windowSeq = rcDna.slice(i, i + G);
    const observedPam = rcDna.slice(i + G, i + G + P);
    const evalResult = scoreWindow(windowSeq, guide, observedPam, pamPattern);

    if (evalResult.mismatches <= maxMm) {
      // Map 0-based rcDna range [i, i + G - 1] back to 1-based original forward strand
      const start = L - (i + G - 1);
      const end = L - i;
      // PAM sits at [i + G, i + G + P - 1] on rcDna -> [L - (i + G + P - 1), L - (i + G)] on original strand
      const pamStart = L - (i + G + P - 1);
      const pamEnd = L - (i + G);
      // 3 bp before PAM on (-) strand: cut occurs between start+2 and start+3 ("cut after start+2")
      const cut = start + 2;

      sites.push({
        strand: '-',
        start,
        end,
        targetSeq: windowSeq,
        guideSeq: guide,
        mismatches: evalResult.mismatches,
        mismatchPositions: evalResult.mismatchPositions,
        seedMismatches: evalResult.seedMismatches,
        penalty: evalResult.penalty,
        pam: observedPam,
        pamStart,
        pamEnd,
        pamOk: evalResult.pamOk,
        score: evalResult.score,
        cut,
        category: classifySite(evalResult.mismatches, evalResult.pamOk),
      });
    }
  }

  // Sort by highest educational score first, then valid PAM, then fewest mismatches, then genomic coordinate
  sites.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.pamOk !== b.pamOk) return a.pamOk ? -1 : 1;
    if (a.mismatches !== b.mismatches) return a.mismatches - b.mismatches;
    return a.start - b.start;
  });

  const validPamSites = sites.filter((s) => s.pamOk);
  const perfectMatches = validPamSites.filter((s) => s.mismatches === 0).length;
  const bestScore = validPamSites.length > 0 ? validPamSites[0].score : 0.0;

  return {
    guide,
    sites,
    summary: {
      totalSites: sites.length,
      validPamSites: validPamSites.length,
      perfectMatches,
      bestScore,
    },
  };
}

/**
 * Generates an illustration-only hypothetical 1-bp deletion and 1-bp insertion
 * immediately at the predicted Cas9 double-strand cut site.
 *
 * `cut` is 1-based: cleavage occurs immediately after base `cut` (between `cut` and `cut + 1`).
 */
export function simulateHypotheticalEdit(
  dna: string,
  cut: number,
  strand: Strand = '+',
  insertedBase: string = 'A'
): HypotheticalEditResult {
  const safeBase = ['A', 'C', 'G', 'T'].includes(insertedBase.toUpperCase())
    ? insertedBase.toUpperCase()
    : 'A';

  const clampedCut = Math.max(1, Math.min(dna.length - 1, Math.floor(cut)));

  // 1-bp deletion deletes the base immediately 3' of the cut (1-based index clampedCut + 1)
  const deletedBase = dna[clampedCut] ?? dna[clampedCut - 1];
  const deletionFull = dna.slice(0, clampedCut) + dna.slice(clampedCut + 1);

  // 1-bp insertion inserts 1 synthetic base right at the cut junction (after clampedCut)
  const insertionFull = dna.slice(0, clampedCut) + safeBase + dna.slice(clampedCut);

  // Extract a readable 30-bp local window centered on the cut
  const windowRadius = 15;
  const start0 = Math.max(0, clampedCut - windowRadius);
  const end0 = Math.min(dna.length, clampedCut + windowRadius);

  const originalContext = dna.slice(start0, end0);
  const localCutOffset = clampedCut - start0;
  const deletionContext =
    originalContext.slice(0, localCutOffset) + originalContext.slice(localCutOffset + 1);
  const insertionContext =
    originalContext.slice(0, localCutOffset) + safeBase + originalContext.slice(localCutOffset);

  return {
    cut: clampedCut,
    strand,
    insertedBase: safeBase,
    contextStart: start0 + 1,
    contextEnd: end0,
    originalContext,
    deletionContext,
    deletedBase,
    insertionContext,
    originalFull: dna,
    deletionFull,
    insertionFull,
    localCutOffset,
    label: 'Illustration only — hypothetical 1-bp NHEJ indel model',
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}
