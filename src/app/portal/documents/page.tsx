'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  FileText,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';

export type DocumentCategory =
  | 'CONTRACT'
  | 'ID_PROOF'
  | 'RESUME'
  | 'TAX_FORM'
  | 'CERTIFICATE'
  | 'OTHER';

interface EmployeeDoc {
  id: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: 'Contract',
  ID_PROOF: 'ID Proof',
  RESUME: 'Resume',
  TAX_FORM: 'Tax Form',
  CERTIFICATE: 'Certificate',
  OTHER: 'Other',
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function extractErrorMessage(err: unknown, defaultMsg: string): string {
  const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
  return errorObj?.response?.data?.message || errorObj?.message || defaultMsg;
}

export default function DocumentVaultPage() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<EmployeeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('OTHER');
  const [fileData, setFileData] = useState<{
    fileName: string;
    mimeType: string;
    data: string;
  } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/documents');
      const docs = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.documents)
            ? res.data.documents
            : [];
      setDocuments(docs);
    } catch (err: unknown) {
      console.error('Failed to load documents:', err);
      setErrorMsg('Could not load documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  // Filtered docs
  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory === 'ALL') return true;
    return doc.category === selectedCategory;
  });

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Document file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setFileData({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
      });
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload submission
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData || !user?.id) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.post('/documents', {
        employeeId: user.id,
        title: title.trim(),
        category,
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        data: fileData.data,
      });

      setSuccessMsg('Document successfully uploaded to your vault!');
      setShowUploadModal(false);
      setTitle('');
      setFileData(null);
      await loadDocuments();
    } catch (err: unknown) {
      console.error('Document upload error:', err);
      setErrorMsg(extractErrorMessage(err, 'Failed to upload document.'));
    } finally {
      setUploading(false);
    }
  };

  // Download document
  const handleDownload = async (doc: EmployeeDoc) => {
    try {
      setDownloadingId(doc.id);
      const res = await api.get(`/documents/${doc.id}`);
      const { fileName, mimeType, data } = res.data;

      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.error('Download error:', err);
      alert('Could not download document.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="text-blue-600" size={26} />
            <span>Document Vault</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access contracts, identity proofs, certifications, and upload personal compliance papers.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setShowUploadModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition shadow-sm shadow-blue-600/20"
        >
          <Upload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-center justify-between text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-xs font-bold text-red-600">Dismiss</button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-xs font-bold text-emerald-600">Dismiss</button>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            selectedCategory === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Documents ({documents.length})
        </button>
        {(['CONTRACT', 'ID_PROOF', 'RESUME', 'TAX_FORM', 'CERTIFICATE', 'OTHER'] as DocumentCategory[]).map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          )
        )}
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs font-semibold">Loading documents...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No documents in this category</p>
            <p className="text-xs text-slate-400 mt-0.5">Click &ldquo;Upload Document&rdquo; to store records securely.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocs.map((doc) => {
              const isDownloading = downloadingId === doc.id;
              const uploadDate = new Date(doc.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div key={doc.id} className="p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  {/* Left: File icon + info */}
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FileText size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatFileSize(doc.fileSize)} · Uploaded {uploadDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200 hover:border-blue-200 transition disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Download size={14} />
                      )}
                      <span>Download</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Upload to Document Vault</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 mt-4">
              
              {/* Document Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. National ID Copy, Degree Certificate"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="ID_PROOF">ID Proof (Passport, CNIC, License)</option>
                  <option value="CONTRACT">Contract / Agreement</option>
                  <option value="RESUME">Resume / CV</option>
                  <option value="TAX_FORM">Tax Form / Returns</option>
                  <option value="CERTIFICATE">Certificate / Diploma</option>
                  <option value="OTHER">Other Document</option>
                </select>
              </div>

              {/* File input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select File (PDF, PNG, JPG, max 5MB)
                </label>
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                  <Upload size={18} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">
                    {fileData ? fileData.fileName : 'Choose file to upload'}
                  </span>
                  <input
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !fileData}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading && <Loader2 size={14} className="animate-spin" />}
                  <span>Upload Document</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
