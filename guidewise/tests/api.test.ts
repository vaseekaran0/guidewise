import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../server.js';
import { TEST_VECTOR } from '../src/shared/crisprEngine.js';

interface RequestOptions {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
}

interface ResponseResult {
  status: number;
  headers: Record<string, string>;
  json: () => Promise<any>;
  text: () => Promise<string>;
  buffer: () => Promise<Buffer>;
}

function createPipeClient(socketPath: string) {
  return function request(options: RequestOptions): Promise<ResponseResult> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {
        host: 'localhost',
        'user-agent': 'guidewise-test-runner',
        ...options.headers,
      };

      let payload: Buffer | null = null;
      if (options.body !== undefined) {
        if (typeof options.body === 'string') {
          payload = Buffer.from(options.body, 'utf8');
        } else if (Buffer.isBuffer(options.body)) {
          payload = options.body;
        } else {
          payload = Buffer.from(JSON.stringify(options.body), 'utf8');
          headers['content-type'] = headers['content-type'] || 'application/json';
        }
        headers['content-length'] = String(payload.length);
      }

      const req = http.request(
        {
          socketPath,
          path: options.path,
          method: options.method.toUpperCase(),
          headers,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
          res.on('end', () => {
            const fullBuffer = Buffer.concat(chunks);
            const resHeaders: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) {
              if (v !== undefined) {
                resHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
              }
            }

            resolve({
              status: res.statusCode ?? 500,
              headers: resHeaders,
              json: async () => JSON.parse(fullBuffer.toString('utf8')),
              text: async () => fullBuffer.toString('utf8'),
              buffer: async () => fullBuffer,
            });
          });
        }
      );

      req.on('error', reject);
      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  };
}

