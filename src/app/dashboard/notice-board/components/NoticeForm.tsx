'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Notice, NoticeDepartment, NoticeType } from '../types';

interface NoticeFormProps {
  open: boolean;
  notice?: Notice | null;
  departments: NoticeDepartment[];
  onClose: () => void;
  onSuccess: () => void;
}

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default function NoticeForm({
  open,
  notice,
  departments,
  onClose,
  onSuccess,
}: NoticeFormProps) {
  const [title, setTitle] = useState(notice?.title ?? '');
  const [content, setContent] = useState(notice?.content ?? '');
  const [type, setType] = useState<NoticeType>(notice?.type ?? 'ANNOUNCEMENT');
  const [departmentId, setDepartmentId] = useState(notice?.departmentId ?? 'ALL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setError('Title and content are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (notice) {
        await api.put(`/notices/${notice.id}`, {
          title: trimmedTitle,
          content: trimmedContent,
          type,
          departmentId: departmentId === 'ALL' ? null : departmentId,
        });
      } else {
        await api.post('/notices', {
          title: trimmedTitle,
          content: trimmedContent,
          type,
          ...(departmentId === 'ALL' ? {} : { departmentId }),
        });
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const requestError = err as { response?: { data?: { message?: string } } };
      setError(requestError?.response?.data?.message || 'Unable to save the notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{notice ? 'Edit notice' : 'New notice'}</DialogTitle>
          <DialogDescription>
            Publish an update to everyone or target a single department.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="notice-title" className="text-xs font-semibold text-slate-600">
              Title
            </label>
            <input
              id="notice-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              placeholder="e.g. Office closed on Friday"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="notice-content" className="text-xs font-semibold text-slate-600">
              Content
            </label>
            <Textarea
              id="notice-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={5000}
              rows={6}
              placeholder="Share the details employees need to know…"
              className="min-h-32 resize-y border-slate-200 bg-white text-sm focus-visible:border-blue-400 focus-visible:ring-blue-100"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Type</label>
              <Select value={type} onValueChange={(value) => setType(value as NoticeType)}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                  <SelectItem value="HOLIDAY">Holiday</SelectItem>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Audience</label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All employees</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {notice ? 'Save changes' : 'Publish notice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
