'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  FileCheck,
  FileBadge,
  FileSpreadsheet,
  FileImage,
  AlertCircle,
  RefreshCw,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export type DocumentCategory =
  | 'CONTRACT'
  | 'ID_PROOF'
  | 'RESUME'
  | 'TAX_FORM'
  | 'CERTIFICATE'
  | 'OTHER';

export interface EmployeeDocumentItem {
  id: string;
  companyId: string;
  employeeId: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Props {
  employeeId: string;
  canManage: boolean;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: 'Contract & Agreement',
  ID_PROOF: 'Identity Proof',
  RESUME: 'Resume / CV',
  TAX_FORM: 'Tax Document',
  CERTIFICATE: 'Certification',
  OTHER: 'General / Other',
};

const CATEGORY_FILTERS = [
  { label: 'All Files', value: 'ALL' },
  { label: 'Contracts', value: 'CONTRACT' },
  { label: 'ID Proofs', value: 'ID_PROOF' },
  { label: 'Resumes', value: 'RESUME' },
  { label: 'Tax Forms', value: 'TAX_FORM' },
  { label: 'Certificates', value: 'CERTIFICATE' },
];

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
};

const resolveMimeType = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXTENSION[extension] || '';
};

export default function EmployeeDocumentsTab({ employeeId, canManage }: Props) {
  const { toast } = useToast();

  const [documents, setDocuments] = useState<EmployeeDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'CONTRACT' as DocumentCategory,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Downloading indicator
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await api.get('/documents', {
          params: { employeeId, limit: 100 },
        });

        const data = res.data;
        if (data && data.data) {
          setDocuments(data.data);
        } else if (Array.isArray(data)) {
          setDocuments(data);
        } else {
          setDocuments([]);
        }
      } catch (err: unknown) {
        console.error('Failed to load employee documents:', err);
        toast.error('Failed to fetch employee documents.', 'Error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId, toast]
  );

  useEffect(() => {
    if (!employeeId) return;
    let active = true;

    api
      .get('/documents', { params: { employeeId, limit: 100 } })
      .then((res) => {
        if (!active) return;
        const data = res.data;
        if (data && data.data) {
          setDocuments(data.data);
        } else if (Array.isArray(data)) {
          setDocuments(data);
        } else {
          setDocuments([]);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to load employee documents:', err);
        toast.error('Failed to fetch employee documents.', 'Error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Maximum permitted file size is 10 MB.', 'File Too Large');
        return;
      }
      setSelectedFile(file);
      if (!uploadForm.title.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadForm((prev) => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.', 'Missing File');
      return;
    }

    if (!uploadForm.title.trim()) {
      toast.error('Please enter a document title.', 'Missing Title');
      return;
    }

    const mimeType = resolveMimeType(selectedFile);
    if (!mimeType) {
      toast.error('This file type is not supported by the document vault.', 'Unsupported File');
      return;
    }

    setUploading(true);
    try {
      const base64Data = await fileToBase64(selectedFile);

      await api.post('/documents', {
        employeeId,
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        fileName: selectedFile.name,
        mimeType,
        data: base64Data,
      });

      toast.success('The file has been safely vaulted.', 'Document Uploaded');

      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadForm({ title: '', category: 'CONTRACT' });
      fetchDocuments(true);
    } catch (err: unknown) {
      console.error('Failed to upload document:', err);
      toast.error('Unable to vault document. Ensure file is within size limits.', 'Upload Failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: EmployeeDocumentItem) => {
    setDownloadingId(doc.id);
    try {
      const res = await api.get(`/documents/${doc.id}`);
      const payload = res.data;

      if (!payload || !payload.data) {
        throw new Error('No document content returned');
      }

      // Convert clean base64 to Blob
      const cleanBase64 = payload.data.replace(/^data:[^;]+;base64,/, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: payload.mimeType });

      // Create download trigger
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = payload.fileName || doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Failed to download document:', err);
      toast.error('Unable to download the requested file.', 'Download Failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteTarget.id}`);
      toast.success('The document was removed from the vault.', 'Document Deleted');
      setDeleteTarget(null);
      fetchDocuments(true);
    } catch (err: unknown) {
      console.error('Failed to delete document:', err);
      toast.error('Unable to remove document. Please verify your permissions.', 'Delete Failed');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (mimeType.includes('image')) {
      return <FileImage className="w-5 h-5 text-blue-500" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.includes('word') || mimeType.includes('officedocument')) {
      return <FileBadge className="w-5 h-5 text-indigo-500" />;
    }
    return <FileCheck className="w-5 h-5 text-slate-500" />;
  };

  const getCategoryBadgeClass = (category: DocumentCategory) => {
    switch (category) {
      case 'CONTRACT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ID_PROOF':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RESUME':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TAX_FORM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CERTIFICATE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (categoryFilter === 'ALL') return true;
    return doc.category === categoryFilter;
  });

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <HardDrive size={15} className="text-blue-600" />
            Document Vault
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Store contracts, credentials, government IDs, and compliance forms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDocuments(true)}
            disabled={refreshing || loading}
            className="h-8 px-2.5 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </Button>
          {canManage && (
            <Button
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setCategoryFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              categoryFilter === f.value
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200/80 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-10 bg-white rounded-xl border border-slate-200/80 text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
            <FileText className="w-5 h-5" />
          </div>
          <h5 className="text-sm font-semibold text-slate-800">No documents in this category</h5>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
            {canManage
              ? 'Upload contracts, ID copies, or tax forms for this employee.'
              : 'No documents have been uploaded for your profile yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDocuments.map((doc) => {
            const formattedDate = new Date(doc.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{doc.title}</h5>
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0',
                          getCategoryBadgeClass(doc.category)
                        )}
                      >
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="truncate max-w-[180px] font-mono">{doc.fileName}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formattedDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1.5"
                  >
                    {downloadingId === doc.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    Download
                  </Button>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(doc)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload Document to Vault
            </DialogTitle>
            <DialogDescription>
              Documents are stored securely and accessible only to authorized administrators.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Employment Contract 2026"
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Category *
              </label>
              <select
                value={uploadForm.category}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })
                }
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="CONTRACT">Contract & Agreement</option>
                <option value="ID_PROOF">Identity Proof (CNIC, Passport, Driver License)</option>
                <option value="RESUME">Resume / CV</option>
                <option value="TAX_FORM">Tax Document / NTN</option>
                <option value="CERTIFICATE">Academic / Professional Certificate</option>
                <option value="OTHER">General / Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select File (PDF, Image, Word, Excel — max 10MB) *
              </label>
              <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-slate-200 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-slate-50/50">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-7 w-7 text-slate-400" />
                  <div className="flex text-xs text-slate-600 justify-center">
                    <label className="relative cursor-pointer font-semibold text-blue-600 hover:text-blue-500">
                      <span>Choose file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                      />
                    </label>
                    <p className="pl-1 text-slate-400">or drag here</p>
                  </div>
                  {selectedFile ? (
                    <p className="text-xs font-medium text-emerald-600 mt-1">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Up to 10MB binary size</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploading}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={uploading || !selectedFile}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Vaulting...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 text-base">
              <AlertCircle className="w-5 h-5" />
              Delete Document?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-800">&ldquo;{deleteTarget?.title}&rdquo;</span>? This
              action is logged and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              className="text-xs border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