async function runApiTests() {
  console.log('Starting GuideWise Full API and Integration Test Suite...\n');

  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = await createApp();
  process.env.NODE_ENV = prevEnv;

  const pipeName = `\\\\.\\pipe\\guidewise-test-${Date.now()}`;
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(pipeName, () => resolve());
  });

  const request = createPipeClient(pipeName);
  let passed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`PASS  ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL  ${name}`);
      console.error(err);
      server.close();
      process.exit(1);
    }
  }

  try {
    // 1. Health check
    await test('GET /api/health returns status ok and educational disclaimer', async () => {
      const res = await request({ method: 'GET', path: '/api/health' });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.ok, true);
      assert.equal(json.service, 'GuideWise');
      assert.ok(json.disclaimer.includes('Educational Simulation Only'));
    });

    // 2. Examples endpoint
    await test('GET /api/examples returns positive, negative, and invalid presets', async () => {
      const res = await request({ method: 'GET', path: '/api/examples' });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(Array.isArray(json.examples));
      assert.ok(json.examples.length >= 3);
      const types = json.examples.map((e: any) => e.type);
      assert.ok(types.includes('positive'));
      assert.ok(types.includes('negative'));
      assert.ok(types.includes('invalid'));
    });

    // 3. POST /api/analyze with single guide (Hackathon Test Vector)
    let savedRunId = 0;
    await test('POST /api/analyze matches Hackathon Test Vector correctly and stores run', async () => {
      const res = await request({
        method: 'POST',
        path: '/api/analyze',
        body: {
          dna: TEST_VECTOR.dna,
          guide: TEST_VECTOR.guide,
          pam: 'NGG',
          max_mm: 4,
        },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(typeof data.runId === 'number' && data.runId > 0);
      savedRunId = data.runId;
      assert.equal(data.dna, TEST_VECTOR.dna);
      assert.equal(data.pam, 'NGG');
      assert.equal(data.max_mm, 4);
      assert.ok(Array.isArray(data.sites));
      assert.ok(data.sites.length >= 3);

      // Verify Test Vector site 1
      const s1 = data.sites.find((s: any) => s.start === 14 && s.end === 33);
      assert.ok(s1);
      assert.equal(s1.mismatches, 0);
      assert.equal(s1.score, 100.0);
      assert.equal(s1.cut, 30);
      assert.equal(s1.pam, 'TGG');
      assert.equal(s1.pamOk, true);

      // Verify stats
      assert.equal(data.stats.length, TEST_VECTOR.dna.length);
      assert.ok(data.stats.gcPercent > 0);
    });

    // 4. POST /api/analyze with multiple guides (Comparison mode)
    await test('POST /api/analyze supports multiple guides array (comparison mode)', async () => {
      const guides = [
        TEST_VECTOR.guide,
        'TGGCCATTAGCATGATGCGT',
        'GATCCGTAACGGTTCATCTA',
      ];
      const res = await request({
        method: 'POST',
        path: '/api/analyze',
        body: {
          dna: TEST_VECTOR.dna,
          guides,
          pam: 'NGG',
          max_mm: 4,
        },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.resultsByGuide));
      assert.equal(data.resultsByGuide.length, 3);
      assert.equal(data.resultsByGuide[0].guide, TEST_VECTOR.guide);
    });

    // 5. POST /api/analyze input validations
    await test('POST /api/analyze rejects invalid inputs gracefully', async () => {
      // Empty DNA
      const r1 = await request({
        method: 'POST',
        path: '/api/analyze',
        body: { dna: '', guide: TEST_VECTOR.guide },
      });
      assert.equal(r1.status, 400);

      // Invalid PAM
      const r2 = await request({
        method: 'POST',
        path: '/api/analyze',
        body: { dna: TEST_VECTOR.dna, guide: TEST_VECTOR.guide, pam: 'INVALID_PAM' },
      });
      assert.equal(r2.status, 400);

      // max_mm out of range
      const r3 = await request({
        method: 'POST',
        path: '/api/analyze',
        body: { dna: TEST_VECTOR.dna, guide: TEST_VECTOR.guide, max_mm: 12 },
      });
      assert.equal(r3.status, 400);

      // Guide length too short (<15)
      const r4 = await request({
        method: 'POST',
        path: '/api/analyze',
        body: { dna: TEST_VECTOR.dna, guide: 'ACGTACGT' },
      });
      assert.equal(r4.status, 400);

      // More than 10 guides
      const r5 = await request({
        method: 'POST',
        path: '/api/analyze',
        body: {
          dna: TEST_VECTOR.dna,
          guides: new Array(11).fill(TEST_VECTOR.guide),
        },
      });
      assert.equal(r5.status, 400);
    });

    // 6. POST /api/simulate-edit
    await test('POST /api/simulate-edit produces 1-bp deletion & insertion around cut', async () => {
      const res = await request({
        method: 'POST',
        path: '/api/simulate-edit',
        body: {
          dna: TEST_VECTOR.dna,
          cut: 30,
          strand: '+',
          insertedBase: 'G',
        },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.cut, 30);
      assert.equal(data.insertedBase, 'G');
      assert.equal(data.deletionFull.length, TEST_VECTOR.dna.length - 1);
      assert.equal(data.insertionFull.length, TEST_VECTOR.dna.length + 1);
      assert.ok(data.label.includes('Illustration only'));
      assert.ok(data.disclaimer.includes('Educational Simulation Only'));
    });

    // 7. GET /api/runs
    await test('GET /api/runs returns list of saved simulation runs', async () => {
      const res = await request({ method: 'GET', path: '/api/runs' });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.runs));
      assert.ok(data.runs.length >= 1);
      const latest = data.runs.find((r: any) => r.id === savedRunId);
      assert.ok(latest);
      assert.equal(latest.pam, 'NGG');
    });

    // 8. GET /api/runs/:id
    await test('GET /api/runs/:id returns full detail of specific run', async () => {
      const res = await request({ method: 'GET', path: `/api/runs/${savedRunId}` });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, savedRunId);
      assert.equal(data.dna, TEST_VECTOR.dna);
      assert.ok(Array.isArray(data.guides));
      assert.ok(data.guides.length >= 1);
      assert.ok(data.stats);

      // Non-existent ID -> 404
      const res404 = await request({ method: 'GET', path: '/api/runs/999999999' });
      assert.equal(res404.status, 404);

      // Invalid ID -> 400
      const res400 = await request({ method: 'GET', path: '/api/runs/abc' });
      assert.equal(res400.status, 400);
    });

    // 9. GET /api/report/:id.csv
    await test('GET /api/report/:id.csv generates valid CSV report download', async () => {
      const res = await request({ method: 'GET', path: `/api/report/${savedRunId}.csv` });
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type']?.includes('text/csv'));
      const text = await res.text();
      assert.ok(text.includes('# GuideWise Educational CRISPR-Cas9 Simulation Report'));
      assert.ok(text.includes('guide_sequence,strand,start_1based,end_1based'));
      assert.ok(text.includes('GATCCGTAACGGTTCAGCTA'));
    });

    // 10. GET /api/report/:id.pdf
    await test('GET /api/report/:id.pdf generates valid PDF document buffer', async () => {
      const res = await request({ method: 'GET', path: `/api/report/${savedRunId}.pdf` });
      assert.equal(res.status, 200);
      assert.ok(res.headers['content-type']?.includes('application/pdf'));
      const buffer = await res.buffer();
      const header = buffer.subarray(0, 5).toString('utf8');
      assert.equal(header, '%PDF-');
    });

    // 11. POST /api/ask - Educational Q&A and safety refusal
    await test('POST /api/ask answers educational questions and strictly refuses wet-lab protocols', async () => {
      // Valid educational question
      const resOk = await request({
        method: 'POST',
        path: '/api/ask',
        body: { question: 'What is the PAM motif in CRISPR Cas9?' },
      });
      assert.equal(resOk.status, 200);
      const dataOk = await resOk.json();
      assert.ok(dataOk.answer.toLowerCase().includes('pam') || dataOk.answer.toLowerCase().includes('cas9'));
      assert.ok(dataOk.answer.includes('Educational Simulation Only'));

      // Disallowed wet-lab protocol request
      const resRefusal = await request({
        method: 'POST',
        path: '/api/ask',
        body: { question: 'Can you provide a wet lab protocol to transfect cells with CRISPR?' },
      });
      assert.equal(resRefusal.status, 200);
      const dataRefusal = await resRefusal.json();
      assert.equal(dataRefusal.mode, 'safety-refusal');
      assert.ok(dataRefusal.answer.includes('cannot provide wet-lab protocols'));

      // Empty question
      const resBad = await request({
        method: 'POST',
        path: '/api/ask',
        body: { question: ' ' },
      });
      assert.equal(resBad.status, 400);
    });

  } finally {
    server.close();
  }

  console.log(`\nAll ${passed} API integration tests passed successfully!`);
}

runApiTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
