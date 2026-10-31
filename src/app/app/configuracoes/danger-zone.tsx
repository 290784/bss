"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { requestAccountDeletionAction } from "./actions";

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <Card>
      <CardHeader title="Privacidade e dados" />
      <div className="flex flex-col gap-3 px-5 pt-3 pb-5 text-sm text-ink-soft">
        <p>Exporte a lista de clientes em CSV pela página <Link className="text-accent-text underline" href="/app/clientes">Clientes</Link>. Exportar tudo (agenda e financeiro) vem aí.</p>
        <div><Button variant="danger" size="sm" onClick={() => setOpen(true)}>Solicitar exclusão da minha conta</Button></div>
      </div>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} danger title="Solicitar exclusão da conta?" confirmLabel="Enviar solicitação"
        description="A gente anota o pedido e confirma com você por e-mail antes de apagar. O que a lei exige guardar fica guardado só pelo prazo obrigatório."
        onConfirm={() => start(async () => { setOpen(false); const r = await requestAccountDeletionAction(); if (r?.ok) toast(r.message!); })} />
    </Card>
  );
}
