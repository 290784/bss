"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { IMPORT_MAX_CHARS } from "@/domain/client-import";
import { confirmClientImportAction, previewClientImportAction, type ImportPreview } from "./importar-actions";

type Step = "escolher" | "revisar" | "pronto";

/** Importa clientes de uma planilha CSV: escolhe o arquivo, revê o que vai acontecer e só então grava. */
export function ImportClientsButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("escolher");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();

  const reset = () => { setStep("escolher"); setCsv(""); setFileName(""); setPreview(null); setError(null); setDone(null); if (input.current) input.current.value = ""; };
  const close = () => { setOpen(false); if (step === "pronto") router.refresh(); setTimeout(reset, 200); };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const text = await file.text();
    if (text.length > IMPORT_MAX_CHARS) { setError("O arquivo é grande demais. Divida em partes de até 5.000 clientes."); return; }
    setCsv(text); setFileName(file.name);
    start(async () => {
      const r = await previewClientImportAction(text);
      if (r?.ok && r.data) { setPreview(r.data); setStep("revisar"); }
      else setError(r && !r.ok ? r.message : "Não consegui ler o arquivo.");
    });
  };

  const confirm = () => start(async () => {
    const r = await confirmClientImportAction(csv);
    if (r?.ok && r.data) { setDone(r.data); setStep("pronto"); toast(r.message ?? "Importação concluída."); }
    else setError(r && !r.ok ? r.message : "Não consegui importar.");
  });

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Upload className="h-4 w-4" />Importar planilha</Button>
      <Dialog open={open} onClose={close} title="Importar clientes" side="right"
        description="Traga sua lista de outro sistema, do Excel ou do Google Sheets."
        footer={step === "revisar" && preview ? (
          <>
            <Button variant="ghost" onClick={reset} disabled={pending}>Escolher outro arquivo</Button>
            <Button onClick={confirm} disabled={pending || preview.willCreate === 0}>
              {pending ? "Importando…" : `Importar ${preview.willCreate} ${preview.willCreate === 1 ? "cliente" : "clientes"}`}
            </Button>
          </>
        ) : step === "pronto" ? <Button onClick={close}>Ver minhas clientes</Button> : undefined}>
        {step === "escolher" && (
          <div className="flex flex-col gap-4 text-sm text-ink-soft">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>No seu sistema atual (ou na planilha), exporte para <b className="font-semibold text-ink">CSV</b>. No Excel e no Google Sheets: Arquivo, Salvar ou Baixar como CSV.</li>
              <li>A primeira linha precisa ter os nomes das colunas: <b className="font-semibold text-ink">nome</b> (obrigatório), telefone, e-mail, nascimento e observações.</li>
              <li>Escolha o arquivo abaixo. Você confere tudo antes de importar.</li>
            </ol>
            <a href="/app/clientes/importar/modelo" download="modelo-importar-clientes.csv" className="inline-flex w-fit items-center gap-2 font-medium text-accent-text underline"><FileSpreadsheet className="h-4 w-4" />Baixar planilha modelo</a>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-gold-line/60 bg-sunken/50 px-4 py-8 text-center transition-colors hover:border-accent-muted">
              <Upload className="h-5 w-5 text-gold-ink" />
              <span className="font-medium text-ink">{pending ? "Lendo o arquivo…" : "Escolher arquivo CSV"}</span>
              <span className="text-xs text-muted">Até 5.000 clientes por arquivo</span>
              <input ref={input} type="file" accept=".csv,.txt,text/csv" className="sr-only" disabled={pending} onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            {error && <p role="alert" className="rounded-xl bg-st-noshow-bg px-3 py-2 text-[13px] text-st-noshow">{error}</p>}
          </div>
        )}

        {step === "revisar" && preview && (
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-xs text-muted">Arquivo: {fileName} · {preview.total.toLocaleString("pt-BR")} linhas</p>
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["Vão entrar", preview.willCreate, "text-ink"],
                ["Já existiam", preview.existing, "text-ink-soft"],
                ["Repetidas no arquivo", preview.inFile, "text-ink-soft"],
                ["Linhas com erro", preview.errorCount, preview.errorCount ? "text-st-noshow" : "text-ink-soft"],
              ].map(([k, v, tone]) => (
                <div key={String(k)} className="rounded-xl bg-sunken px-3 py-2"><dt className="text-[11px] text-muted">{k}</dt><dd className={`text-lg font-bold tabular ${tone}`}>{Number(v).toLocaleString("pt-BR")}</dd></div>
              ))}
            </dl>
            {preview.sample.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold text-muted">As primeiras que vão entrar</h3>
                <ul className="divide-y divide-line/70 rounded-xl border border-line/70">
                  {preview.sample.map((s) => (
                    <li key={s.line} className="px-3 py-2"><span className="font-semibold text-ink">{s.fullName}</span> <span className="text-xs text-muted">{[s.phone, s.email].filter(Boolean).join(" · ")}</span></li>
                  ))}
                </ul>
              </div>
            )}
            {preview.errors.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold text-st-noshow">Linhas que ficam de fora ({preview.errorCount})</h3>
                <ul className="space-y-1 text-[13px] text-ink-soft">{preview.errors.map((e) => <li key={e.line}>Linha {e.line}: {e.message}</li>)}</ul>
                {preview.errorCount > preview.errors.length && <p className="mt-1 text-xs text-muted">e mais {preview.errorCount - preview.errors.length}.</p>}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-semibold text-highlight-text">Entram, mas sem um dado ({preview.warningCount})</h3>
                <ul className="space-y-1 text-[13px] text-ink-soft">{preview.warnings.map((w, i) => <li key={`${w.line}-${i}`}>Linha {w.line}: {w.message}</li>)}</ul>
                {preview.warningCount > preview.warnings.length && <p className="mt-1 text-xs text-muted">e mais {preview.warningCount - preview.warnings.length}.</p>}
              </div>
            )}
            <p className="rounded-xl bg-highlight-subtle px-3 py-2 text-[13px] text-highlight-text">As clientes importadas entram <b className="font-semibold">sem consentimento para mensagens de marketing</b>: o consentimento só vale quando a própria cliente der. Quem já existe (mesmo telefone ou e-mail) não é duplicada nem alterada.</p>
            {error && <p role="alert" className="rounded-xl bg-st-noshow-bg px-3 py-2 text-[13px] text-st-noshow">{error}</p>}
          </div>
        )}

        {step === "pronto" && done && (
          <div className="flex flex-col gap-2 text-sm text-ink-soft">
            <p className="text-base font-semibold text-ink">{done.created} {done.created === 1 ? "cliente importada" : "clientes importadas"}.</p>
            {done.skipped > 0 && <p>{done.skipped} {done.skipped === 1 ? "linha ficou" : "linhas ficaram"} de fora (já existiam, repetidas ou com erro).</p>}
            <p>Elas já aparecem na lista de clientes e podem ser agendadas.</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
