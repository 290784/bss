"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-plum-700 p-1 pl-3">
      <span className="min-w-0 flex-1 truncate text-xs text-champagne-100">{url.replace(/^https?:\/\//, "")}</span>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* sem permissão */ } }}
        className="inline-flex h-8 items-center gap-1 rounded-md bg-champagne-100 px-2.5 text-xs font-medium text-plum-900 hover:bg-white">
        {copied ? <><Check className="h-3.5 w-3.5" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}
      </button>
    </div>
  );
}
