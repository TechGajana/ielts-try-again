'use client';

import { useState } from 'react';
import { Field, inputClass } from '@/components/admin/ui';
import SubmitButton from '@/components/admin/submit-button';
import DeleteTaskButton from '@/components/admin/delete-task-button';
import type { Batch, Payment, StudentProfile } from '@/lib/student-management';
import {
  deletePaymentAction,
  recordPaymentAction,
  saveBatchAction,
  updatePaymentAction,
  updateStudentProfileAction,
} from './actions';

function FormError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function BatchForm({ batch }: { batch?: Batch }) {
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setError('');
    try {
      await saveBatchAction(formData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the batch.');
    }
  }

  return (
    <form action={submit} className="space-y-4">
      {batch && <input type="hidden" name="id" value={batch.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch name" htmlFor="batch-name">
          <input id="batch-name" name="name" required defaultValue={batch?.name} className={inputClass} />
        </Field>
        <Field label="Course" htmlFor="batch-course">
          <input id="batch-course" name="course" required defaultValue={batch?.course} className={inputClass} />
        </Field>
        <Field label="Instructor" htmlFor="batch-instructor">
          <input id="batch-instructor" name="instructor" defaultValue={batch?.instructor} className={inputClass} />
        </Field>
        <Field label="Status" htmlFor="batch-status">
          <select id="batch-status" name="status" defaultValue={batch?.status ?? 'active'} className={inputClass}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Start date" htmlFor="batch-start">
          <input id="batch-start" name="startDate" type="date" defaultValue={batch?.startDate} className={inputClass} />
        </Field>
        <Field label="End date" htmlFor="batch-end">
          <input id="batch-end" name="endDate" type="date" defaultValue={batch?.endDate} className={inputClass} />
        </Field>
      </div>
      <FormError message={error} />
      <div className="flex justify-end border-t pt-4">
        <SubmitButton pendingLabel="Saving…">{batch ? 'Save changes' : 'Create batch'}</SubmitButton>
      </div>
    </form>
  );
}

export function StudentProfileForm({ student, batches }: { student: StudentProfile; batches: Batch[] }) {
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setError('');
    try {
      await updateStudentProfileAction(student.uid, formData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the student profile.');
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="profile-first-name">
          <input id="profile-first-name" name="firstName" required defaultValue={student.firstName} className={inputClass} />
        </Field>
        <Field label="Last name" htmlFor="profile-last-name">
          <input id="profile-last-name" name="lastName" required defaultValue={student.lastName} className={inputClass} />
        </Field>
        <Field label="Phone" htmlFor="profile-phone">
          <input id="profile-phone" name="phone" type="tel" defaultValue={student.phone} className={inputClass} />
        </Field>
        <Field label="Course" htmlFor="profile-course">
          <input id="profile-course" name="course" defaultValue={student.course} className={inputClass} />
        </Field>
        <Field label="Current band" htmlFor="current-band">
          <input id="current-band" name="currentBand" defaultValue={student.currentBand} className={inputClass} />
        </Field>
        <Field label="Target band" htmlFor="target-band">
          <input id="target-band" name="targetBand" defaultValue={student.targetBand} className={inputClass} />
        </Field>
        <Field label="Enrollment date" htmlFor="enrollment-date">
          <input id="enrollment-date" name="enrollmentDate" type="date" defaultValue={student.enrollmentDate} className={inputClass} />
        </Field>
        <Field label="Batch" htmlFor="profile-batch">
          <select id="profile-batch" name="batchId" defaultValue={student.batchId} className={inputClass}>
            <option value="">No batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}{batch.status === 'inactive' ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Student status" htmlFor="student-status">
          <select id="student-status" name="status" defaultValue={student.status} className={inputClass}>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Dropped">Dropped</option>
          </select>
        </Field>
        <Field label="Total fees" htmlFor="profile-total-fees">
          <input
            id="profile-total-fees"
            name="totalFees"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={student.totalFees}
            className={inputClass}
          />
        </Field>
      </div>
      <FormError message={error} />
      <div className="flex justify-end border-t pt-4">
        <SubmitButton pendingLabel="Saving…">Save student profile</SubmitButton>
      </div>
    </form>
  );
}

export function RecordPaymentForm({ uid, pendingFees }: { uid: string; pendingFees: number }) {
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setError('');
    try {
      await recordPaymentAction(uid, formData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record payment.');
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" htmlFor="payment-amount" hint={`Outstanding balance: ${pendingFees.toFixed(2)}`}>
          <input
            id="payment-amount"
            name="amount"
            type="number"
            min="0.01"
            max={pendingFees}
            step="0.01"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Payment method" htmlFor="payment-method">
          <select id="payment-method" name="method" required defaultValue="" className={inputClass}>
            <option value="" disabled>Select method</option>
            <option value="Cash">Cash</option>
            <option value="Bank transfer">Bank transfer</option>
            <option value="Card">Card</option>
            <option value="Online">Online</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Payment date" htmlFor="payment-date">
          <input id="payment-date" name="paidAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
        </Field>
        <Field label="Reference" htmlFor="payment-reference">
          <input id="payment-reference" name="reference" className={inputClass} />
        </Field>
      </div>
      <Field label="Note" htmlFor="payment-note">
        <textarea id="payment-note" name="note" rows={2} className={inputClass} />
      </Field>
      <FormError message={error} />
      <div className="flex justify-end border-t pt-4">
        <SubmitButton pendingLabel="Recording…" disabled={pendingFees <= 0}>Record payment</SubmitButton>
      </div>
    </form>
  );
}

export function EditPaymentForm({ uid, payment }: { uid: string; payment: Payment }) {
  const [error, setError] = useState('');

  async function submit(formData: FormData) {
    setError('');
    try {
      await updatePaymentAction(uid, payment.id, formData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update payment.');
    }
  }

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-primary">Edit payment</summary>
      <form action={submit} className="mt-3 min-w-72 space-y-3 rounded-lg border bg-background p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount" htmlFor={`edit-amount-${payment.id}`}>
            <input id={`edit-amount-${payment.id}`} name="amount" type="number" min="0.01" step="0.01" required defaultValue={payment.amount} className={inputClass} />
          </Field>
          <Field label="Method" htmlFor={`edit-method-${payment.id}`}>
            <select id={`edit-method-${payment.id}`} name="method" defaultValue={payment.method} required className={inputClass}>
              {['Cash', 'Bank transfer', 'Card', 'Online', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </Field>
          <Field label="Date" htmlFor={`edit-date-${payment.id}`}>
            <input
              id={`edit-date-${payment.id}`}
              name="paidAt"
              type="date"
              required
              defaultValue={payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : ''}
              className={inputClass}
            />
          </Field>
          <Field label="Reference" htmlFor={`edit-reference-${payment.id}`}>
            <input id={`edit-reference-${payment.id}`} name="reference" defaultValue={payment.reference} className={inputClass} />
          </Field>
        </div>
        <Field label="Note" htmlFor={`edit-note-${payment.id}`}>
          <textarea id={`edit-note-${payment.id}`} name="note" rows={2} defaultValue={payment.note} className={inputClass} />
        </Field>
        <FormError message={error} />
        <div className="flex items-center justify-between">
          <DeleteTaskButton action={deletePaymentAction.bind(null, uid, payment.id)} label="payment" />
          <SubmitButton pendingLabel="Saving…">Save payment</SubmitButton>
        </div>
      </form>
    </details>
  );
}
