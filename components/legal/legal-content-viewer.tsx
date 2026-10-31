'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LegalContentViewerProps {
  content: string;
  className?: string;
}

/**
 * XSS-Safe Structured Content Renderer
 * Parses and renders Markdown syntax safely without dangerouslySetInnerHTML.
 */
export function LegalContentViewer({ content, className }: LegalContentViewerProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={cn('prose prose-zinc dark:prose-invert max-w-none space-y-4', className)}>
      {blocks.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </div>
  );
}

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'callout'; text: string }
  | { type: 'p'; text: string };

function parseMarkdownBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join(' ').trim();
      if (text) {
        blocks.push({ type: 'p', text });
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blank line -> flush paragraph & list
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushParagraph();
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
      continue;
    }
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h4', text: trimmed.slice(5).trim() });
      continue;
    }

    // Blockquote / Callout
    if (trimmed.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'callout', text: trimmed.slice(2).trim() });
      continue;
    }

    // Unordered List (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      const itemText = trimmed.replace(/^[-*]\s+/, '');
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Ordered List (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
      continue;
    }

    // Standard paragraph line
    flushList();
    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'h1':
      return (
        <h1 className="mt-8 mb-4 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <InlineRenderer text={block.text} />
        </h1>
      );
    case 'h2':
      return (
        <h2 className="mt-8 mb-3 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          <InlineRenderer text={block.text} />
        </h2>
      );
    case 'h3':
      return (
        <h3 className="mt-6 mb-2 text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-200">
          <InlineRenderer text={block.text} />
        </h3>
      );
    case 'h4':
      return (
        <h4 className="mt-4 mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-200">
          <InlineRenderer text={block.text} />
        </h4>
      );
    case 'hr':
      return <hr className="my-6 border-zinc-200 dark:border-zinc-800" />;
    case 'callout':
      return (
        <div className="my-4 rounded-xl border-l-4 border-[#B94A50] bg-[#FCECEB] p-4 dark:border-[#D98C91] dark:bg-[#1E1E22] text-sm text-[#292526] dark:text-[#F6F5F3]">
          <InlineRenderer text={block.text} />
        </div>
      );
    case 'ul':
      return (
        <ul className="my-3 list-disc pl-6 space-y-1.5 text-zinc-700 dark:text-zinc-300">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm sm:text-base leading-relaxed">
              <InlineRenderer text={item} />
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="my-3 list-decimal pl-6 space-y-1.5 text-zinc-700 dark:text-zinc-300">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm sm:text-base leading-relaxed">
              <InlineRenderer text={item} />
            </li>
          ))}
        </ol>
      );
    case 'p':
      return (
        <p className="my-3 text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          <InlineRenderer text={block.text} />
        </p>
      );
    default:
      return null;
  }
}

/**
 * XSS-Safe Inline Parser for Bold, Code, Links, and Placeholder highlights
 */
function InlineRenderer({ text }: { text: string }) {
  // Regex to detect bold (**text**), inline code (`code`), markdown links ([text](url)), and bracketed placeholders ([support@...])
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // 1. Markdown link: [label](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // 2. Bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // 3. Inline code: `code`
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
    ].filter(Boolean) as { type: string; match: RegExpMatchArray; index: number }[];

    if (matches.length === 0) {
      parts.push(renderPlainTextWithPlaceholders(remaining, keyIndex++));
      break;
    }

    // Find the earliest matching token
    matches.sort((a, b) => a.index - b.index);
    const first = matches[0];

    // Push preceding text
    if (first.index > 0) {
      parts.push(renderPlainTextWithPlaceholders(remaining.slice(0, first.index), keyIndex++));
    }

    if (first.type === 'link') {
      const label = first.match[1];
      const rawUrl = first.match[2];
      // Sanitize URL protocol to prevent javascript: or data: XSS
      const isSafe = /^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('/') || rawUrl.startsWith('#');
      const safeUrl = isSafe ? rawUrl : '#';

      if (safeUrl.startsWith('/')) {
        parts.push(
          <Link
            key={keyIndex++}
            href={safeUrl}
            className="font-medium text-[#B94A50] hover:text-[#A13D43] dark:text-[#D98C91] dark:hover:text-[#F6F5F3] hover:underline"
          >
            {label}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={keyIndex++}
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#B94A50] hover:text-[#A13D43] dark:text-[#D98C91] dark:hover:text-[#F6F5F3] hover:underline"
          >
            {label}
          </a>
        );
      }
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === 'bold') {
      parts.push(
        <strong key={keyIndex++} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === 'code') {
      parts.push(
        <code
          key={keyIndex++}
          className="rounded bg-[#FCECEB] px-1.5 py-0.5 font-mono text-xs text-[#B94A50] dark:bg-[#252429] dark:text-[#D98C91]"
        >
          {first.match[1]}
        </code>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return <>{parts}</>;
}

/**
 * Highlights unconfirmed placeholders in brackets like [support@kofyone.com]
 */
function renderPlainTextWithPlaceholders(text: string, baseKey: number): React.ReactNode {
  const placeholderRegex = /\[([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|Pending[^\]]+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    parts.push(
      <span
        key={`${baseKey}-${match.index}`}
        className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-500/30"
        title="Unconfirmed placeholder — Update in Admin Portal"
      >
        {match[0]}
      </span>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return <React.Fragment key={baseKey}>{parts}</React.Fragment>;
}
