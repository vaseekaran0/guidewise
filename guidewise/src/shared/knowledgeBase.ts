import { EDUCATIONAL_DISCLAIMER } from './crisprEngine.ts';

export interface KnowledgeEntry {
  id: string;
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
}

/**
 * Curated 32-entry educational CRISPR-Cas9 & GuideWise knowledge base.
 * Strictly educational; contains zero wet-lab protocols, real-gene design, or delivery instructions.
 */
export const CRISPR_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: 'kb-dna-basics',
    topic: 'DNA Basics',
    question: 'What is DNA and what do A, T, G, and C stand for?',
    answer:
      'DNA (deoxyribonucleic acid) is a double-stranded molecule that stores genetic information using four chemical bases: Adenine (A), Thymine (T), Guanine (G), and Cytosine (C). In a double helix, A always pairs with T and G always pairs with C across opposite strands.',
    keywords: ['dna', 'bases', 'adenine', 'thymine', 'guanine', 'cytosine', 'acgt', 'base pair', 'helix'],
  },
  {
    id: 'kb-rna-u-to-t',
    topic: 'RNA vs DNA',
    question: 'Why does GuideWise convert U to T in guide RNA sequences?',
    answer:
      'RNA uses Uracil (U) where DNA uses Thymine (T). When matching a guide RNA sequence against a synthetic DNA strand, U pairs identically to T during Watson-Crick base pairing, so normalizing U to T allows direct character-by-character comparison.',
    keywords: ['uracil', 'u', 't', 'rna', 'thymine', 'convert', 'normalize'],
  },
  {
    id: 'kb-crispr-meaning',
    topic: 'CRISPR Basics',
    question: 'What is CRISPR-Cas9 in simple terms?',
    answer:
      'CRISPR-Cas9 is a molecular tool adapted from a bacterial immune defense system. It pairs a programmable guide RNA (which acts like a molecular address) with the Cas9 protein (which acts like molecular scissors) to locate and cut matching DNA sequences next to a PAM motif.',
    keywords: ['crispr', 'cas9', 'what is', 'basics', 'overview', 'how does', 'scissors'],
  },
  {
    id: 'kb-guide-rna',
    topic: 'Guide RNA',
    question: 'What is a guide RNA (gRNA) and why is it typically 20 bases long?',
    answer:
      'A guide RNA contains a spacer sequence—commonly around 20 nucleotides (15–25 bases in GuideWise)—that is complementary to the target DNA strand. Twenty bases provides a strong balance between specificity in large genomes and reliable Cas9 complex formation.',
    keywords: ['guide rna', 'grna', 'spacer', '20', 'length', '15', '25', 'sgrna'],
  },
  {
    id: 'kb-pam-overview',
    topic: 'PAM Recognition',
    question: 'What is a PAM sequence and why does Cas9 require it?',
    answer:
      'PAM stands for Protospacer Adjacent Motif—a short 3-to-6 base DNA sequence immediately 3\' (downstream) of the target site. Cas9 scans DNA by first colliding with PAM motifs; without a valid PAM, Cas9 cannot unwind the double helix to test guide RNA pairing, so the site scores 0.0.',
    keywords: ['pam', 'protospacer adjacent motif', 'require', 'why', 'ngg', '3 prime', 'downstream'],
  },
  {
    id: 'kb-pam-ngg',
    topic: 'PAM Variants',
    question: 'What does NGG mean in the PAM selector?',
    answer:
      'NGG is the canonical PAM recognized by Streptococcus pyogenes Cas9 (SpCas9). The letter N stands for any of the four DNA bases (A, C, G, or T), followed by two Guanine (G) bases—for example, TGG, AGG, CGG, or GGG.',
    keywords: ['ngg', 'spcas9', 'canonical', 'tgg', 'agg', 'cgg', 'ggg', 'n'],
  },
  {
    id: 'kb-pam-nag',
    topic: 'PAM Variants',
    question: 'What is the NAG PAM option?',
    answer:
      'NAG (any base followed by Adenine and Guanine) is a weaker, non-canonical PAM that SpCas9 can occasionally recognize at much lower efficiency. Including NAG in simulations helps illustrate why off-target searches sometimes check alternate PAM motifs.',
    keywords: ['nag', 'alternate', 'non-canonical', 'weak', 'pam'],
  },
  {
    id: 'kb-pam-nngrrt',
    topic: 'PAM Variants',
    question: 'What is the NNGRRT PAM option?',
    answer:
      'NNGRRT is the 6-base PAM recognized by Staphylococcus aureus Cas9 (SaCas9). Here N is any base (A/C/G/T) and R represents a purine (A or G). Because it is longer and more specific than NGG, NNGRRT sites occur less frequently in random DNA.',
    keywords: ['nngrrt', 'sacas9', 'purine', 'r', 'iupac', '6'],
  },
  {
    id: 'kb-no-pam-score-zero',
    topic: 'PAM Recognition',
    question: 'Why does an exact 0-mismatch match get a score of 0.0 if the PAM is missing?',
    answer:
      'Even if all 20 bases of a target match the guide RNA perfectly (0 mismatches), Cas9 will not bind or cleave DNA stably unless a valid PAM sits immediately 3\' of the target. In the hackathon test vector, site 80–99 has 0 mismatches but PAM TCA, so it is flagged as "no PAM" with score 0.0.',
    keywords: ['tca', '80-99', 'no pam', 'score 0', 'zero', 'exact match', 'missing pam'],
  },
  {
    id: 'kb-seed-region',
    topic: 'Seed Region',
    question: 'What is the CRISPR seed region and why are mismatches there penalized more?',
    answer:
      'The seed region consists of the last 10 bases of the guide RNA closest to the PAM. Cas9 initiates RNA-DNA hybridization right next to the PAM and zippers outward; therefore, mismatches inside the seed strongly disrupt binding (penalty 3 in GuideWise), whereas distal mismatches further from the PAM are more tolerated (penalty 1).',
    keywords: ['seed', 'last 10', 'penalty', '3', 'proximal', 'zipper', 'mismatch'],
  },
  {
    id: 'kb-scoring-formula',
    topic: 'Scoring Formula',
    question: 'How is the educational estimate score calculated in GuideWise?',
    answer:
      'GuideWise computes penalty = (3 × seed mismatches) + (1 × non-seed mismatches), where the seed is the last 10 bases adjacent to the PAM. If the PAM is valid, the educational score is 100 × exp(-0.5 × penalty); if the PAM is invalid, the score is 0.0. This is a simplified educational estimate, not an experimental cleavage prediction.',
    keywords: ['formula', 'score', 'calculate', 'exp', 'penalty', 'math', 'equation', 'educational estimate'],
  },
  {
    id: 'kb-off-target',
    topic: 'Off-Target Effects',
    question: 'What is an off-target site?',
    answer:
      'An off-target site is a DNA region elsewhere in a sequence that resembles the intended guide RNA closely enough (with 1 or more mismatches and an adjacent PAM) that Cas9 might bind or cut it unintendedly. Educational tools highlight off-targets so students learn why guide specificity matters.',
    keywords: ['off-target', 'off target', 'mismatch', 'specificity', 'unintended'],
  },
  {
    id: 'kb-hamming-distance',
    topic: 'Matching Algorithm',
    question: 'How does the sliding-window Hamming distance matcher work?',
    answer:
      'The engine slides a fixed-width window equal to the guide length across both the forward (+) and reverse complement (-) strands. At each position, it counts base differences (Hamming distance) and keeps windows within the user-chosen mismatch threshold.',
    keywords: ['sliding window', 'hamming', 'algorithm', 'matching', 'how', 'engine', 'scan'],
  },
  {
    id: 'kb-reverse-strand',
    topic: 'Strands & Coordinates',
    question: 'Why does GuideWise search both the forward (+) and reverse (-) strands?',
    answer:
      'Because DNA is double-stranded and anti-parallel, a valid PAM and matching protospacer can exist on either the top (5\'→3\' forward) strand or the bottom (reverse complement) strand. All reported start, end, and cut coordinates are mapped back to 1-based positions on the original forward strand.',
    keywords: ['reverse', 'complement', 'strand', 'both strands', 'forward', '+', '-', 'antiparallel'],
  },
  {
    id: 'kb-cut-site',
    topic: 'Cut Site',
    question: 'Where does Cas9 cut the DNA relative to the PAM?',
    answer:
      'Wild-type SpCas9 creates a blunt double-strand break 3 base pairs upstream (before) the PAM inside the target protospacer. For a 20-nt forward target at bases 14–33 with PAM at 34–36, the cut occurs after base 30 (between bases 30 and 31).',
    keywords: ['cut', 'cut site', 'cleavage', 'dsb', '3 bp', 'before pam', 'after 30', 'blunt'],
  },
  {
    id: 'kb-reverse-cut',
    topic: 'Cut Site',
    question: 'How is the cut site calculated on the reverse (-) strand?',
    answer:
      'On the reverse strand, the 5\'→3\' direction runs opposite to the forward strand, so the PAM sits immediately to the left (5\' side) of the forward-mapped window [start..end]. Counting 3 bases into the target from the PAM places the cut after position start + 2 on the original strand.',
    keywords: ['reverse cut', 'cut site', 'start + 2', 'minus strand', 'coordinates'],
  },
  {
    id: 'kb-hypothetical-edit',
    topic: 'Hypothetical Editing',
    question: 'What do the 1-bp insertion and deletion illustrations represent?',
    answer:
      'When a double-strand break occurs in living cells, a repair pathway called Non-Homologous End Joining (NHEJ) often leaves small insertions or deletions (indels). GuideWise illustrates what a single 1-bp deletion or 1-bp insertion right at the cut junction looks like purely as a conceptual sequence illustration.',
    keywords: ['insertion', 'deletion', 'indel', 'nhej', 'hypothetical', 'edit', 'frameshift', 'illustration'],
  },
  {
    id: 'kb-frameshift',
    topic: 'Hypothetical Editing',
    question: 'Why does a 1-bp insertion or deletion cause a frameshift?',
    answer:
      'DNA coding regions are read in triplets of 3 bases called codons. Adding or removing 1 base (not a multiple of 3) shifts every downstream triplet grouping, altering the simulated reading frame from the cut site onward.',
    keywords: ['frameshift', 'codon', 'triplet', 'reading frame', '1 bp', 'mutation'],
  },
  {
    id: 'kb-gc-content',
    topic: 'Sequence Stats',
    question: 'Why does GuideWise show GC% and base counts?',
    answer:
      'GC content is the percentage of Guanine (G) and Cytosine (C) bases in a DNA sequence. Because G-C pairs share three hydrogen bonds (versus two for A-T), GC% influences helix stability and is a standard summary metric in sequence analysis.',
    keywords: ['gc', 'gc%', 'gc content', 'hydrogen bonds', 'stats', 'base count'],
  },
  {
    id: 'kb-fasta-format',
    topic: 'Input Format',
    question: 'What is FASTA format and how does GuideWise parse it?',
    answer:
      'FASTA is a standard text format for biological sequences where lines starting with ">" are descriptive headers and subsequent lines hold the nucleotide letters. GuideWise automatically strips ">" header lines and whitespace before validating A, C, G, and T.',
    keywords: ['fasta', '>', 'header', 'format', 'paste', 'input'],
  },
  {
    id: 'kb-validation-rules',
    topic: 'Input Validation',
    question: 'Why did GuideWise reject my sequence input?',
    answer:
      'GuideWise enforces strict synthetic DNA validation: only A, C, G, T (or U, converted to T) are accepted after stripping FASTA headers and spaces. Synthetic DNA must be at least 30 bases long, and guide RNAs must be 15 to 25 bases long.',
    keywords: ['reject', 'invalid', 'error', 'validation', '30', '15', '25', 'characters'],
  },
  {
    id: 'kb-test-vector',
    topic: 'Built-in Demo',
    question: 'What does the Hackathon Test Vector demonstrate?',
    answer:
      'The built-in positive test vector tests guide GATCCGTAACGGTTCAGCTA against a 110-bp synthetic DNA containing three instructive sites: a 100.0 perfect match at 14–33 (PAM TGG, cut after 30), an off-target with 2 mismatches (positions 4 and 17) scoring 13.5 at 47–66 (PAM AGG, cut after 63), and a 0-mismatch site at 80–99 blocked by missing PAM (TCA, score 0.0).',
    keywords: ['test vector', 'demo', '14-33', '47-66', '13.5', '100', 'gatccgtaacggttcagcta'],
  },
  {
    id: 'kb-3d-colors',
    topic: '3D Simulation',
    question: 'What do the colors in the 3D DNA double helix simulation mean?',
    answer:
      'Individual base spheres follow nucleotide colors (A = pink, T = amber, G = green, C = cyan). During scanning, target sites highlight green (0 mismatches, valid PAM), amber (1–2 mismatches, valid PAM), red (3+ mismatches, valid PAM), or grey (no valid PAM), while valid PAM bases glow violet and mismatched positions flash red.',
    keywords: ['3d', 'colors', 'green', 'amber', 'red', 'violet', 'grey', 'helix', 'cas9 bubble'],
  },
  {
    id: 'kb-reduced-motion',
    topic: 'Accessibility',
    question: 'How does the Reduced Motion option work in the 3D viewer?',
    answer:
      'Enabling Reduced Motion pauses continuous ambient helix rotation and snaps scanning steps cleanly instead of sweeping the camera continuously, making the 3D visualization comfortable for users sensitive to motion.',
    keywords: ['reduced motion', 'accessibility', 'camera', 'motion', 'pause', 'static'],
  },
  {
    id: 'kb-compare-guides',
    topic: 'Comparing Guides',
    question: 'How should I compare multiple guide RNAs on the Compare page?',
    answer:
      'Enter two or more 15–25 bp guide RNAs against the same synthetic DNA. Look for a guide with a 100.0 on-target match and minimal high-scoring off-targets; the visual map plots all candidate sites along the same coordinate ruler so you can inspect overlap and specificity.',
    keywords: ['compare', 'multiple guides', 'ranking', 'best guide', 'specificity'],
  },
  {
    id: 'kb-reports-export',
    topic: 'Reports & Database',
    question: 'Are simulation runs saved and exportable?',
    answer:
      'Yes. Every analysis run is saved locally to the application\'s SQLite database so you can reload past runs on the Reports page and download complete simulation reports as formatted PDF or CSV files containing inputs, scoring formulas, sites, and disclaimers.',
    keywords: ['report', 'pdf', 'csv', 'download', 'save', 'history', 'sqlite', 'database'],
  },
  {
    id: 'kb-limitations',
    topic: 'Scientific Limits',
    question: 'Why are GuideWise scores labelled "educational estimate" instead of real predictions?',
    answer:
      'In real biology, Cas9 efficiency depends on chromatin packing, DNA methylation, RNA secondary structure, cellular repair bias, and genome-wide off-target context—none of which can be captured by a short synthetic string and an exponential mismatch formula. GuideWise teaches the core sequence logic, not wet-lab prediction.',
    keywords: ['limits', 'limitations', 'chromatin', 'accurate', 'real world', 'educational estimate', 'validated'],
  },
  {
    id: 'kb-unreal-note',
    topic: '3D Architecture',
    question: 'Why does GuideWise use Three.js in the browser instead of Unreal Engine?',
    answer:
      'Unreal Engine is a native desktop/cloud renderer and cannot run directly inside standard lightweight offline web browsers. GuideWise uses Three.js with physically based materials, studio environment lighting, and orbit controls for interactive browser simulation; high-resolution offline cinematics could separately be rendered in Unreal Engine.',
    keywords: ['unreal', 'threejs', 'three.js', 'webgl', 'browser', 'rendering'],
  },
  {
    id: 'kb-ethics-biosafety',
    topic: 'Ethics & Safety',
    question: 'What are the ethical and biosafety boundaries of GuideWise?',
    answer:
      'GuideWise is strictly an educational simulator for synthetic DNA sequences. It refuses requests for wet-lab protocols, reagent recipes, delivery vectors, human therapeutic editing instructions, or guide design against real organisms or pathogens.',
    keywords: ['ethics', 'safety', 'biosafety', 'refuse', 'protocol', 'pathogen', 'human', 'synthetic'],
  },
  {
    id: 'kb-on-target-vs-off-target',
    topic: 'Specificity',
    question: 'Why can two guides with 2 mismatches each have very different scores?',
    answer:
      'Position matters: two mismatches outside the seed region produce a penalty of 1 + 1 = 2 (score 36.8), whereas two mismatches inside the 10-bp seed region produce a penalty of 3 + 3 = 6 (score 5.0), and one of each yields penalty 4 (score 13.5).',
    keywords: ['36.8', '5.0', '13.5', 'position', 'difference', 'two mismatches'],
  },
  {
    id: 'kb-target-vs-guide',
    topic: 'Terminology',
    question: 'What is the difference between the protospacer and the PAM?',
    answer:
      'The protospacer is the 15–25 bp DNA sequence that base-pairs with the guide RNA spacer, while the PAM is the separate 3–6 bp motif immediately 3\' of the protospacer that is recognized directly by the Cas9 protein rather than by the guide RNA.',
    keywords: ['protospacer', 'pam', 'difference', 'protein', 'rna', 'terminology'],
  },
  {
    id: 'kb-cas9-conformational',
    topic: 'Mechanism',
    question: 'What happens inside the Cas9 bubble when a PAM and seed match?',
    answer:
      'After Cas9 recognizes the PAM, it locally melts the DNA double helix so the guide RNA can test complementarity starting from the seed region. If pairing proceeds across the target, Cas9 activates its HNH and RuvC nuclease domains to cleave both DNA strands 3 bp upstream of the PAM.',
    keywords: ['hnh', 'ruvc', 'unwind', 'bubble', 'mechanism', 'nuclease', 'cleave'],
  },
];

