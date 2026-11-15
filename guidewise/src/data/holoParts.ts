export type HoloModelId = 'dna' | 'rna' | 'crispr';
export type HoloLanguage = 'en' | 'ta' | 'tanglish';

export interface HoloPartDef {
  id: string;
  order: number;
  name: string;
  nameTanglish: string;
  category: string;
  calloutTag: string;
  color: string;
  explanation: string;
  explanationTanglish: string;
  keyFact: string;
  keyFactTanglish: string;
  explodeVec: [number, number, number];
  focusOffset: [number, number, number];
}

export interface HoloQuizQuestion {
  id: string;
  question: string;
  questionTanglish: string;
  options: string[];
  optionsTanglish: string[];
  correctIndex: number;
  explanation: string;
  explanationTanglish: string;
}

export interface HoloModelMeta {
  id: HoloModelId;
  title: string;
  titleTanglish: string;
  subtitle: string;
  subtitleTanglish: string;
  parts: HoloPartDef[];
  quiz: HoloQuizQuestion[];
}

export const HOLO_COLORS = {
  A: '#ff5d8f',
  T: '#ffb020',
  G: '#3ddc84',
  C: '#4cc9ff',
  U: '#c084fc',
  cyan: '#22d3ee',
  violet: '#7c5cff',
  selected: '#ff9f1c',
} as const;

export const DNA_VS_RNA_CALLOUTS = [
  {
    id: 'strands',
    title: 'Double Helix vs Single Strand',
    titleTanglish: 'Irattai Surul vs Otrai Izhal',
    detail:
      'DNA uses two antiparallel strands twisted together for long-term stability; RNA uses one flexible strand that can fold into functional shapes.',
    detailTanglish:
      'DNA la rendu strand irukku (long-term stability kaga); RNA oru single strand thaan, athunala athu easy ah fold aagi shapes form pannum.',
    color: '#22d3ee',
  },
  {
    id: 'bases',
    title: 'Thymine (T) vs Uracil (U)',
    titleTanglish: 'Thymine (T) vs Uracil (U)',
    detail:
      'DNA stores code using A, T, G, and C. RNA replaces Thymine (T) with Uracil (U), which still pairs directly with Adenine (A).',
    detailTanglish:
      'DNA la A, T, G, C irukku. RNA la T-ku badhila Uracil (U) use aaguthu, aanalum U-um Adenine (A) kooda thaan pair aagum.',
    color: '#c084fc',
  },
  {
    id: 'sugar',
    title: "Deoxyribose vs Ribose (2'-OH)",
    titleTanglish: "Deoxyribose vs Ribose (2'-OH)",
    detail:
      "DNA's deoxyribose lacks an oxygen atom at carbon 2', making it chemically resilient. RNA's ribose keeps that reactive 2'-OH hydroxyl group.",
    detailTanglish:
      "DNA oda deoxyribose sugar la oru oxygen kuraiva irukum, athunala athu strong. RNA oda ribose la extra 2'-OH irukurathala athu temporary messenger ah work pannum.",
    color: '#ffb020',
  },
];

