import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeGuideAgainstDna, type PamType, type SiteMatch, TEST_VECTOR } from '../src/shared/crisprEngine.ts';

let dataDir = path.resolve(process.cwd(), 'data');
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.accessSync(dataDir, fs.constants.W_OK);
} catch {
  dataDir = path.join(os.tmpdir(), 'guidewise-data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const DB_PATH = path.join(dataDir, 'guidewise.db');
// Built-in SQLite (Node 22.13+ / 24): no native compile step, works offline.
const raw = new DatabaseSync(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
const db = {
  exec: (sql: string) => raw.exec(sql),
  prepare: (sql: string): any => raw.prepare(sql),
  transaction: <T>(fn: () => T) => () => {
    raw.exec('BEGIN');
    try {
      const result = fn();
      raw.exec('COMMIT');
      return result;
    } catch (err) {
      raw.exec('ROLLBACK');
      throw err;
    }
  },
};

// Initialize required SQLite schema
db.exec(`
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    dna TEXT NOT NULL,
    pam TEXT NOT NULL,
    max_mm INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    sequence TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guide_id INTEGER NOT NULL,
    strand TEXT NOT NULL,
    start INTEGER NOT NULL,
    end INTEGER NOT NULL,
    mismatches INTEGER NOT NULL,
    mismatch_positions TEXT NOT NULL,
    pam TEXT NOT NULL,
    pam_ok INTEGER NOT NULL,
    score REAL NOT NULL,
    cut INTEGER NOT NULL,
    FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    dna TEXT NOT NULL,
    guide TEXT NOT NULL,
    pam TEXT NOT NULL DEFAULT 'NGG',
    max_mm INTEGER NOT NULL DEFAULT 4,
    notes TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS qa_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export interface ExampleRow {
  id: number;
  name: string;
  type: 'positive' | 'negative' | 'invalid';
  dna: string;
  guide: string;
  pam: PamType;
  max_mm: number;
  notes: string;
}

export interface RunSummaryRow {
  id: number;
  created_at: string;
  dna_length: number;
  pam: PamType;
  max_mm: number;
  guide_count: number;
  guides: string;
  total_sites: number;
  best_score: number;
}

export interface StoredRunDetail {
  id: number;
  created_at: string;
  dna: string;
  pam: PamType;
  max_mm: number;
  guides: Array<{
    id: number;
    sequence: string;
    sites: Array<{
      id: number;
      strand: '+' | '-';
      start: number;
      end: number;
      mismatches: number;
      mismatch_positions: number[];
      pam: string;
      pam_ok: boolean;
      score: number;
      cut: number;
    }>;
  }>;
}

function seedExamplesIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM examples').get() as { cnt: number };
  if (row.cnt > 0) return;

  const insert = db.prepare(
    'INSERT INTO examples (name, type, dna, guide, pam, max_mm, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const seedData: Array<Omit<ExampleRow, 'id'>> = [
    {
      name: 'Positive Demo: Hackathon Test Vector',
      type: 'positive',
      dna: TEST_VECTOR.dna,
      guide: TEST_VECTOR.guide,
      pam: 'NGG',
      max_mm: 4,
      notes:
        'Official HTH-SW-02 test vector: 14-33 (0 mm, PAM TGG, score 100.0, cut after 30), 47-66 (2 mm at 4 & 17, PAM AGG, score 13.5, cut after 63), and 80-99 (0 mm, PAM TCA = no PAM, score 0.0).',
    },
    {
      name: 'Positive Demo: Bidirectional Synthetic Reporter',
      type: 'positive',
      dna: 'GCATGCTAGCTAGTCGATCCGTAACGGTTCAGCTACGGATTCAGGCTAAACTAGCTAGGTACGTATCGATGCTTAGCTGAACCGTTACGGATCATTGCATCGATCG',
      guide: 'GATCCGTAACGGTTCAGCTA',
      pam: 'NGG',
      max_mm: 3,
      notes:
        'Synthetic duplex containing a forward (+) target with CGG PAM (0 mismatches, score 100.0) and a reverse (-) strand inverted target with CCN/NGG PAM on the opposite strand.',
    },
    {
      name: 'Negative Demo: Missing PAM & High Mismatch',
      type: 'negative',
      dna: 'ATTGCCTAGCTGATCGATCCGTAACGGTTCAGCTATCATTGGCCATGATGCGTAATGATTCATCTAAGGTTACGGTACGCATGCATCGTACGTAGCTAGCTA',
      guide: 'GATCCGTAACGGTTCAGCTA',
      pam: 'NGG',
      max_mm: 4,
      notes:
        'Negative control: contains an exact 0-mismatch sequence followed by TCA (no NGG PAM -> score 0.0) and a 4-mismatch off-target with low score.',
    },
    {
      name: 'Invalid Input Demo: Unsupported Characters',
      type: 'invalid',
      dna: 'ATTGCCATGACTAGATCCGTAACGGTTCAGCTATGGCCAT123XYZINVALIDCHARS',
      guide: 'GATCCGTAACGGTTCAGCTA',
      pam: 'NGG',
      max_mm: 4,
      notes:
        'Tests strict bioinformatics validator: numbers and non-ACGTU characters (1, 2, 3, X, Y, Z, I, N, V, L, D, H, R, S) are rejected with an actionable error.',
    },
  ];

  const tx = db.transaction(() => {
    for (const item of seedData) {
      insert.run(item.name, item.type, item.dna, item.guide, item.pam, item.max_mm, item.notes);
    }
  });
  tx();
}

seedExamplesIfEmpty();

function seedDefaultRunIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM runs').get() as { cnt: number };
  if (row.cnt > 0) return;

  const analysis = analyzeGuideAgainstDna(
    TEST_VECTOR.dna,
    TEST_VECTOR.guide,
    TEST_VECTOR.pam,
    TEST_VECTOR.maxMm
  );
  saveAnalysisRun(TEST_VECTOR.dna, TEST_VECTOR.pam, TEST_VECTOR.maxMm, [
    { guide: analysis.guide, sites: analysis.sites },
  ]);
}

export function getAllExamples(): ExampleRow[] {
  return db.prepare('SELECT * FROM examples ORDER BY id ASC').all() as ExampleRow[];
}

export function saveAnalysisRun(
  dna: string,
  pam: PamType,
  maxMm: number,
  guideResults: Array<{ guide: string; sites: SiteMatch[] }>
): number {
  const createdAt = new Date().toISOString();
  const insertRun = db.prepare('INSERT INTO runs (created_at, dna, pam, max_mm) VALUES (?, ?, ?, ?)');
  const insertGuide = db.prepare('INSERT INTO guides (run_id, sequence) VALUES (?, ?)');
  const insertSite = db.prepare(`
    INSERT INTO sites (guide_id, strand, start, end, mismatches, mismatch_positions, pam, pam_ok, score, cut)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const runInfo = insertRun.run(createdAt, dna, pam, maxMm);
    const runId = Number(runInfo.lastInsertRowid);

    for (const gr of guideResults) {
      const guideInfo = insertGuide.run(runId, gr.guide);
      const guideId = Number(guideInfo.lastInsertRowid);

      for (const s of gr.sites) {
        insertSite.run(
          guideId,
          s.strand,
          s.start,
          s.end,
          s.mismatches,
          JSON.stringify(s.mismatchPositions),
          s.pam,
          s.pamOk ? 1 : 0,
          s.score,
          s.cut
        );
      }
    }

    return runId;
  });

  return tx();
}

seedDefaultRunIfEmpty();

export function listRuns(limit = 50): RunSummaryRow[] {
  return db
    .prepare(
      `
      SELECT
        r.id,
        r.created_at,
        LENGTH(r.dna) as dna_length,
        r.pam,
        r.max_mm,
        COUNT(DISTINCT g.id) as guide_count,
        GROUP_CONCAT(DISTINCT g.sequence) as guides,
        COUNT(s.id) as total_sites,
        COALESCE(MAX(s.score), 0.0) as best_score
      FROM runs r
      LEFT JOIN guides g ON g.run_id = r.id
      LEFT JOIN sites s ON s.guide_id = g.id
      GROUP BY r.id
      ORDER BY r.id DESC
      LIMIT ?
    `
    )
    .all(limit) as RunSummaryRow[];
}

export function getRunById(runId: number): StoredRunDetail | null {
  const runRow = db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as
    | { id: number; created_at: string; dna: string; pam: PamType; max_mm: number }
    | undefined;

  if (!runRow) return null;

  const guideRows = db.prepare('SELECT id, sequence FROM guides WHERE run_id = ? ORDER BY id ASC').all(runId) as Array<{
    id: number;
    sequence: string;
  }>;

  const selectSites = db.prepare('SELECT * FROM sites WHERE guide_id = ? ORDER BY score DESC, start ASC');

  const guides = guideRows.map((g) => {
    const rawSites = selectSites.all(g.id) as Array<{
      id: number;
      strand: '+' | '-';
      start: number;
      end: number;
      mismatches: number;
      mismatch_positions: string;
      pam: string;
      pam_ok: number;
      score: number;
      cut: number;
    }>;

    return {
      id: g.id,
      sequence: g.sequence,
      sites: rawSites.map((s) => ({
        id: s.id,
        strand: s.strand,
        start: s.start,
        end: s.end,
        mismatches: s.mismatches,
        mismatch_positions: JSON.parse(s.mismatch_positions) as number[],
        pam: s.pam,
        pam_ok: s.pam_ok === 1,
        score: s.score,
        cut: s.cut,
      })),
    };
  });

  return {
    id: runRow.id,
    created_at: runRow.created_at,
    dna: runRow.dna,
    pam: runRow.pam,
    max_mm: runRow.max_mm,
    guides,
  };
}

export function logQaInteraction(question: string, answer: string): void {
  db.prepare('INSERT INTO qa_log (question, answer, created_at) VALUES (?, ?, ?)').run(
    question,
    answer,
    new Date().toISOString()
  );
}