const REFUSAL_PATTERNS: RegExp[] = [
  /\b(protocol|wet[\s-]?lab|bench|pipette|buffer|reagent|transfection|electroporation|lipofection|microinjection|incubat|culture|media|pcr\s+primer|cloning|gibson|golden\s+gate)\b/i,
  /\b(deliver(y|ing)|lnp|lipid\s+nanoparticle|aav|adenovirus|lentivirus|viral\s+vector|plasmid\s+prep|in\s+vivo|in\s+vitro|therap(y|eutic)|clinical\s+trial|inject(ion|ing))\b/i,
  /\b(pathogen|virus|viral|bacteria|toxin|anthrax|ebola|sars|covid|influenza|hiv|malaria|weapon|bioweapon|gain\s+of\s+function)\b/i,
  /\b(real|actual|living|my\s+own)\s+(gene|genome|cell|organism|dna)s?\b/i,
  /\b(how\s+(do|can|to)\s+i|can\s+i|help\s+me|teach\s+me)\b.{0,30}\b(edit|modify|knock\s?out|cut|alter|change)\b.{0,25}\b(gene|genome|dna|cell|plant|animal|human|crop)s?\b/i,
  /\b(human\s+gene|embryo|germline|brca1|brca2|tp53|ccr5|cftr|hbb|dystrophin|crispr\s+bab(y|ies)|patient|real\s+genome|hg38|grch38|ncbi|ensembl|design\s+a\s+guide\s+for\s+(my|a\s+real|cancer|disease))\b/i,
];

