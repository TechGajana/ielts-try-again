'use client';

import { PenLine } from 'lucide-react';
import ModuleBrowser, { type ModuleGroup, type Progress } from '@/components/practice/module-browser';
import { WRITING_CATEGORIES, WRITING_PARTS, type WritingPart } from '@/lib/writing-config';

const GROUPS: ModuleGroup[] = (Object.keys(WRITING_PARTS) as WritingPart[]).map((part) => ({
  title: WRITING_PARTS[part].label,
  types: WRITING_CATEGORIES.filter((c) => c.part === part).map((c) => ({ name: c.name })),
}));

const SLUGS = Object.fromEntries(WRITING_CATEGORIES.map((c) => [c.name, c.slug]));

export default function WritingBrowser({ progress }: { progress: Progress }) {
  return (
    <ModuleBrowser
      basePath="/practice/writing"
      slugs={SLUGS}
      title="Writing"
      description="Describe visuals in Task 1 and build arguments in Task 2. Every attempt is timed and gets its own AI feedback."
      masteryLabel="Writing Mastery"
      unit="question"
      searchPlaceholder="Find a specific writing category…"
      icon={PenLine}
      sectionIcon={PenLine}
      groups={GROUPS}
      progress={progress}
    />
  );
}