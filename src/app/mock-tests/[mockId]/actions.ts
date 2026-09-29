'use server';

import {
  advanceSection,
  evaluateMockWriting,
  getSessionStudentId,
  issueAudio,
  leaveMock,
  saveProgress,
  startMock,
} from '@/lib/mock';
import type { MockSection } from '@/lib/mock-config';

function fail(err: unknown) {
  return { ok: false as const, error: err instanceof Error ? err.message : 'Something went wrong. Try again.' };
}

export async function startMockAction(mockId: string) {
  try {
    return { ok: true as const, state: await startMock(await getSessionStudentId(), mockId) };
  } catch (err) {
    return fail(err);
  }
}

export async function saveMockAction(mockId: string, section: MockSection, answers: { [key: string]: string }) {
  try {
    return { ok: true as const, outcome: await saveProgress(await getSessionStudentId(), mockId, section, answers) };
  } catch (err) {
    return fail(err);
  }
}

export async function advanceMockAction(mockId: string, from: MockSection) {
  try {
    return { ok: true as const, result: await advanceSection(await getSessionStudentId(), mockId, from) };
  } catch (err) {
    return fail(err);
  }
}

export async function audioMockAction(mockId: string, partIndex: number) {
  try {
    const { url } = await issueAudio(await getSessionStudentId(), mockId, partIndex);
    return { ok: true as const, url };
  } catch (err) {
    return fail(err);
  }
}

export async function leaveMockAction(mockId: string) {
  try {
    await leaveMock(await getSessionStudentId(), mockId);
    return { ok: true as const };
  } catch (err) {
    return fail(err);
  }
}

export async function evaluateWritingAction(mockId: string) {
  try {
    return { ok: true as const, view: await evaluateMockWriting(await getSessionStudentId(), mockId) };
  } catch (err) {
    return fail(err);
  }
}