export function isDisallowedSafetyRequest(question: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(question));
}

export function buildRefusalAnswer(): string {
  return [
    'I cannot provide wet-lab protocols, delivery methods, or guide RNA designs for real genes, human genomes, or pathogens.',
    'GuideWise is strictly an educational simulation tool designed exclusively for synthetic DNA sequences and conceptual learning about PAM recognition, mismatch scoring, and hypothetical target comparison.',
    '',
    EDUCATIONAL_DISCLAIMER,
  ].join('\n\n');
}

/**
 * Deterministic keyword & token overlap matcher over the curated 32-entry knowledge base.
 * Used as the primary retrieval step and as an offline/keyless fallback.
 */
const GENERIC_KEYWORDS = new Set(['what is', 'how does', 'why', 'require']);

export function retrieveKnowledgeEntries(question: string, topK = 3): KnowledgeEntry[] {
  const qLower = question.toLowerCase();
  const qTokens = qLower
    .replace(/[^a-z0-9+\- ]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const scored = CRISPR_KNOWLEDGE_BASE.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (GENERIC_KEYWORDS.has(kw)) continue;
      const hit = kw.length <= 2 ? qTokens.includes(kw) : qLower.includes(kw);
      if (hit) {
        score += kw.includes(' ') ? 5 : 3;
      }
    }
    const textBlob = `${entry.topic} ${entry.question} ${entry.answer}`.toLowerCase();
    for (const tok of qTokens) {
      if (textBlob.includes(tok)) {
        score += 1;
      }
    }
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.entry);
}

