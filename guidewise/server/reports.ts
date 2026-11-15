import PDFDocument from 'pdfkit';
import { computeDnaStats, EDUCATIONAL_DISCLAIMER } from '../src/shared/crisprEngine.ts';
import { type StoredRunDetail } from './db.ts';

function csvEscape(val: string | number | boolean): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsvReport(run: StoredRunDetail): string {
  const stats = computeDnaStats(run.dna);
  const lines: string[] = [];

  lines.push(`# GuideWise Educational CRISPR-Cas9 Simulation Report`);
  lines.push(`# Disclaimer: ${EDUCATIONAL_DISCLAIMER}`);
  lines.push(`# Run ID: ${run.id}`);
  lines.push(`# Created At (UTC): ${run.created_at}`);
  lines.push(`# PAM Pattern: ${run.pam}`);
  lines.push(`# Max Mismatches Allowed: ${run.max_mm}`);
  lines.push(`# Synthetic DNA Length: ${stats.length} bp (GC: ${stats.gcPercent}%, A:${stats.counts.A} T:${stats.counts.T} G:${stats.counts.G} C:${stats.counts.C})`);
  lines.push(`# Scoring Formula (Educational Estimate): score = 100 * exp(-0.5 * penalty) if PAM valid else 0.0; penalty = 3 * seed_mismatches (last 10 bp adjacent to PAM) + 1 * non_seed_mismatches`);
  lines.push(`# Synthetic DNA: ${run.dna}`);
  lines.push('');
  lines.push(
    [
      'guide_sequence',
      'strand',
      'start_1based',
      'end_1based',
      'mismatches',
      'mismatch_positions',
      'observed_pam',
      'pam_valid',
      'educational_estimate_score',
      'cut_after_1based',
    ].join(',')
  );

  for (const g of run.guides) {
    if (g.sites.length === 0) {
      lines.push(
        [csvEscape(g.sequence), 'none', '-', '-', '-', '-', '-', 'false', '0.0', '-'].join(',')
      );
      continue;
    }

    for (const s of g.sites) {
      lines.push(
        [
          csvEscape(g.sequence),
          csvEscape(s.strand),
          s.start,
          s.end,
          s.mismatches,
          csvEscape(s.mismatch_positions.length > 0 ? s.mismatch_positions.join(';') : 'none'),
          csvEscape(s.pam),
          s.pam_ok ? 'true' : 'false',
          s.score.toFixed(1),
          s.cut,
        ].join(',')
      );
    }
  }

  return lines.join('\n');
}

