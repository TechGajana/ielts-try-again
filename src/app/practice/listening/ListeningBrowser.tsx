'use client';

import { Headphones, Volume2 } from 'lucide-react';
import ModuleBrowser, { type ModuleGroup, type Progress } from '@/components/practice/module-browser';

// These names must match `questionType` in your listeningTasks documents exactly.
// Group names and difficulty labels are placeholders. Edit them freely.
const GROUPS: ModuleGroup[] = [
  {
    title: 'Choice & Matching',
    types: [
      { name: 'Multiple Choice', difficulty: 'Medium' },
      { name: 'Matching', difficulty: 'Hard' },
    ],
  },
  {
    title: 'Visuals & Mapping',
    types: [{ name: 'Plan/Map/Diagram Labelling', difficulty: 'Hard' }],
  },
  {
    title: 'Information Completion',
    types: [
      { name: 'Form/Note/Table/Flow-chart/Summary Completion', difficulty: 'Medium' },
      { name: 'Sentence Completion', difficulty: 'Easy' },
      { name: 'Short Answer Questions', difficulty: 'Easy' },
    ],
  },
];

export default function ListeningBrowser({ progress }: { progress: Progress }) {
  return (
    <ModuleBrowser
      basePath="/practice/listening"
      title="Listening"
      description="Train your ear. Practice extracting specific details, understanding context, and navigating audio maps to hit your target band score."
      masteryLabel="Audio Mastery"
      unit="track"
      searchPlaceholder="Find a specific audio task…"
      icon={Headphones}
      sectionIcon={Volume2}
      groups={GROUPS}
      progress={progress}
    />
  );
}