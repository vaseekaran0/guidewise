import assert from 'node:assert/strict';
import {
  analyzeGuideAgainstDna,
  computeDnaStats,
  EDUCATIONAL_DISCLAIMER,
  matchesPam,
  parseFastaOrPlain,
  reverseComplement,
  simulateHypotheticalEdit,
  TEST_VECTOR,
  validateDnaInput,
  validateGuideInput,
} from '../src/shared/crisprEngine.js';
import { buildDeterministicKbAnswer, isDisallowedSafetyRequest } from '../src/shared/knowledgeBase.js';

function runTests() {
  let passed = 0;
  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`PASS  ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL  ${name}`);
      throw err;
    }
  }

  test('Official Hackathon Test Vector reproduces exact coordinates, mismatches, PAMs, scores, and cut sites', () => {
    const dnaCheck = validateDnaInput(TEST_VECTOR.dna);
    assert.equal(dnaCheck.valid, true);
    const guideCheck = validateGuideInput(TEST_VECTOR.guide);
    assert.equal(guideCheck.valid, true);

    const result = analyzeGuideAgainstDna(TEST_VECTOR.dna, TEST_VECTOR.guide, TEST_VECTOR.pam, TEST_VECTOR.maxMm);
    const fwdSites = result.sites.filter((s) => s.strand === '+');

    assert.equal(fwdSites.length, 3, 'Expected exactly 3 forward-strand sites in test vector');

    // Site 1: 14-33, 0 mismatches, PAM TGG, score 100.0, cut after 30
    const s1 = fwdSites.find((s) => s.start === 14 && s.end === 33);
    assert.ok(s1, 'Expected site 14-33');
    assert.equal(s1.mismatches, 0);
    assert.deepEqual(s1.mismatchPositions, []);
    assert.equal(s1.pam, 'TGG');
    assert.equal(s1.pamOk, true);
    assert.equal(s1.score, 100.0);
    assert.equal(s1.cut, 30);

    // Site 2: 47-66, 2 mismatches (guide letters 4 and 17), PAM AGG, score 13.5, cut after 63
    const s2 = fwdSites.find((s) => s.start === 47 && s.end === 66);
    assert.ok(s2, 'Expected site 47-66');
    assert.equal(s2.mismatches, 2);
    assert.deepEqual(s2.mismatchPositions, [4, 17]);
    assert.equal(s2.pam, 'AGG');
    assert.equal(s2.pamOk, true);
    assert.equal(s2.score, 13.5);
    assert.equal(s2.cut, 63);

    // Site 3: 80-99, 0 mismatches, PAM TCA = no PAM, score 0.0
    const s3 = fwdSites.find((s) => s.start === 80 && s.end === 99);
    assert.ok(s3, 'Expected site 80-99');
    assert.equal(s3.mismatches, 0);
    assert.equal(s3.pam, 'TCA');
    assert.equal(s3.pamOk, false);
    assert.equal(s3.score, 0.0);
  });

  test('FASTA header stripping and U -> T conversion', () => {
    const raw = `>synthetic_target_01\nAUGC augc\nTTTTccccGGGGaaaa`;
    assert.equal(parseFastaOrPlain(raw), 'ATGCATGCTTTTCCCCGGGGAAAA');

    const guideU = validateGuideInput('GAUCCGUAACGGUUCAGCUA');
    assert.equal(guideU.valid, true);
    if (guideU.valid) {
      assert.equal(guideU.sequence, 'GATCCGTAACGGTTCAGCTA');
    }
  });

  test('Strict validation rejects invalid characters, short DNA, and out-of-range guide lengths', () => {
    const badChars = validateDnaInput('ATTGCCATGACTAGATCCGTAACGGTTCAGCTA123XYZ');
    assert.equal(badChars.valid, false);

    const shortDna = validateDnaInput('ACGTACGTACGT');
    assert.equal(shortDna.valid, false);

    const shortGuide = validateGuideInput('ACGTACGTACGTAC'); // 14
    assert.equal(shortGuide.valid, false);

    const longGuide = validateGuideInput('ACGTACGTACGTACGTACGTACGTAC'); // 26
    assert.equal(longGuide.valid, false);
  });

  test('Reverse complement (-) strand matching, 1-based coordinate mapping, and cut site', () => {
    const guide = 'GATCCGTAACGGTTCAGCTA'; // 20 nt
    const pam = 'AGG';
    const rcTargetAndPam = reverseComplement(guide + pam); // 5'-CCT + revcomp(guide)-3'
    const dna = 'AAAAAAAAAA' + rcTargetAndPam + 'TTTTTTTTTT'; // length = 10 + 23 + 10 = 43

    const res = analyzeGuideAgainstDna(dna, guide, 'NGG', 0);
    assert.equal(res.sites.length, 1);
    const hit = res.sites[0];
    assert.equal(hit.strand, '-');
    assert.equal(hit.pam, 'AGG');
    assert.equal(hit.pamOk, true);
    assert.equal(hit.score, 100.0);
    // PAM on + strand is 11..13 (CCT), target on + strand is 14..33
    assert.equal(hit.pamStart, 11);
    assert.equal(hit.pamEnd, 13);
    assert.equal(hit.start, 14);
    assert.equal(hit.end, 33);
    // 3 bp into protospacer from PAM (14,15,16) -> cut after 16
    assert.equal(hit.cut, 16);
  });

  test('PAM matching supports NGG, NAG, and NNGRRT', () => {
    assert.equal(matchesPam('TGG', 'NGG'), true);
    assert.equal(matchesPam('TAG', 'NGG'), false);
    assert.equal(matchesPam('TAG', 'NAG'), true);
    assert.equal(matchesPam('TTGAGT', 'NNGRRT'), true);
    assert.equal(matchesPam('TTAAGT', 'NNGRRT'), false); // 3rd base must be G
    assert.equal(matchesPam('TTGGGT', 'NNGRRT'), true);
    assert.equal(matchesPam('TTGGGC', 'NNGRRT'), false); // 6th base must be T
  });

  test('Hypothetical 1-bp deletion and 1-bp insertion around cut site', () => {
    const edit = simulateHypotheticalEdit(TEST_VECTOR.dna, 30, '+', 'G');
    assert.equal(edit.deletionFull.length, TEST_VECTOR.dna.length - 1);
    assert.equal(edit.insertionFull.length, TEST_VECTOR.dna.length + 1);
    assert.equal(edit.insertionFull.slice(0, 31), TEST_VECTOR.dna.slice(0, 30) + 'G');
    assert.ok(edit.label.toLowerCase().includes('illustration only'));
  });

  test('DNA statistics computation', () => {
    const stats = computeDnaStats('AAAACCCCGGGGTTTT');
    assert.equal(stats.length, 16);
    assert.equal(stats.gcCount, 8);
    assert.equal(stats.gcPercent, 50.0);
    assert.deepEqual(stats.counts, { A: 4, T: 4, G: 4, C: 4 });
  });

  test('Grounded Q&A refuses wet-lab protocols and answers educational queries offline', () => {
    assert.equal(isDisallowedSafetyRequest('Give me a wet-lab protocol to transfect BRCA1 in human cells'), true);
    const refusal = buildDeterministicKbAnswer('Give me a lipofection protocol for HIV');
    assert.ok(refusal.answer.includes('cannot provide wet-lab protocols'));
    assert.ok(refusal.answer.includes(EDUCATIONAL_DISCLAIMER));

    const ok = buildDeterministicKbAnswer('Why is the seed region penalized by 3?');
    assert.ok(ok.answer.toLowerCase().includes('seed'));
    assert.ok(ok.answer.includes(EDUCATIONAL_DISCLAIMER));
  });

  console.log(`\nAll ${passed} unit tests passed.`);
}

runTests();