export function buildPdfReportBuffer(run: StoredRunDetail): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 46, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const stats = computeDnaStats(run.dna);

    // Header
    doc
      .fontSize(20)
      .fillColor('#0d3b46')
      .text('GuideWise — Educational CRISPR-Cas9 Simulation Report');
    doc
      .moveDown(0.3)
      .fontSize(9.5)
      .fillColor('#475569')
      .text(`Run #${run.id}  |  Generated: ${new Date(run.created_at).toUTCString()}`);

    // Permanent Disclaimer Box
    doc.moveDown(0.8);
    const discY = doc.y;
    doc.rect(46, discY, doc.page.width - 92, 46).fillAndStroke('#fff7ed', '#fdba74');
    doc
      .fillColor('#9a3412')
      .fontSize(8.5)
      .text(EDUCATIONAL_DISCLAIMER, 56, discY + 10, { width: doc.page.width - 112 });
    doc.y = discY + 56;

    // Inputs & Summary
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#0f172a').text('1. Simulation Inputs & Sequence Statistics');
    doc
      .moveDown(0.3)
      .fontSize(9.5)
      .fillColor('#334155')
      .text(`PAM Motif: ${run.pam}    |    Max Mismatches: ${run.max_mm}    |    DNA Length: ${stats.length} bp`)
      .text(
        `Composition: GC ${stats.gcPercent}% (${stats.gcCount} bp)   |   A: ${stats.counts.A}   T: ${stats.counts.T}   G: ${stats.counts.G}   C: ${stats.counts.C}`
      );

    doc.moveDown(0.4);
    doc.fontSize(9).fillColor('#475569').text('Synthetic DNA Sequence (5\' -> 3\'):');
    doc
      .font('Courier')
      .fontSize(8)
      .fillColor('#0f172a')
      .text(run.dna, { width: doc.page.width - 92 });
    doc.font('Helvetica');

    // Scoring Formula
    doc.moveDown(0.8);
    doc.fontSize(12).fillColor('#0f172a').text('2. Educational Scoring Formula');
    doc
      .moveDown(0.25)
      .fontSize(9)
      .fillColor('#334155')
      .text(
        'Educational Estimate Score = 100 * exp(-0.5 * penalty) when the 3\' PAM motif matches; otherwise 0.0 (no valid PAM).'
      )
      .text(
        'Penalty = (3 * seed mismatches) + (1 * non-seed mismatches), where the seed region is the last 10 bases adjacent to the PAM. Cut site is 3 bp upstream of the PAM (1-based coordinates mapped to the original forward strand).'
      );

    // Results per Guide
    doc.moveDown(0.8);
    doc.fontSize(12).fillColor('#0f172a').text('3. Candidate Target Sites');

    for (const g of run.guides) {
      doc.moveDown(0.5);
      doc
        .fontSize(10.5)
        .fillColor('#0d3b46')
        .text(`Guide RNA (5'->3'): `, { continued: true })
        .font('Courier')
        .text(g.sequence)
        .font('Helvetica');

      if (g.sites.length === 0) {
        doc
          .moveDown(0.2)
          .fontSize(9)
          .fillColor('#64748b')
          .text(`No candidate sites found within <= ${run.max_mm} mismatches.`);
        continue;
      }

      doc.moveDown(0.3);
      // Table Header
      const colX = [46, 86, 152, 196, 286, 350, 422, 488];
      const headerY = doc.y;
      doc.rect(46, headerY, doc.page.width - 92, 18).fill('#f1f5f9');
      doc.fontSize(8).fillColor('#0f172a');
      doc.text('Strand', colX[0] + 4, headerY + 5);
      doc.text('Range (1b)', colX[1], headerY + 5);
      doc.text('MM', colX[2], headerY + 5);
      doc.text('MM Pos', colX[3], headerY + 5);
      doc.text('PAM', colX[4], headerY + 5);
      doc.text('PAM Status', colX[5], headerY + 5);
      doc.text('Est. Score', colX[6], headerY + 5);
      doc.text('Cut After', colX[7], headerY + 5);
      doc.y = headerY + 20;

      for (const s of g.sites) {
        if (doc.y > doc.page.height - 70) {
          doc.addPage();
        }
        const rowY = doc.y;
        doc.fontSize(8.2).fillColor('#1e293b');
        doc.text(s.strand === '+' ? '+ (fwd)' : '- (rev)', colX[0] + 4, rowY);
        doc.text(`${s.start}-${s.end}`, colX[1], rowY);
        doc.text(String(s.mismatches), colX[2], rowY);
        doc.text(
          s.mismatch_positions.length > 0 ? s.mismatch_positions.join(', ') : 'None',
          colX[3],
          rowY,
          { width: 84 }
        );
        doc.font('Courier').text(s.pam, colX[4], rowY).font('Helvetica');
        doc.text(s.pam_ok ? 'Valid' : 'No PAM', colX[5], rowY);
        doc.text(s.score.toFixed(1), colX[6], rowY);
        doc.text(s.pam_ok ? String(s.cut) : 'N/A', colX[7], rowY);
        doc.y = Math.max(doc.y, rowY + 15);
        doc
          .moveTo(46, doc.y - 2)
          .lineTo(doc.page.width - 46, doc.y - 2)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();
      }
    }

    doc.end();
  });
}
