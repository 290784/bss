import type { Tx } from "@/server/db";
import { audit } from "@/server/modules/audit";

/** Remove uma pessoa da lista de espera. Só o código vai para a auditoria (nunca nome nem telefone). Devolve se havia alguém para remover. */
export async function removeWaitlistEntry(tx: Tx, adminUserId: string, id: string): Promise<boolean> {
  const r = await tx`delete from app.waitlist where id = ${id} returning id`;
  if (r.length === 0) return false;
  await audit(tx, { userId: adminUserId, organizationId: null }, "admin.waitlist_removed", "waitlist", id);
  return true;
}