export const HOLO_MODELS: Record<HoloModelId, HoloModelMeta> = {
  dna: {
    id: 'dna',
    title: 'DNA Double Helix',
    titleTanglish: 'DNA Irattai Surul (Double Helix)',
    subtitle: '14 base pairs · Antiparallel B-form educational hologram',
    subtitleTanglish: '14 base pairs · Antiparallel DNA educational hologram',
    parts: [
      {
        id: 'dna-backbone',
        order: 1,
        name: 'Sugar-phosphate backbone',
        nameTanglish: 'Sugar-Phosphate Backbone (Outer Rails)',
        category: 'Structural Rails',
        calloutTag: 'Alternating sugar + PO4',
        color: '#22d3ee',
        explanation:
          'The two outer rails of the ladder. Sugars and phosphates alternate to hold the strand together and protect the bases.',
        explanationTanglish:
          'Idhu DNA ladder oda rendu outer rails. Sugar-um phosphate-um maari maari connect aagi inner bases ah safe ah protect pannum.',
        keyFact: 'Covalent phosphodiester links form a tough continuous outer scaffold.',
        keyFactTanglish: 'Strong covalent bonds indha outer backbone ah break aagama pudichirukkum.',
        explodeVec: [-4.2, 0.8, 1.4],
        focusOffset: [7.5, 2.2, 9.0],
      },
      {
        id: 'dna-sugar',
        order: 2,
        name: 'Deoxyribose sugar',
        nameTanglish: 'Deoxyribose Sugar (5-Carbon Ring)',
        category: 'Nucleotide Core',
        calloutTag: "No 2'-OH oxygen",
        color: '#38bdf8',
        explanation:
          "A 5-carbon sugar. 'Deoxy' means it has one oxygen fewer than RNA's ribose. That is where the D in DNA comes from.",
        explanationTanglish:
          "Idhu oru 5-carbon pentagon sugar. RNA oda ribose ah vida oru oxygen kuraiva irukurathala idhuku 'Deoxy' nu peru — idhula irundhu thaan DNA la 'D' vandhuchi.",
        keyFact: "Missing the reactive 2'-OH group prevents easy self-cleavage.",
        keyFactTanglish: "2'-OH oxygen illathathala DNA romba naal damage aagama stable ah irukkum.",
        explodeVec: [4.0, 2.1, 2.2],
        focusOffset: [6.0, 2.0, 7.5],
      },
      {
        id: 'dna-phosphate',
        order: 3,
        name: 'Phosphate group',
        nameTanglish: 'Phosphate Group (Negative Charge)',
        category: 'Nucleotide Link',
        calloutTag: 'PO4⁻ negative linker',
        color: '#7c5cff',
        explanation:
          'Links one sugar to the next and gives DNA a negative charge.',
        explanationTanglish:
          'Oru sugar ah adutha sugar kooda join panra linker idhu. Idhu thaan DNA ku negative electrical charge kudukuthu.',
        keyFact: 'A central phosphorus atom surrounded by four oxygen atoms.',
        keyFactTanglish: 'Naduvula oru Phosphorus atom, suthi naalu Oxygen atoms tetrahedron shape la irukkum.',
        explodeVec: [-3.8, -1.6, 2.6],
        focusOffset: [-6.5, 0.5, 8.0],
      },
      {
        id: 'dna-bases',
        order: 4,
        name: 'Nitrogenous bases',
        nameTanglish: 'Nitrogenous Bases (A, T, G, C Letters)',
        category: 'Genetic Alphabet',
        calloutTag: 'Purines + Pyrimidines',
        color: '#ff5d8f',
        explanation:
          'The letters A, T, G and C. The order of the letters is the genetic code.',
        explanationTanglish:
          'A, T, G, C ngira naalu letters thaan idhu. Indha letters oda order thaan uyirinoda genetic code ah store pannuthu.',
        keyFact: 'Purines (A, G) have two rings; pyrimidines (T, C) have one ring.',
        keyFactTanglish: 'Purines (A, G) rendu ring shape; pyrimidines (T, C) oru single ring shape la irukkum.',
        explodeVec: [0.6, 2.8, 3.6],
        focusOffset: [5.5, 2.5, 8.2],
      },
      {
        id: 'dna-at',
        order: 5,
        name: 'A-T pair',
        nameTanglish: 'A-T Base Pair (2 H-Bonds)',
        category: 'Base Pairing',
        calloutTag: '2 hydrogen bonds',
        color: '#ffb020',
        explanation:
          'Adenine pairs with thymine using 2 hydrogen bonds.',
        explanationTanglish:
          'Adenine (A) eppovum Thymine (T) kooda rendu hydrogen bonds moolama pair aagum.',
        keyFact: 'Double-ring Adenine matches single-ring Thymine to keep helix width uniform.',
        keyFactTanglish: 'Periya double-ring A-um chinna single-ring T-um serntha thaan ladder width ore maari irukkum.',
        explodeVec: [3.9, 0.2, -2.5],
        focusOffset: [6.2, 0.8, 6.8],
      },
      {
        id: 'dna-gc',
        order: 6,
        name: 'G-C pair',
        nameTanglish: 'G-C Base Pair (3 H-Bonds)',
        category: 'Base Pairing',
        calloutTag: '3 hydrogen bonds',
        color: '#3ddc84',
        explanation:
          'Guanine pairs with cytosine using 3 hydrogen bonds, so it holds more tightly.',
        explanationTanglish:
          'Guanine (G)-um Cytosine (C)-um moonu hydrogen bonds la pair aagurathala A-T ah vida romba tight ah pudichirukkum.',
        keyFact: 'GC-rich DNA regions require slightly more energy to unzip.',
        keyFactTanglish: 'G-C adhigama irukura idatha pirikka konjam adhiga energy thevai padum.',
        explodeVec: [-3.9, -0.3, -2.8],
        focusOffset: [-6.0, 0.6, 7.2],
      },
      {
        id: 'dna-hbonds',
        order: 7,
        name: 'Hydrogen bonds',
        nameTanglish: 'Hydrogen Bonds (Unzippable Middle)',
        category: 'Center Bridge',
        calloutTag: 'Reversible bridge',
        color: '#c6ff3d',
        explanation:
          'Weak bonds in the middle of the ladder. They hold the two strands together and can be unzipped when the cell reads the DNA.',
        explanationTanglish:
          'Ladder naduvula irukura weak bonds idhu. Renderu strands ah serthu vaikum, aana cell DNA va read panna venumna easy ah zip maari open pannalam.',
        keyFact: 'Individually weak, yet millions together keep chromosomes stable.',
        keyFactTanglish: 'Thaniya paartha weak, aana onna serntha DNA va safe ah hold pannum.',
        explodeVec: [0.0, 0.0, 4.4],
        focusOffset: [4.8, 0.4, 7.2],
      },
      {
        id: 'dna-grooves',
        order: 8,
        name: 'Major and minor groove',
        nameTanglish: 'Major & Minor Groove (Protein Reading Track)',
        category: '3D Geometry',
        calloutTag: '22 Å vs 12 Å spiral gaps',
        color: '#4cc9ff',
        explanation:
          'The two spiral gaps along the helix where proteins touch the bases to read them.',
        explanationTanglish:
          'Helix suthi varumbothu yerpadura rendu spiral gaps idhu. Proteins indha gap vazhiya thaan ullae irukura base letters ah thottu read pannum.',
        keyFact: 'Major groove exposes more chemical edge patterns for sequence recognition.',
        keyFactTanglish: 'Major groove vazhiya thaan Cas9 maari proteins exact sequence ah adaiyalam kaanum.',
        explodeVec: [3.6, -2.2, 1.5],
        focusOffset: [7.2, -1.0, 8.6],
      },
      {
        id: 'dna-ends',
        order: 9,
        name: "5' and 3' ends",
        nameTanglish: "5' and 3' Ends (Antiparallel Direction)",
        category: 'Directionality',
        calloutTag: "5'→3' vs 3'←5'",
        color: '#ff9f1c',
        explanation:
          "The two strands run in opposite directions (antiparallel): one reads 5' to 3', the other 3' to 5'.",
        explanationTanglish:
          "DNA oda rendu strands um opposite direction la run aagum: onnu 5' to 3' pogum, innoru strand 3' to 5' varum.",
        keyFact: "PAM sequences are always specified 5' to 3' immediately downstream of the target.",
        keyFactTanglish: "CRISPR la PAM motif eppovum target ku aduthu 3' side la 5'→3' direction la check aagum.",
        explodeVec: [0.0, 4.1, 0.0],
        focusOffset: [6.4, 4.4, 8.4],
      },
    ],
    quiz: [
      {
        id: 'dna-q1',
        question: 'Why does a G-C base pair hold together more tightly than an A-T pair?',
        questionTanglish: 'A-T pair ah vida G-C pair yen romba tight ah pudichirukkum?',
        options: [
          'G-C forms 3 hydrogen bonds, whereas A-T forms 2',
          'G-C uses covalent bonds across the center',
          'G-C contains Uracil instead of Thymine',
          'G-C lacks phosphate groups',
        ],
        optionsTanglish: [
          'G-C la 3 hydrogen bonds irukku, A-T la 2 thaan irukku',
          'G-C naduvula covalent bond irukku',
          'G-C la Thymine ku badhila Uracil irukku',
          'G-C la phosphate group illa',
        ],
        correctIndex: 0,
        explanation: 'Guanine and Cytosine share 3 hydrogen bonds across the helix center, giving higher thermal stability than 2-bond A-T pairs.',
        explanationTanglish: 'Guanine-um Cytosine-um 3 hydrogen bonds share panrathala 2-bond A-T ah vida adhiga strength irukkum.',
      },
      {
        id: 'dna-q2',
        question: "What does the 'Deoxy' in Deoxyribonucleic Acid refer to?",
        questionTanglish: "Deoxyribonucleic Acid la 'Deoxy' na enna artham?",
        options: [
          'Two extra phosphate rings per base',
          "One fewer oxygen atom on the 5-carbon sugar compared to RNA's ribose",
          'Absence of hydrogen bonds in the minor groove',
          'Running both strands in the same 5’→3’ direction',
        ],
        optionsTanglish: [
          'Oru base ku rendu extra phosphate irukku',
          "RNA oda ribose sugar ah vida 5-carbon sugar la oru oxygen kuraiva irukku",
          'Minor groove la hydrogen bond illa',
          'Rendu strand um ore direction la poguthu',
        ],
        correctIndex: 1,
        explanation: "Deoxyribose lacks the 2'-OH oxygen atom present in ribose, making DNA far more stable for long-term storage.",
        explanationTanglish: "Deoxyribose sugar la 2'-OH oxygen illathathala thaan DNA romba stable ah irukku.",
      },
      {
        id: 'dna-q3',
        question: 'Which feature along the outside of the double helix lets proteins read the base sequence without unzipping it?',
        questionTanglish: 'DNA va unzip pannamaye proteins base letters ah read panna udhavura spiral gap edhu?',
        options: [
          "The 5' cap",
          'The major and minor grooves',
          'The poly-A tail',
          'Tetrahedral phosphate charges',
        ],
        optionsTanglish: [
          "5' cap",
          'Major and minor grooves',
          'Poly-A tail',
          'Phosphate negative charge',
        ],
        correctIndex: 1,
        explanation: 'The major and minor grooves expose distinct chemical edge patterns of each base pair along the spiral.',
        explanationTanglish: 'Major matrum minor grooves vazhiya thaan proteins base edges ah read pannum.',
      },
    ],
  },

  rna: {
    id: 'rna',
    title: 'RNA Strand & Hairpin',
    titleTanglish: 'RNA Single Strand & Hairpin Fold',
    subtitle: 'Single-stranded mRNA architecture with codon frame and stem-loop',
    subtitleTanglish: 'Single-stranded mRNA structure, codon matrum hairpin fold',
    parts: [
      {
        id: 'rna-strand',
        order: 1,
        name: 'Single strand',
        nameTanglish: 'Single Strand (Flexible Architecture)',
        category: 'Architecture',
        calloutTag: '1 unpaired chain',
        color: '#22d3ee',
        explanation:
          'RNA is usually one strand, so it can fold into shapes.',
        explanationTanglish:
          'RNA podhuva oru single strand ah irukkum, athunala adhu thanakku thaane madinju complex shapes ah fold aaga mudiyum.',
        keyFact: 'Single-stranded guide RNAs fold into scaffolds that snap straight into Cas9.',
        keyFactTanglish: 'Single strand ah irukurathala thaan guide RNA Cas9 protein kulla fold aagi fit aaguthu.',
        explodeVec: [-4.0, 0.8, 1.5],
        focusOffset: [8.0, 2.0, 9.5],
      },
      {
        id: 'rna-ribose',
        order: 2,
        name: 'Ribose sugar',
        nameTanglish: "Ribose Sugar (Extra 2'-OH Group)",
        category: 'Nucleotide Core',
        calloutTag: "Reactive 2'-OH",
        color: '#ffb020',
        explanation:
          "Has one extra OH group compared with DNA's deoxyribose, which makes RNA less stable.",
        explanationTanglish:
          "DNA oda deoxyribose ah vida idhula oru extra OH group irukku. Adhu RNA va temporary work ku romba flexible aakum aana DNA alavu stable illa.",
        keyFact: "The 2'-hydroxyl sphere distinguishes every ribose pentagon ring from DNA.",
        keyFactTanglish: "Ribose pentagon mela irukura 2'-OH group thaan RNA va DNA la irundhu differentiate pannuthu.",
        explodeVec: [3.8, 2.2, 2.0],
        focusOffset: [6.4, 2.2, 7.6],
      },
      {
        id: 'rna-phosphate',
        order: 3,
        name: 'Phosphate backbone',
        nameTanglish: 'Phosphate Backbone (Chain Linker)',
        category: 'Structural Rails',
        calloutTag: 'Sugar-to-sugar link',
        color: '#7c5cff',
        explanation:
          'Same job as in DNA: it links the sugars into a chain.',
        explanationTanglish:
          'DNA la panra adhe velai thaan: ribose sugars ah onnoda onnu serthu oru neelamana chain ah maathum.',
        keyFact: 'Links the 3′ carbon of one ribose to the 5′ carbon of the next.',
        keyFactTanglish: 'Oru sugar oda 3′ point ah adutha sugar oda 5′ point kooda connect pannum.',
        explodeVec: [-3.5, -1.8, 2.5],
        focusOffset: [-6.5, 0.2, 7.8],
      },
      {
        id: 'rna-uracil',
        order: 4,
        name: 'Uracil (U)',
        nameTanglish: 'Uracil (U) — Replaces Thymine',
        category: 'RNA Base',
        calloutTag: 'U pairs with A',
        color: '#c084fc',
        explanation:
          'RNA uses U instead of T. U pairs with A.',
        explanationTanglish:
          'RNA la T-ku badhila Uracil (U) use aagum. Idhu DNA la irukura Adenine (A) kooda match aagum.',
        keyFact: 'In GuideWise simulation, entering U automatically converts to T for DNA matching.',
        keyFactTanglish: 'GuideWise simulator la neenga U type panna, DNA match pannumbothu athu automatic ah T ah maaridum.',
        explodeVec: [4.2, -0.2, -1.8],
        focusOffset: [6.0, 0.8, 7.0],
      },
      {
        id: 'rna-bases',
        order: 5,
        name: 'Bases A, U, G, C',
        nameTanglish: 'RNA Bases (A, U, G, C)',
        category: 'Genetic Alphabet',
        calloutTag: 'Exposed pairing edge',
        color: '#ff5d8f',
        explanation:
          'The four letters of RNA.',
        explanationTanglish:
          'RNA oda naalu letters A, U, G matrum C. Single strand la irukurathala indha bases veliya open ah theriyum.',
        keyFact: 'Exposed single-strand bases can hybridize cleanly to unwound target DNA.',
        keyFactTanglish: 'Open ah irukura indha RNA bases thaan target DNA kooda poi pair aagum.',
        explodeVec: [0.5, 2.5, 3.8],
        focusOffset: [5.5, 2.2, 8.2],
      },
      {
        id: 'rna-codon',
        order: 6,
        name: 'Codon',
        nameTanglish: 'Codon (3-Letter Amino Acid Code)',
        category: 'Translation Unit',
        calloutTag: '3-base triplet',
        color: '#c6ff3d',
        explanation:
          'Three letters read together. Each codon stands for one amino acid, the building blocks of proteins.',
        explanationTanglish:
          'Moonu letters ah onna serthu read panrathu oru codon. Ovvoru codon-um protein build panra oru amino acid ah kurikkum.',
        keyFact: 'For example, AUG acts as the classic start signal during protein translation.',
        keyFactTanglish: 'Udhaaranama AUG ngira moonu-letter codon protein seiyaratha start pannum.',
        explodeVec: [0.2, -2.6, 3.8],
        focusOffset: [5.0, -1.2, 7.5],
      },
      {
        id: 'rna-cap',
        order: 7,
        name: "5' cap",
        nameTanglish: "5' Cap (Protective Start Shield)",
        category: 'mRNA Protection',
        calloutTag: "Modified G-cap (5')",
        color: '#3ddc84',
        explanation:
          'A protective cap at the start of messenger RNA.',
        explanationTanglish:
          "Messenger RNA oda aarambathula (5' end) irukura oru safety shield idhu. Enzymes RNA va cut pannama kaappathum.",
        keyFact: 'Helps ribosomes recognize the start of an mRNA transcript.',
        keyFactTanglish: 'Cell ulla irukura ribosome mRNA va adaiyalam kaana indha cap udhavum.',
        explodeVec: [-3.4, 3.6, 0.8],
        focusOffset: [-5.2, 4.0, 7.6],
      },
      {
        id: 'rna-polya',
        order: 8,
        name: 'Poly-A tail',
        nameTanglish: 'Poly-A Tail (Protective Adenine End)',
        category: 'mRNA Protection',
        calloutTag: 'AAA…AAA end guard',
        color: '#ff5d8f',
        explanation:
          'A tail of many A letters that protects the end of messenger RNA.',
        explanationTanglish:
          "Messenger RNA oda mudivula neraya 'A' letters sernthu oru vaal (tail) maari irukkum. Idhu mRNA oda end ah protect pannum.",
        keyFact: 'Longer Poly-A tails keep mRNA transcripts intact longer in the cytoplasm.',
        keyFactTanglish: 'Indha tail perusa irundha mRNA romba neram safe ah velai seiyum.',
        explodeVec: [-2.8, -3.6, -1.2],
        focusOffset: [-4.8, -3.5, 7.8],
      },
      {
        id: 'rna-hairpin',
        order: 9,
        name: 'Hairpin loop',
        nameTanglish: 'Hairpin Loop (Self-Folded Stem)',
        category: 'Secondary Structure',
        calloutTag: 'Self base-pairing fold',
        color: '#4cc9ff',
        explanation:
          'Where the strand folds back and pairs with itself.',
        explanationTanglish:
          'Otrai RNA strand thanakku thaane thirumbi madinju adhe strand kooda pair aagura idam thaan Hairpin Loop.',
        keyFact: 'CRISPR guide RNAs use hairpin stem-loops as handles that lock into Cas9.',
        keyFactTanglish: 'CRISPR guide RNA la irukura indha hairpin loop handle thaan Cas9 protein kulla strong ah lock aagum.',
        explodeVec: [4.2, 2.8, -2.0],
        focusOffset: [6.8, 3.0, 8.0],
      },
    ],
    quiz: [
      {
        id: 'rna-q1',
        question: 'Which nitrogenous base replaces Thymine (T) in RNA?',
        questionTanglish: 'RNA la Thymine (T) ku badhila endha letter use aaguthu?',
        options: ['Guanine (G)', 'Uracil (U)', 'Cytosine (C)', 'Adenine (A)'],
        optionsTanglish: ['Guanine (G)', 'Uracil (U)', 'Cytosine (C)', 'Adenine (A)'],
        correctIndex: 1,
        explanation: 'RNA uses Uracil (U) instead of Thymine (T), and U forms hydrogen bonds with Adenine (A).',
        explanationTanglish: 'RNA la T ku badhila Uracil (U) irukkum, adhu Adenine (A) kooda pair aagum.',
      },
      {
        id: 'rna-q2',
        question: 'How many RNA letters make up one codon?',
        questionTanglish: 'Oru codon la ethana RNA letters irukkum?',
        options: ['2 letters', '3 letters', '5 letters', '20 letters'],
        optionsTanglish: ['2 letters', '3 letters', '5 letters', '20 letters'],
        correctIndex: 1,
        explanation: 'A codon is a triplet of 3 consecutive RNA letters that specifies an amino acid or stop signal.',
        explanationTanglish: 'Moonu (3) RNA letters onna serntha thaan oru codon.',
      },
      {
        id: 'rna-q3',
        question: 'How can a single strand of RNA form a Hairpin Loop?',
        questionTanglish: 'Single strand ah irukura RNA eppadi Hairpin Loop form pannuthu?',
        options: [
          'It folds back and pairs with complementary bases on itself',
          'It borrows a second DNA backbone from the nucleus',
          'The 5’ cap fuses directly to the Poly-A tail covalently',
          'Phosphate groups repel each other into circles',
        ],
        optionsTanglish: [
          'Adhu thirumbi madinju thannoda matra bases koodaye pair aaguthu',
          'DNA la irundhu oru extra strand kadan vaanguthu',
          "5' cap um Poly-A tail um onna ottikkuthu",
          'Phosphate groups ellam circle ah maaruthu',
        ],
        correctIndex: 0,
        explanation: 'Complementary sections along the same RNA chain fold back into an antiparallel stem topped by an unpaired loop.',
        explanationTanglish: 'Ore RNA strand la match aagura parts madinju onnoda onnu pair aagurathala hairpin loop varuthu.',
      },
    ],
  },

  crispr: {
    id: 'crispr',
    title: 'CRISPR-Cas9 Complex',
    titleTanglish: 'CRISPR-Cas9 Molecular Scissors',
    subtitle: 'Bilobed enzyme · Guide RNA R-loop · PAM recognition & cleavage',
    subtitleTanglish: 'Cas9 protein · Guide RNA R-loop · PAM check & cut site',
    parts: [
      {
        id: 'cas9-protein',
        order: 1,
        name: 'Cas9 protein',
        nameTanglish: 'Cas9 Protein (Molecular Scissors)',
        category: 'Enzyme Shell',
        calloutTag: 'RNA-guided nuclease',
        color: '#22d3ee',
        explanation:
          'The molecular scissors. It cuts DNA only where the guide RNA tells it to.',
        explanationTanglish:
          'Idhu thaan molecular scissors. Guide RNA enga kaatutho anga mattum thaan DNA va cut pannum.',
        keyFact: 'Cas9 remains inactive until bound by a guide RNA scaffold.',
        keyFactTanglish: 'Guide RNA vandhu join aagura varaikum Cas9 active aagathu.',
        explodeVec: [0.0, 3.8, -2.5],
        focusOffset: [8.5, 3.4, 11.0],
      },
      {
        id: 'cas9-rec',
        order: 2,
        name: 'REC lobe',
        nameTanglish: 'REC Lobe (Recognition Cradle)',
        category: 'Cas9 Domain',
        calloutTag: 'Target recognition',
        color: '#38bdf8',
        explanation:
          'The recognition lobe. It holds the guide RNA and the target DNA.',
        explanationTanglish:
          'Idhu recognition lobe. Guide RNA-vaiyum target DNA-vaiyum ulla safe ah pudichi match check pannum.',
        keyFact: 'Senses whether the 10-bp seed region next to the PAM matches cleanly.',
        keyFactTanglish: 'PAM pakkathula irukura 10-bp seed region match aagudha nu check panrathula idhu mukkiyam.',
        explodeVec: [-4.2, 2.8, 1.0],
        focusOffset: [-6.8, 3.2, 9.2],
      },
      {
        id: 'cas9-nuc',
        order: 3,
        name: 'NUC lobe',
        nameTanglish: 'NUC Lobe (Nuclease + PAM Reader)',
        category: 'Cas9 Domain',
        calloutTag: 'Cleavage + PAM cleft',
        color: '#7c5cff',
        explanation:
          'The nuclease lobe. It contains the two cutting domains and the part that reads the PAM.',
        explanationTanglish:
          'Idhu nuclease lobe. Rendu cutting domains (HNH, RuvC) matrum PAM check panra part idhukulla thaan irukku.',
        keyFact: 'Houses the PAM-interacting domain, HNH, and RuvC.',
        keyFactTanglish: 'PAM padikkira idam, HNH, RuvC ellam NUC lobe kulla irukku.',
        explodeVec: [-4.0, -2.8, 1.2],
        focusOffset: [-6.6, -2.2, 9.4],
      },
      {
        id: 'cas9-hnh',
        order: 4,
        name: 'HNH domain',
        nameTanglish: 'HNH Cutting Domain (Target Strand)',
        category: 'Catalytic Blade',
        calloutTag: 'Cuts gRNA-bound strand',
        color: '#ff5d8f',
        explanation:
          'Cuts the DNA strand that matches the guide RNA.',
        explanationTanglish:
          'Guide RNA kooda match aana DNA strand ah cut panra kathi (blade) idhu.',
        keyFact: 'Swings into active position only after seed + distal pairing succeeds.',
        keyFactTanglish: 'Guide RNA match aana piragu thaan HNH swing aagi target strand ah cut pannum.',
        explodeVec: [2.6, 2.4, 3.6],
        focusOffset: [5.4, 2.5, 7.6],
      },
      {
        id: 'cas9-ruvc',
        order: 5,
        name: 'RuvC domain',
        nameTanglish: 'RuvC Cutting Domain (Opposite Strand)',
        category: 'Catalytic Blade',
        calloutTag: 'Cuts non-target strand',
        color: '#ffb020',
        explanation:
          'Cuts the other DNA strand.',
        explanationTanglish:
          'DNA oda matra (displaced non-target) strand ah cut panra innoru blade idhu.',
        keyFact: 'Works together with HNH to create a double-strand break.',
        keyFactTanglish: 'HNH-um RuvC-um sernthu rendu strand laiyum cut create pannum.',
        explodeVec: [2.8, -2.6, 3.2],
        focusOffset: [5.4, -2.4, 7.8],
      },
      {
        id: 'cas9-grna',
        order: 6,
        name: 'Guide RNA',
        nameTanglish: 'Guide RNA (20-nt Spacer + Scaffold)',
        category: 'Programmable Guide',
        calloutTag: '~20 nt spacer + handle',
        color: '#c084fc',
        explanation:
          'A short RNA that tells Cas9 where to go. Its spacer (about 20 letters) matches the target. Its scaffold holds on to Cas9.',
        explanationTanglish:
          'Cas9 enga poganum nu vazhi kaatura chinna RNA. Idhoda ~20-letter spacer DNA va thedum; scaffold part Cas9 ah pudichirukkum.',
        keyFact: 'Positions 11–20 near the PAM form the sensitive seed region in GuideWise.',
        keyFactTanglish: 'PAM pakkathula irukura last 10 letters thaan seed region — inga mismatch vandha penalty 3x.',
        explodeVec: [0.4, 3.6, 3.2],
        focusOffset: [6.4, 3.6, 9.0],
      },
      {
        id: 'cas9-pam',
        order: 7,
        name: 'PAM (NGG)',
        nameTanglish: "PAM (NGG) — Cas9's First Checkpoint",
        category: 'Required Signal',
        calloutTag: "Immediate 3' motif",
        color: '#c6ff3d',
        explanation:
          'A short DNA signal right next to the target. Cas9 checks it first. No PAM, no cut.',
        explanationTanglish:
          'Target ku pakkathulaye irukura chinna DNA signal idhu. Cas9 modhalla idha thaan check pannum. PAM illana cut illa!',
        keyFact: 'Without a valid PAM (e.g., TCA instead of NGG), GuideWise assigns educational score 0.0.',
        keyFactTanglish: 'Valid PAM (e.g., TGG/AGG) illana, 0 mismatch irundha kooda score 0.0 thaan.',
        explodeVec: [4.5, 0.2, 2.2],
        focusOffset: [7.6, 0.6, 7.6],
      },
      {
        id: 'cas9-rloop',
        order: 8,
        name: 'Target DNA and R-loop',
        nameTanglish: 'Target DNA & R-Loop (Unwound Bubble)',
        category: 'DNA Duplex',
        calloutTag: 'RNA-DNA hybrid bubble',
        color: '#4cc9ff',
        explanation:
          'The guide RNA pairs with one DNA strand while the other strand is pushed aside.',
        explanationTanglish:
          'Guide RNA oru DNA strand kooda pair aagumbothu, innoru DNA strand pakkathula thalli vidappadum — indha open bubble thaan R-loop.',
        keyFact: 'R-loop unzipping starts at the PAM end and zips forward toward the 5’ spacer tip.',
        keyFactTanglish: 'PAM idathula irundhu thaan DNA unzip aaga aarambikkum.',
        explodeVec: [4.2, -1.2, -2.4],
        focusOffset: [7.5, 0.4, 8.6],
      },
      {
        id: 'cas9-cut',
        order: 9,
        name: 'Cut site',
        nameTanglish: 'Cut Site (3 bp Before PAM)',
        category: 'Cleavage Point',
        calloutTag: '3 bp upstream of PAM',
        color: '#ff4fa3',
        explanation:
          'About 3 base pairs before the PAM, both strands are cut.',
        explanationTanglish:
          'PAM-ku munnadi sariya 3 base pairs thalli rendu DNA strands um cut aagum.',
        keyFact: 'Observe the glowing cleavage & spark animation splitting and rejoining both DNA ends.',
        keyFactTanglish: 'Sparks-oda DNA rendu pieces ah pirinji thirumba join aagura animation ah 3D la paarunga.',
        explodeVec: [1.5, 0.2, 4.6],
        focusOffset: [5.2, 0.6, 6.8],
      },
    ],
    quiz: [
      {
        id: 'crispr-q1',
        question: 'What happens when a site matches the 20-nt guide RNA perfectly (0 mismatches) but lacks a valid PAM?',
        questionTanglish: '20-letter guide RNA perfect ah match aagi, valid PAM mattum illana enna nadakkum?',
        options: [
          'Cas9 still cuts at full efficiency',
          'Cas9 cannot initiate unwinding — no cut (score 0.0)',
          'HNH cuts twice as fast without RuvC',
          'RNA converts into DNA automatically',
        ],
        optionsTanglish: [
          'Cas9 full speed la cut pannum',
          'Cas9 DNA va unzip panna mudiyathu — no cut (score 0.0)',
          'HNH mattum double speed la cut pannum',
          'RNA automatic ah DNA va maaridum',
        ],
        correctIndex: 1,
        explanation: 'Cas9 must recognize a valid PAM (such as NGG) before it can melt the DNA helix and test guide RNA complementarity.',
        explanationTanglish: 'Valid PAM irundha thaan Cas9 DNA va open panni guide RNA va check pannum; illana score 0.0.',
      },
      {
        id: 'crispr-q2',
        question: 'Where does Cas9 make its double-strand cut relative to a valid PAM?',
        questionTanglish: 'Valid PAM pakkathula Cas9 sariya enga DNA va cut pannum?',
        options: [
          'About 3 base pairs before (upstream of) the PAM',
          '15 base pairs after the PAM',
          'Inside the middle of the NGG bases',
          'At the tip of the gRNA scaffold loop',
        ],
        optionsTanglish: [
          'PAM-ku munnadi 3 base pairs thalli',
          'PAM-ku appuram 15 base pairs thalli',
          'NGG letters naduvula',
          'gRNA scaffold tip la',
        ],
        correctIndex: 0,
        explanation: 'Both HNH and RuvC domains cleave 3 base pairs upstream (before) the PAM motif.',
        explanationTanglish: 'HNH matrum RuvC domains PAM-ku 3 bp munnadi rendu strands aiyum cut pannum.',
      },
      {
        id: 'crispr-q3',
        question: 'Which two Cas9 domains perform the DNA cutting?',
        questionTanglish: 'DNA va cut panra rendu Cas9 domains edhu?',
        options: [
          'REC lobe and 5’ cap',
          'HNH domain and RuvC domain',
          'Poly-A tail and ribose ring',
          'Major groove and minor groove',
        ],
        optionsTanglish: [
          'REC lobe matrum 5’ cap',
          'HNH domain matrum RuvC domain',
          'Poly-A tail matrum ribose',
          'Major groove matrum minor groove',
        ],
        correctIndex: 1,
        explanation: 'HNH cuts the target strand paired with guide RNA, while RuvC cuts the displaced non-target DNA strand.',
        explanationTanglish: 'HNH target strand aiyum RuvC opposite strand aiyum cut pannum.',
      },
    ],
  },
};
