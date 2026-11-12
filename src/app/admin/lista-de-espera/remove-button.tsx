"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { removeFromWaitlistAction } from "./actions";

export function RemoveFromWaitlist({ id, nome }: { id: string; nome: string }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Remover</Button>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} danger title={`Remover ${nome} da lista?`} confirmLabel="Remover"
        description="Apaga o nome, o WhatsApp e os demais dados dessa pessoa do banco. Isso não dá para desfazer."
        onConfirm={() => start(async () => { setOpen(false); const r = await removeFromWaitlistAction(id); toast(r?.message ?? ""); })} />
    </>
  );
}
