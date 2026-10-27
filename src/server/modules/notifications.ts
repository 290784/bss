import type { Tx } from "@/server/db";

/** Notifica a equipe administrativa (e a profissional do atendimento, se tiver acesso). */
export async function notifyStaff(
  tx: Tx, orgId: string, n: { type: string; title: string; body?: string; link?: string; professionalId?: string },
) {
  await tx`
    insert into app.notifications (organization_id, user_id, type, title, body, link)
    select ${orgId}, m.user_id, ${n.type}, ${n.title}, ${n.body ?? null}, ${n.link ?? null}
    from app.memberships m
    where m.organization_id = ${orgId} and m.status = 'active'
      and (m.role in ('owner', 'manager', 'receptionist') or m.professional_id = ${n.professionalId ?? null}::uuid)`;
}

export async function listNotifications(tx: Tx, orgId: string, userId: string) {
  return tx<{ id: string; title: string; body: string | null; link: string | null; read_at: Date | null; created_at: Date }[]>`
    select id, title, body, link, read_at, created_at from app.notifications
    where organization_id = ${orgId} and user_id = ${userId}
    order by created_at desc limit 20`;
}

export async function markAllRead(tx: Tx, orgId: string, userId: string) {
  await tx`update app.notifications set read_at = now() where organization_id = ${orgId} and user_id = ${userId} and read_at is null`;
}
