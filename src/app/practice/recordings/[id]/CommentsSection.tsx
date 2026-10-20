'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { CircleAlert, LoaderCircle, MessageSquare, Trash2 } from 'lucide-react';
import type { RecordingComment } from '@/lib/recording-comments';
import { getComments, postComment, removeComment } from './action';

function timeAgo(ts: number | null) {
  if (!ts) return 'just now';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function CommentsSection({
  recordingId,
  currentStudentId,
  initialComments,
}: {
  recordingId: string;
  currentStudentId: string;
  initialComments: RecordingComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [posting, startPosting] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Light polling so a reply from a tutor shows up without a manual refresh
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const fresh = await getComments(recordingId);
        setComments(fresh);
      } catch {
        /* silent — next poll will retry */
      }
    }, 15000);
    return () => clearInterval(id);
  }, [recordingId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;

    setError('');
    startPosting(async () => {
      try {
        const comment = await postComment(recordingId, value);
        setComments((prev) => [comment, ...prev]);
        setText('');
        textareaRef.current?.focus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not post your comment');
      }
    });
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId);
    try {
      await removeComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the comment');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <MessageSquare className="size-4.5" aria-hidden />
        Comments
        <span className="text-sm font-normal text-muted-foreground">({comments.length})</span>
      </h2>

      <form onSubmit={handleSubmit} className="mt-4">
        <label htmlFor="comment-text" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="comment-text"
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask a question or leave a note about this lesson…"
          rows={3}
          maxLength={1000}
          className="w-full rounded-xl border border-input bg-background p-3.5 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{text.length}/1000</p>
          <button
            type="submit"
            disabled={!text.trim() || posting}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting && <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />}
            Post comment
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {comments.length === 0 && (
          <li className="rounded-xl border border-dashed bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to ask something.
          </li>
        )}

        {comments.map((c) => {
          const initials = c.studentName.slice(0, 2).toUpperCase();
          const isOwn = c.studentId === currentStudentId;
          return (
            <li key={c.id} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {initials}
              </span>
              <div className="min-w-0 flex-1 rounded-xl border bg-card p-3.5 text-card-foreground">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {c.studentName}
                    {isOwn && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        aria-label="Delete comment"
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        {deletingId === c.id ? (
                          <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{c.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}