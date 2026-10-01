'use client';

import { useState, useTransition } from 'react';
import { FolderOpen, LoaderCircle } from 'lucide-react';
import AccessPicker, { type AccessGroup } from './AccessPicker';
import { updateStudentCourses } from './actions';

export default function EditStudentCoursesDialog({
  uid,
  username,
  allowedCourseIds,
  accessGroups,
}: {
  uid: string;
  username: string;
  allowedCourseIds: string[];
  accessGroups: AccessGroup[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function openDialog() {
    // Start from what's saved, dropping ids of items that have since been deleted
    const existing = new Set(accessGroups.flatMap((g) => g.items.map((i) => i.id)));
    setSelected(new Set(allowedCourseIds.filter((id) => existing.has(id))));
    setError('');
    setOpen(true);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSave() {
    setError('');
    startTransition(async () => {
      try {
        const formData = new FormData();
        for (const id of selected) formData.append('courseIds', id);
        await updateStudentCourses(uid, formData);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save changes');
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openDialog}
        aria-label={`Edit course access for ${username}`}
        title="Course access"
        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      >
        <FolderOpen className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label={`Edit course access for ${username}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 text-left"
      onClick={() => !pending && setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 className="text-base font-semibold">Course access for {username}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only ticked items are visible to this student.</p>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          <AccessPicker groups={accessGroups} selected={selected} onToggle={toggle} disabled={pending} />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="h-10 rounded-lg border bg-background px-4 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {pending && <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}