export function buildDeterministicKbAnswer(
  question: string,
  runContext?: {
    dnaLength?: number;
    pam?: string;
    maxMm?: number;
    guide?: string;
    totalSites?: number;
    bestScore?: number;
  }
): { answer: string; sources: string[] } {
  if (isDisallowedSafetyRequest(question)) {
    return {
      answer: buildRefusalAnswer(),
      sources: ['Ethics & Safety Policy'],
    };
  }

  const matches = retrieveKnowledgeEntries(question, 2);

  // If the user explicitly asks about their current run results
  const asksAboutCurrentRun =
    /\b(my\s+run|current\s+run|this\s+run|my\s+result|my\s+sequence|this\s+score|why\s+did\s+my)\b/i.test(
      question
    );

  const parts: string[] = [];

  if (asksAboutCurrentRun && runContext && runContext.guide) {
    parts.push(
      `Based on your current synthetic simulation (${runContext.dnaLength ?? '?'} bp DNA, guide ${runContext.guide}, PAM ${runContext.pam ?? 'NGG'}, max mismatches ${runContext.maxMm ?? 4}), GuideWise found ${runContext.totalSites ?? 0} candidate site(s) with a top educational estimate score of ${(runContext.bestScore ?? 0).toFixed(1)}.`
    );
  }

  if (matches.length > 0) {
    parts.push(matches[0].answer);
    if (matches.length > 1 && matches[1].id !== matches[0].id) {
      parts.push(`Related note (${matches[1].topic}): ${matches[1].answer}`);
    }
  } else {
    parts.push(
      'GuideWise models CRISPR-Cas9 targeting on synthetic DNA by scanning both strands with a sliding window, checking for an adjacent 3\' PAM motif (NGG, NAG, or NNGRRT), counting seed-weighted mismatches, and illustrating hypothetical cuts 3 bp upstream of the PAM. Try asking about PAMs, the seed region, the scoring formula, cut sites, or the hackathon test vector.'
    );
  }

  parts.push(EDUCATIONAL_DISCLAIMER);

  return {
    answer: parts.join('\n\n'),
    sources: matches.length > 0 ? matches.map((m) => `${m.topic}: ${m.question}`) : ['GuideWise Overview'],
  };
}
