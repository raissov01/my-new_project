"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

interface InviteCodeCardProps {
  code: string;
}

export function InviteCodeCard({ code }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = `https://studywithraissov.kz/join?code=${code}`;

  const whatsapp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(`Join me on StudyWithRaissov! Use my invite code: ${code}\n${shareUrl}`)}`);

  const telegram = () =>
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Join me on StudyWithRaissov! Code: ${code}`)}`);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800 p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 mb-1">
          Your invite code
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xl font-bold tracking-widest text-indigo-900 dark:text-indigo-100">
            {code}
          </span>
          <button
            onClick={copy}
            aria-label="Copy invite code"
            className="p-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-indigo-500" />}
          </button>
        </div>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
          Friends who join with your code will be added automatically.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={whatsapp}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <Share2 size={14} /> WhatsApp
        </button>
        <button
          onClick={telegram}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
        >
          <Share2 size={14} /> Telegram
        </button>
      </div>
    </div>
  );
}
