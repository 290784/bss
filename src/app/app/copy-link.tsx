"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/10 p-1 pl-3 ring-1 ring-white/15">
      <span className="min-w-0 flex-1 truncate text-xs text-white/90">{url.replace(/^https?:\/\//, "")}</span>
      <button
        onClick={async () => {
          // Se o navegador não deixar copiar, abre o link para a pessoa copiar ou compartilhar dali.
          if (await copyText(url)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
          else window.prompt("Copie o seu link:", url);
        }}
        className="inline-flex h-10 sm:h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-violet-800 hover:bg-violet-100">
        {copied ? <><Check className="h-3.5 w-3.5" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}
      </button>
    </div>
  );
}
