"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ClientForm } from "./client-form";

export function NewClientButton({ autoOpen, canInternal }: { autoOpen?: boolean; canInternal: boolean }) {
  const [open, setOpen] = useState(!!autoOpen);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus className="h-4 w-4" />Nova cliente</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nova cliente" side="right">
        <ClientForm canInternal={canInternal} onSaved={(id) => { setOpen(false); router.push(`/app/clientes/${id}`); }} />
      </Dialog>
    </>
  );
}
