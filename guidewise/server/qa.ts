import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { EDUCATIONAL_DISCLAIMER } from '../src/shared/crisprEngine.ts';
import {
  buildDeterministicKbAnswer,
  buildRefusalAnswer,
  isDisallowedSafetyRequest,
  retrieveKnowledgeEntries,
} from '../src/shared/knowledgeBase.ts';
import { logQaInteraction } from './db.ts';

export interface AskRequestContext {
  dnaLength?: number;
  pam?: string;
  maxMm?: number;
  guide?: string;
  totalSites?: number;
  bestScore?: number;
  topSiteSummary?: string;
}

export interface AskResponse {
  answer: string;
  mode: 'kb-gemini' | 'kb-deterministic' | 'safety-refusal';
  sources: string[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function answerEducationalQuestion(
  question: string,
  runContext?: AskRequestContext
): Promise<AskResponse> {
  const cleanedQuestion = question.trim();

  // 1. Mandatory biosafety & ethics gate
  if (isDisallowedSafetyRequest(cleanedQuestion)) {
    const refusal = buildRefusalAnswer();
    logQaInteraction(cleanedQuestion, refusal);
    return {
      answer: refusal,
      mode: 'safety-refusal',
      sources: ['GuideWise Ethics & Safety Boundaries'],
    };
  }

  // 2. Retrieve grounded entries from curated 32-item knowledge base
  const kbMatches = retrieveKnowledgeEntries(cleanedQuestion, 4);
  const sources =
    kbMatches.length > 0
      ? kbMatches.map((m) => `${m.topic}: ${m.question}`)
      : ['GuideWise Educational Knowledge Base'];

  const ai = getGeminiClient();
  if (ai && kbMatches.length > 0) {
    try {
      const kbContextText = kbMatches
        .map((m, idx) => `[KB-${idx + 1}] (${m.topic}) Q: ${m.question}\nA: ${m.answer}`)
        .join('\n\n');

      const runContextText = runContext?.guide
        ? `Current synthetic simulation run: DNA length ${runContext.dnaLength ?? 'unknown'} bp, guide ${runContext.guide}, PAM ${runContext.pam ?? 'NGG'}, max mismatches ${runContext.maxMm ?? 4}, candidate sites found: ${runContext.totalSites ?? 0}, top educational score: ${runContext.bestScore ?? 0}${runContext.topSiteSummary ? `, summary: ${runContext.topSiteSummary}` : ''}.`
        : 'No active simulation run provided.';

      const systemInstruction = [
        'You are the GuideWise educational CRISPR-Cas9 assistant.',
        'STRICT GROUNDING RULES:',
        '1. Answer ONLY using facts from the provided Knowledge Base excerpts and the Current Simulation Run context.',
        '2. Keep answers concise, beginner-friendly, and 2-4 sentences plus optional bullet points.',
        '3. Always label scores as "educational estimates" and hypothetical edits as "illustration only".',
        '4. NEVER provide wet-lab protocols, reagent instructions, delivery methods, or guide designs for real genes, humans, animals, or pathogens. Refuse such requests politely and state GuideWise is educational only.',
        '5. Do NOT invent biological claims outside the provided Knowledge Base.',
        '6. End every response on a new paragraph with the exact disclaimer: "' + EDUCATIONAL_DISCLAIMER + '"',
      ].join('\n');

      const prompt = [
        'KNOWLEDGE BASE EXCERPTS:',
        kbContextText,
        '',
        'CURRENT RUN CONTEXT:',
        runContextText,
        '',
        'STUDENT QUESTION:',
        cleanedQuestion,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const text = response.text?.trim();
      if (text) {
        const finalAnswer = text.includes('Educational Simulation Only')
          ? text
          : `${text}\n\n${EDUCATIONAL_DISCLAIMER}`;
        logQaInteraction(cleanedQuestion, finalAnswer);
        return {
          answer: finalAnswer,
          mode: 'kb-gemini',
          sources,
        };
      }
    } catch {
      // Offline or API failure cleanly falls back to deterministic KB matching
    }
  }

  // 3. Deterministic offline fallback over curated Knowledge Base
  const fallback = buildDeterministicKbAnswer(cleanedQuestion, runContext);
  logQaInteraction(cleanedQuestion, fallback.answer);
  return {
    answer: fallback.answer,
    mode: 'kb-deterministic',
    sources: fallback.sources,
  };
}
