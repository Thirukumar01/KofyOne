'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SitePage, LegalPageSlug } from '@/types/legal';
import { LegalContentViewer } from '@/components/legal/legal-content-viewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Shield,
  HelpCircle,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  RotateCcw,
  ExternalLink,
  Loader2,
  Bold,
  Heading2,
  List,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LegalEditorClientProps {
  initialPages: SitePage[];
}

const PAGE_META: Record<LegalPageSlug, { title: string; icon: typeof FileText; path: string }> = {
  terms: { title: 'Terms & Conditions', icon: FileText, path: '/terms' },
  privacy: { title: 'Privacy Policy', icon: Shield, path: '/privacy' },
  about: { title: 'About KofyOne', icon: HelpCircle, path: '/about' },
  contact: { title: 'Contact & Support', icon: Mail, path: '/contact' },
};

export function LegalEditorClient({ initialPages }: LegalEditorClientProps) {
  // Store all pages keyed by slug
  const [pagesMap, setPagesMap] = useState<Record<string, SitePage>>(() => {
    const map: Record<string, SitePage> = {};
    for (const p of initialPages) {
      map[p.slug] = p;
    }
    return map;
  });

  const [activeSlug, setActiveSlug] = useState<LegalPageSlug>('terms');
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview' | 'split'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const currentPage = pagesMap[activeSlug] || {
    slug: activeSlug,
    title: PAGE_META[activeSlug].title,
    summary: '',
    content: '',
    is_published: true,
    published_at: null,
    updated_at: new Date().toISOString(),
  };

  const handleFieldChange = (field: keyof SitePage, value: unknown) => {
    setPagesMap((prev) => ({
      ...prev,
      [activeSlug]: {
        ...prev[activeSlug],
        [field]: value,
      },
    }));
  };

  const insertMarkdownSnippet = (snippet: string) => {
    const textarea = document.getElementById('legal-content-editor') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = currentPage.content;
    const updated = current.substring(0, start) + snippet + current.substring(end);

    handleFieldChange('content', updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  async function handleSave(publish: boolean) {
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/pages/${activeSlug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentPage.title,
          summary: currentPage.summary,
          content: currentPage.content,
          is_published: publish,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save page.');
      }

      setPagesMap((prev) => ({
        ...prev,
        [activeSlug]: data.page,
      }));

      setFeedback({
        type: 'success',
        text: publish
          ? `"${currentPage.title}" successfully published and live!`
          : `Draft saved successfully! (Private to administrators)`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetToDefault() {
    setIsSaving(true);
    setFeedback(null);
    setConfirmResetOpen(false);

    try {
      const res = await fetch(`/api/admin/pages/${activeSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset page.');
      }

      setPagesMap((prev) => ({
        ...prev,
        [activeSlug]: data.page,
      }));

      setFeedback({
        type: 'success',
        text: `Restored default canonical version of "${currentPage.title}".`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to reset page to default.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {(['terms', 'privacy', 'about', 'contact'] as LegalPageSlug[]).map((slug) => {
            const meta = PAGE_META[slug];
            const Icon = meta.icon;
            const page = pagesMap[slug];
            const isActive = activeSlug === slug;

            return (
              <button
                key={slug}
                onClick={() => {
                  setActiveSlug(slug);
                  setFeedback(null);
                }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-zinc-900 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.title}</span>
                <span
                  className={cn(
                    'ml-1.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold uppercase',
                    page?.is_published
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  )}
                >
                  {page?.is_published ? 'Live' : 'Draft'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Site Link & View Mode */}
        <div className="flex items-center gap-2">
          <Link
            href={PAGE_META[activeSlug].path}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            <span>Open Live Page</span>
          </Link>
        </div>
      </div>

      {/* 2. Feedback Notification */}
      {feedback && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-xl p-4 text-sm font-medium transition-all shadow-xs',
            feedback.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Editor Toolbar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <span>Viewing: </span>
          <strong className="text-zinc-900 dark:text-zinc-100">{PAGE_META[activeSlug].title}</strong>
          <span>•</span>
          <span>Status:</span>
          <span
            className={cn(
              'font-semibold',
              currentPage.is_published ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {currentPage.is_published ? 'Published (Public)' : 'Draft (Admin Only)'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="hidden lg:flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-0.5">
            <button
              onClick={() => setPreviewMode('editor')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                previewMode === 'editor' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'
              )}
            >
              Editor
            </button>
            <button
              onClick={() => setPreviewMode('split')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                previewMode === 'split' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'
              )}
            >
              Split View
            </button>
            <button
              onClick={() => setPreviewMode('preview')}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                previewMode === 'preview' ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-500'
              )}
            >
              Preview
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmResetOpen(true)}
            disabled={isSaving}
            className="text-xs gap-1.5 text-zinc-600 dark:text-zinc-400"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Default
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Save Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Publish Content
          </Button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Reset to Default Version?
              </h3>
            </div>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              This will overwrite any custom edits for <strong>{currentPage.title}</strong> with the canonical default KofyOne policy content. This action takes effect immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setConfirmResetOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleResetToDefault}
                disabled={isSaving}
              >
                Confirm Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Metadata Inputs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-1.5 sm:col-span-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Page Title
          </label>
          <Input
            value={currentPage.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Page Title"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Page Summary / Subtitle
          </label>
          <Input
            value={currentPage.summary}
            onChange={(e) => handleFieldChange('summary', e.target.value)}
            placeholder="Brief description of the policy or purpose"
          />
        </div>
      </div>

      {/* 5. Main Content Work Area */}
      <div
        className={cn(
          'grid gap-6',
          previewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {/* Editor Column */}
        {(previewMode === 'editor' || previewMode === 'split') && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            {/* Markdown Quick Tools */}
            <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/70 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900/70">
              <span className="px-2 text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                Insert:
              </span>
              <button
                type="button"
                onClick={() => insertMarkdownSnippet('### Section Heading\n')}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Heading 3"
              >
                <Heading2 className="h-3 w-3" /> Heading
              </button>
              <button
                type="button"
                onClick={() => insertMarkdownSnippet('**bold text**')}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Bold text"
              >
                <Bold className="h-3 w-3" /> Bold
              </button>
              <button
                type="button"
                onClick={() => insertMarkdownSnippet('- List item\n- List item\n')}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Bullet list"
              >
                <List className="h-3 w-3" /> Bullet List
              </button>
              <button
                type="button"
                onClick={() => insertMarkdownSnippet('[Link Label](https://example.com)')}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                title="Hyperlink"
              >
                <ExternalLink className="h-3 w-3" /> Link
              </button>
              <button
                type="button"
                onClick={() => insertMarkdownSnippet('[support@kofyone.com]')}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 font-mono text-[11px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                title="Add Highlighted Placeholder"
              >
                [Placeholder]
              </button>
            </div>

            {/* Textarea */}
            <textarea
              id="legal-content-editor"
              value={currentPage.content}
              onChange={(e) => handleFieldChange('content', e.target.value)}
              rows={24}
              placeholder="Enter markdown-formatted policy content..."
              className="w-full resize-y rounded-b-2xl border-none p-4 font-mono text-xs sm:text-sm leading-relaxed text-zinc-900 focus:outline-hidden dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        )}

        {/* Live Preview Column */}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <div className="border-b border-zinc-200 bg-zinc-50/70 p-3 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 flex items-center justify-between">
              <span>Live Visual Preview</span>
              <span className="text-[11px] font-normal text-zinc-400">
                Safe XSS-Isolated Render
              </span>
            </div>
            <div className="p-6 max-h-[640px] overflow-y-auto">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
                {currentPage.title}
              </h1>
              {currentPage.summary && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  {currentPage.summary}
                </p>
              )}
              <LegalContentViewer content={currentPage.content} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
