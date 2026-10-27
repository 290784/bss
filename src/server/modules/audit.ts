import type { Tx } from "@/server/db";

export async function audit(
  tx: Tx,
  actor: { userId: string | null; organizationId: string | null },
  action: string,
  entity: string,
  entityId: string | null,
  data: Record<string, unknown> = {},
) {
  await tx`insert into app.audit_log (organization_id, actor_user_id, action, entity, entity_id, data)
           values (${actor.organizationId}, ${actor.userId}, ${action}, ${entity}, ${entityId}, ${tx.json(data as never)})`;
}

/** Instrumentação de produto (funil de cadastro/ativação). Sem dados pessoais nos props. */
export async function trackEvent(tx: Tx, name: string, orgId: string | null, userId: string | null, props: Record<string, string | number | boolean> = {}) {
  await tx`insert into app.product_events (organization_id, user_id, name, props) values (${orgId}, ${userId}, ${name}, ${tx.json(props)})`;
}
