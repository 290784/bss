"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { requestAccountDeletionAction } from "./actions";

export function DangerZone({ userId, canExportAgenda, canExportFinance }: { userId: string; canExportAgenda: boolean; canExportFinance: boolean }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <Card>
      <CardHeader art="shield" title="Privacidade e dados" />
      <div className="flex flex-col gap-3 px-5 pt-3 pb-5 sm:px-6 sm:pb-6 text-sm text-ink-soft">
        <p>Seus dados são seus. Baixe em CSV (abre no Excel e no Google Planilhas):</p>
        <ul className="flex flex-col gap-1.5">
          <li><Link className="text-accent-text underline" href="/app/clientes">Clientes</Link>: use o botão Exportar na página.</li>
          {canExportAgenda && <li><a className="text-accent-text underline" href="/app/agenda/exportar">Agenda: atendimentos dos últimos 12 meses</a></li>}
          {canExportFinance && <li><a className="text-accent-text underline" href="/app/relatorios/exportar-pagamentos">Pagamentos e estornos dos últimos 12 meses</a></li>}
        </ul>
        <p className="text-xs text-muted">Para outro período, acrescente <code className="rounded bg-sunken px-1 font-mono">?de=2026-01-01&ate=2026-06-30</code> ao endereço.</p>
        <p className="text-xs text-muted">Código da sua conta (o suporte pode pedir): <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-soft select-all">{userId}</code></p>
        <div><Button variant="danger" size="sm" onClick={() => setOpen(true)}>Solicitar exclusão da minha conta</Button></div>
      </div>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} danger title="Solicitar exclusão da conta?" confirmLabel="Enviar solicitação"
        description="A gente anota o pedido e confirma com você por e-mail antes de apagar. O que a lei exige guardar fica guardado só pelo prazo obrigatório."
        onConfirm={() => start(async () => { setOpen(false); const r = await requestAccountDeletionAction(); if (r?.ok) toast(r.message!); })} />
    </Card>
  );
}
