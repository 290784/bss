"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ClientForm, type ClientFormValues } from "../client-form";
import { archiveClientAction } from "../actions";

export function ClientEditor({ client, canEdit, canInternal, canArchive, archived }: { client: ClientFormValues; canEdit: boolean; canInternal: boolean; canArchive: boolean; archived: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!canEdit) return null;
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}><Pencil className="h-4 w-4" />Editar</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Editar cliente" side="right">
        <ClientForm initial={client} canInternal={canInternal} onSaved={() => setOpen(false)} />
        {canArchive && (
          <div className="mt-8 border-t border-line pt-4">
            <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>{archived ? "Restaurar cliente" : "Arquivar cliente"}</Button>
            <p className="mt-2 text-xs text-muted">Arquivar oculta a cliente das listas sem apagar o histórico de atendimentos e pagamentos.</p>
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} danger={!archived}
        title={archived ? "Restaurar cliente?" : "Arquivar cliente?"} confirmLabel={archived ? "Restaurar" : "Arquivar"}
        description={archived ? "Ela voltará a aparecer nas listas." : "O histórico é preservado e você pode restaurar a qualquer momento."}
        onConfirm={() => start(async () => {
          setConfirm(false);
          const r = await archiveClientAction(client.id!, !archived);
          if (r?.ok) { toast(r.message!); setOpen(false); router.refresh(); } else if (r) toast(r.message, "error");
        })} />
    </>
  );
}
