export type NoticeType = 'ANNOUNCEMENT' | 'HOLIDAY' | 'EVENT' | 'URGENT';

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: NoticeType;
  departmentId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoticeDepartment {
  id: string;
  name: string;
  canManage?: boolean;
  admin?: { id: string } | null;
  admins?: { id: string }[];
}

export const NOTICE_TYPE_META: Record<
  NoticeType,
  { label: string; badge: string; border: string; dot: string }
> = {
  ANNOUNCEMENT: {
    label: 'Announcement',
    badge: 'border-blue-200 bg-blue-50 text-blue-700',
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  HOLIDAY: {
    label: 'Holiday',
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  EVENT: {
    label: 'Event',
    badge: 'border-amber-200 bg-amber-50 text-amber-700',
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
  },
  URGENT: {
    label: 'Urgent',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    border: 'border-l-rose-500',
    dot: 'bg-rose-500',
  },
};
