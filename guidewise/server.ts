import 'dotenv/config';
import express from 'express';
import path from 'path';
import {
  analyzeGuideAgainstDna,
  computeDnaStats,
  EDUCATIONAL_DISCLAIMER,
  type PamType,
  simulateHypotheticalEdit,
  type Strand,
  SUPPORTED_PAMS,
  validateDnaInput,
  validateGuideInput,
} from './src/shared/crisprEngine.ts';
import { getAllExamples, getRunById, listRuns, saveAnalysisRun } from './server/db.ts';
import { answerEducationalQuestion } from './server/qa.ts';
import { buildCsvReport, buildPdfReportBuffer } from './server/reports.ts';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'GuideWise', disclaimer: EDUCATIONAL_DISCLAIMER });
  });

  // GET /api/examples — built-in positive, negative, and invalid input examples
  app.get('/api/examples', (_req, res) => {
    try {
      const examples = getAllExamples();
      res.json({ examples });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load examples from SQLite database.' });
    }
  });

  // POST /api/analyze — validate synthetic inputs, run deterministic matcher, persist to SQLite
  app.post('/api/analyze', (req, res) => {
    try {
      const { dna: rawDna, guide: singleGuide, guides: multiGuides, pam = 'NGG', max_mm = 4 } = req.body ?? {};

      // Validate DNA
      const dnaCheck = validateDnaInput(typeof rawDna === 'string' ? rawDna : '');
      if (dnaCheck.valid === false) {
        res.status(400).json({ error: dnaCheck.error });
        return;
      }

      // Validate PAM
      const normalizedPam = String(pam).toUpperCase().trim() as PamType;
      if (!(normalizedPam in SUPPORTED_PAMS)) {
        res.status(400).json({
          error: `Unsupported PAM "${pam}". Choose one of: ${Object.keys(SUPPORTED_PAMS).join(', ')}.`,
        });
        return;
      }

      // Validate max_mm
      const maxMmNum = Number(max_mm);
      if (!Number.isInteger(maxMmNum) || maxMmNum < 0 || maxMmNum > 8) {
        res.status(400).json({ error: 'Max mismatches must be an integer between 0 and 8.' });
        return;
      }

      // Collect guide(s)
      const rawGuideList: string[] = Array.isArray(multiGuides)
        ? multiGuides
        : typeof singleGuide === 'string'
        ? [singleGuide]
        : [];

      if (rawGuideList.length === 0) {
        res.status(400).json({ error: 'Provide at least one guide RNA sequence (15-25 bases).' });
        return;
      }
      if (rawGuideList.length > 10) {
        res.status(400).json({ error: 'Compare at most 10 guides in a single run.' });
        return;
      }

      const validatedGuides: string[] = [];
      for (let idx = 0; idx < rawGuideList.length; idx++) {
        const check = validateGuideInput(String(rawGuideList[idx] ?? ''));
        if (check.valid === false) {
          res.status(400).json({
            error: rawGuideList.length > 1 ? `Guide #${idx + 1}: ${check.error}` : check.error,
          });
          return;
        }
        validatedGuides.push(check.sequence);
      }

      const stats = computeDnaStats(dnaCheck.sequence);
      const resultsByGuide = validatedGuides.map((g) =>
        analyzeGuideAgainstDna(dnaCheck.sequence, g, normalizedPam, maxMmNum)
      );

      const runId = saveAnalysisRun(
        dnaCheck.sequence,
        normalizedPam,
        maxMmNum,
        resultsByGuide.map((r) => ({ guide: r.guide, sites: r.sites }))
      );

      res.json({
        runId,
        dna: dnaCheck.sequence,
        pam: normalizedPam,
        max_mm: maxMmNum,
        stats,
        resultsByGuide,
        // Convenience top-level fields for single-guide callers
        guide: resultsByGuide[0].guide,
        sites: resultsByGuide[0].sites,
        summary: resultsByGuide[0].summary,
        disclaimer: EDUCATIONAL_DISCLAIMER,
      });
    } catch (err) {
      res.status(500).json({ error: 'Unexpected error while analyzing synthetic sequences.' });
    }
  });

  // POST /api/simulate-edit — illustration-only hypothetical 1-bp deletion & insertion
  app.post('/api/simulate-edit', (req, res) => {
    try {
      const { dna: rawDna, cut, strand = '+', insertedBase = 'A' } = req.body ?? {};
      const dnaCheck = validateDnaInput(typeof rawDna === 'string' ? rawDna : '');
      if (dnaCheck.valid === false) {
        res.status(400).json({ error: dnaCheck.error });
        return;
      }

      const cutNum = Number(cut);
      if (!Number.isInteger(cutNum) || cutNum < 1 || cutNum >= dnaCheck.sequence.length) {
        res.status(400).json({
          error: `Cut coordinate must be an integer between 1 and ${dnaCheck.sequence.length - 1}.`,
        });
        return;
      }

      const safeStrand: Strand = strand === '-' ? '-' : '+';
      const result = simulateHypotheticalEdit(dnaCheck.sequence, cutNum, safeStrand, String(insertedBase));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to compute hypothetical edit illustration.' });
    }
  });

  // GET /api/runs — list saved analysis history
  app.get('/api/runs', (_req, res) => {
    try {
      const runs = listRuns(50);
      res.json({ runs });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve simulation run history.' });
    }
  });

  // GET /api/runs/:id — retrieve full saved run
  app.get('/api/runs/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid run ID.' });
      return;
    }

    const run = getRunById(id);
    if (!run) {
      res.status(404).json({ error: `Simulation run #${id} not found.` });
      return;
    }

    res.json({
      ...run,
      stats: computeDnaStats(run.dna),
      disclaimer: EDUCATIONAL_DISCLAIMER,
    });
  });

  // GET /api/report/:id.csv
  app.get('/api/report/:id.csv', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid run ID.' });
      return;
    }
    const run = getRunById(id);
    if (!run) {
      res.status(404).json({ error: `Simulation run #${id} not found.` });
      return;
    }

    const csv = buildCsvReport(run);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="guidewise-run-${id}.csv"`);
    res.send(csv);
  });

  // GET /api/report/:id.pdf
  app.get('/api/report/:id.pdf', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid run ID.' });
      return;
    }
    const run = getRunById(id);
    if (!run) {
      res.status(404).json({ error: `Simulation run #${id} not found.` });
      return;
    }

    try {
      const pdfBuffer = await buildPdfReportBuffer(run);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="guidewise-run-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate PDF report.' });
    }
  });

  // POST /api/ask — Grounded CRISPR educational Q&A assistant
  app.post('/api/ask', async (req, res) => {
    try {
      const { question, runContext } = req.body ?? {};
      if (typeof question !== 'string' || question.trim().length < 2) {
        res.status(400).json({ error: 'Please enter a valid question (at least 2 characters).' });
        return;
      }

      const result = await answerEducationalQuestion(question, runContext);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: 'Q&A assistant encountered an unexpected error.' });
    }
  });

  // Mount Vite dev middleware or serve static production build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GuideWise server listening on http://localhost:${PORT}`);
  });
}

startServer();
