'use client';

import { useState } from 'react';
import { Bot, Copy, PlayCircle, Radio } from 'lucide-react';
import { SHOWCASE_ANCHORS } from '@/lib/content/showcaseChrome';

interface MissionLauncherProps {
  registering: boolean;
  native: boolean;
  registrationError: boolean;
  prompt: string;
  guidedActive: boolean;
  guidedBusy: boolean;
  onRunGuided: () => void;
}

/**
 * Two clearly distinguished paths: (A) a genuine WebMCP-capable browser agent, whose status here
 * only ever reports real registration outcomes; and (B) a guided replay of the same descriptors,
 * for visitors without an agent. Neither path is ever relabeled as the other.
 */
export function MissionLauncher({ registering, native, registrationError, prompt, guidedActive, guidedBusy, onRunGuided }: MissionLauncherProps) {
  const [copied, setCopied] = useState(false);

  const status = registering
    ? { text: 'Checking for native WebMCP…', tone: 'text-slate-500' }
    : registrationError
      ? { text: 'Registration failed — guided mission available', tone: 'text-amber-700' }
      : native
        ? { text: 'Native WebMCP detected', tone: 'text-emerald-700' }
        : { text: 'Native WebMCP not detected', tone: 'text-slate-600' };

  async function copyPrompt() {
    try {
      await navigator.clipboard?.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard access can be denied by the browser; the prompt remains visible to copy by hand. */
    }
  }

  // The single canonical mission anchor (`webmcp-mission`), renamed from the earlier
  // `mission-launcher` id rather than duplicated, so the header's "Run Demo", the hero's
  // "Start the 90-second demo", and this section can never point at different targets.
  // Arriving here only scrolls and focuses the region — it never invokes a WebMCP tool.
  return (
    <section
      id={SHOWCASE_ANCHORS.mission}
      tabIndex={-1}
      aria-labelledby="webmcp-mission-heading"
      className="showcase-anchor mx-auto max-w-7xl px-4 pb-6 outline-none sm:px-6"
    >
      <h2 id="webmcp-mission-heading" className="sr-only">
        Run the WebMCP demo
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-slate-700" aria-hidden="true" />
            <h2 className="font-bold text-slate-900">Try with a browser agent</h2>
          </div>
          <p role="status" className={`mt-2 text-sm font-semibold ${status.tone}`}>{status.text}</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Open this page in a WebMCP-enabled browser.</li>
            <li>Give the browser agent this mission.</li>
            <li>Watch Mission Control update as tools are invoked.</li>
          </ol>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">{prompt}</div>
          <button
            onClick={copyPrompt}
            className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy prompt'}
          </button>
          <p className="mt-2 text-xs text-slate-500">Copying the prompt does not run the agent — it hands the shopper mission to whatever browser agent you connect.</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-emerald-700" aria-hidden="true" />
            <h2 className="font-bold text-slate-900">Watch guided mission</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            No WebMCP agent connected? Watch the complete flow run through the exact same
            RetailAgentOS handlers, without an external agent.
          </p>
          <button
            onClick={onRunGuided}
            disabled={guidedBusy || registering}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            <PlayCircle size={16} aria-hidden="true" /> {guidedBusy ? 'Guided mission running…' : 'Watch guided WebMCP mission'}
          </button>
          {guidedActive && (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Guided replay · Same RetailAgentOS handlers · No external agent
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
