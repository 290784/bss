import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "@/server/db";
import { withSystem } from "@/server/db";
import { asTenant, createOrg, freshDatabase, futureDate } from "../support/db";
import { addServiceToAppointment, changeStatus, createAppointment, listAgenda, recordConfirmationSent, undoLastStatusChange } from "@/server/modules/appointments";
import { firstAvailableSlots } from "@/server/modules/public-booking";
import { addMember } from "../support/db";
import { bookOnline, getPublicBusiness } from "@/server/modules/public-booking";
import { confirmAttendance, getReceipt, receiptIcs } from "@/server/modules/receipt";
import { suggestRelatedServices } from "@/server/modules/upsell";
import { dispatchDueMessages, type OutgoingMessage } from "@/server/modules/messaging";

let sql: Sql;
let A: Awaited<ReturnType<typeof createOrg>>;
const svc: Record<string, string> = {};
const actor = () => ({ userId: A.ownerId, organizationId: A.orgId });

async function service(name: string, price: number, minutes: number, opts: { category?: string; prof?: boolean; buffer?: number } = {}) {
  const [s] = await sql<{ id: string }[]>`
    insert into app.services (organization_id, name, price_cents, duration_minutes, buffer_after_minutes, category_id)
    values (${A.orgId}, ${name}, ${price}, ${minutes}, ${opts.buffer ?? 0}, ${opts.category ?? null}) returning id`;
  if (opts.prof !== false)
    await sql`insert into app.professional_services (organization_id, professional_id, service_id) values (${A.orgId}, ${A.professionalId}, ${s!.id})`;
  return s!.id;
}
async function client(name: string, phone: string) {
  const [c] = await sql<{ id: string }[]>`insert into app.clients (organization_id, full_name, phone, phone_normalized)
    values (${A.orgId}, ${name}, ${phone}, ${phone}) returning id`;
  return c!.id;
}

beforeAll(async () => {
  sql = await freshDatabase();
  A = await createOrg(sql, "Studio Delta");
  await sql`update app.organizations set online_requires_approval = false, address = 'Rua das Flores, 10', phone = '11988887777' where id = ${A.orgId}`;
  const [unhas] = await sql<{ id: string }[]>`insert into app.service_categories (organization_id, name) values (${A.orgId}, 'Unhas') returning id`;
  const [cera] = await sql<{ id: string }[]>`insert into app.service_categories (organization_id, name) values (${A.orgId}, 'Depilação') returning id`;
  await sql`update app.services set category_id = ${unhas!.id} where id = ${A.serviceId}`;
  svc.manicure = A.serviceId;
  svc.pedicure = await service("Pedicure", 6000, 40, { buffer: 0 });
  svc.gel = await service("Esmaltação em gel", 3000, 30, { category: unhas!.id });
  svc.massagem = await service("Massagem", 9000, 60, { prof: false }); // outra profissional faria
  svc.cera = await service("Depilação de buço", 2500, 15, { category: cera!.id }); // sem relação

  // Histórico real: duas clientes fizeram manicure e também pedicure.
  for (const [i, name] of ["Ana Lima", "Bia Souza"].entries()) {
    const c = await client(name, `551197777000${i}`);
    for (const [j, ids] of [[svc.manicure], [svc.pedicure]].entries()) {
      const a = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
        professionalId: A.professionalId, clientId: c, serviceIds: ids!, date: futureDate(2 + i), time: j ? "15:00" : "09:00",
        squeezeIn: false, status: "confirmed",
      }));
      await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), a.id, "completed"));
    }
  }
});
afterAll(() => sql.end());

describe("agendamento online → comprovante, aviso à equipe e sugestões", () => {
  const date = futureDate(20);
  let token = "";
  let apptId = "";

  it("agendamento confirmado avisa a equipe que a cliente confirmou, com sugestões para subir o ticket", async () => {
    // Outro compromisso às 11:30 limita o que cabe depois do horário das 10:00.
    await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
      professionalId: A.professionalId, clientId: A.clientId, serviceIds: [svc.gel!], date, time: "11:30", squeezeIn: false, status: "confirmed",
    }));
    const biz = (await withSystem((tx) => getPublicBusiness(tx, A.slug), sql))!;
    const res = await withSystem((tx) => bookOnline(tx, biz, {
      serviceId: svc.manicure!, professionalId: null, date, time: "10:00",
      fullName: "Carla Mendes", phone: "(11) 96666-5555", email: "", acceptPolicy: true, marketingConsent: false,
    }), sql);
    expect(res.status).toBe("confirmed");
    expect(res.token).toMatch(/^[a-f0-9]{64}$/);
    token = res.token; apptId = res.appointmentId;

    const [n] = await sql`select title, body, link from app.notifications where organization_id = ${A.orgId} and type = 'online_booking' and user_id = ${A.ownerId}`;
    expect(n!.title).toBe("Carla confirmou um agendamento");
    expect(n!.body).toContain("Manicure");
    expect(n!.body).toContain("Para subir o ticket: Pedicure (+R$");
    expect(n!.body).not.toContain("Massagem");
    expect(n!.body).not.toContain("Depilação");
    expect(n!.link).toContain(`agendamento=${apptId}`);
  });

  it("sugestões vêm do histórico, depois da mesma categoria, e dizem se cabem logo depois", async () => {
    const s = await asTenant(sql, A.ownerId, A.orgId, (tx) => suggestRelatedServices(tx, A.orgId, apptId));
    expect(s.map((x) => x.name)).toEqual(["Pedicure", "Esmaltação em gel"]);
    expect(s[0]).toMatchObject({ peers: 2, fitsRightAfter: false }); // 11:15 + 40 min bate no compromisso das 11:30
    expect(s[0]!.reason).toMatch(/2 clientes que fizeram/);
    expect(s[1]).toMatchObject({ peers: 0, fitsRightAfter: true, reason: "Da mesma categoria do serviço agendado" });
  });

  it("comprovante completo pelo link, só com slug e token corretos", async () => {
    const r = (await withSystem((tx) => getReceipt(tx, A.slug, token), sql))!;
    expect(r).toMatchObject({ status: "confirmed", clientFirstName: "Carla", professionalName: expect.any(String), priceCents: 5000 });
    expect(r.services).toEqual([{ name: "Manicure", minutes: 60, priceCents: 5000 }]);
    expect(r.business).toMatchObject({ address: "Rua das Flores, 10", phone: "11988887777" });
    expect(await withSystem((tx) => getReceipt(tx, "outro-slug", token), sql)).toBeNull();
    expect(await withSystem((tx) => getReceipt(tx, A.slug, "0".repeat(64)), sql)).toBeNull();
    expect(await withSystem((tx) => getReceipt(tx, A.slug, "x' or 1=1 --"), sql)).toBeNull();
    const ics = receiptIcs(r, "https://exemplo/b/x");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toContain("LOCATION:Rua das Flores\\, 10");
  });

  it("cliente confirma presença: registra, avisa a equipe uma vez só", async () => {
    await withSystem((tx) => confirmAttendance(tx, A.slug, token), sql);
    await withSystem((tx) => confirmAttendance(tx, A.slug, token), sql);
    const [a] = await sql`select client_confirmed_at from app.appointments where id = ${apptId}`;
    expect(a!.client_confirmed_at).toBeInstanceOf(Date);
    const notes = await sql`select title, body from app.notifications where type = 'client_confirmed' and user_id = ${A.ownerId}`;
    expect(notes).toHaveLength(1);
    expect(notes[0]!.title).toBe("Carla confirmou presença");
    expect(notes[0]!.body).toContain("Para subir o ticket:");
    const ev = await sql`select type from app.appointment_events where appointment_id = ${apptId} and type = 'client_confirmed'`;
    expect(ev).toHaveLength(1);
  });

  it("adicionar serviço sugerido estende o horário e o valor; o que não cabe é recusado", async () => {
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) =>
      addServiceToAppointment(tx, actor(), { appointmentId: apptId, serviceId: svc.pedicure! }))).rejects.toThrow(/ocupado/);
    await asTenant(sql, A.ownerId, A.orgId, (tx) => addServiceToAppointment(tx, actor(), { appointmentId: apptId, serviceId: svc.gel! }));
    const [a] = await sql`select price_cents, ends_at - starts_at as dur from app.appointments where id = ${apptId}`;
    expect(a!.price_cents).toBe(8000);
    const services = await sql`select service_name from app.appointment_services where appointment_id = ${apptId} order by position`;
    expect(services.map((x) => x.service_name)).toEqual(["Manicure", "Esmaltação em gel"]);
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) =>
      addServiceToAppointment(tx, actor(), { appointmentId: apptId, serviceId: svc.gel! }))).rejects.toThrow(/já está/);
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) =>
      addServiceToAppointment(tx, actor(), { appointmentId: apptId, serviceId: svc.massagem! }))).rejects.toThrow(/não realiza/);
    const r = (await withSystem((tx) => getReceipt(tx, A.slug, token), sql))!;
    expect(r.services.map((s) => s.name)).toEqual(["Manicure", "Esmaltação em gel"]); // comprovante já mostra o novo total
  });

  it("pedido aguardando aprovação também pode confirmar presença; cancelado não", async () => {
    await sql`update app.organizations set online_requires_approval = true where id = ${A.orgId}`;
    const biz = (await withSystem((tx) => getPublicBusiness(tx, A.slug), sql))!;
    const res = await withSystem((tx) => bookOnline(tx, biz, {
      serviceId: svc.manicure!, professionalId: null, date: futureDate(21), time: "14:00",
      fullName: "Pedro Alves", phone: "(21) 98211-0308", email: "", acceptPolicy: true, marketingConsent: false,
    }), sql);
    await sql`update app.organizations set online_requires_approval = false where id = ${A.orgId}`;
    expect(res.status).toBe("pending");
    // Abrir o comprovante não confirma nada
    await withSystem((tx) => getReceipt(tx, A.slug, res.token), sql);
    expect((await sql`select client_confirmed_at from app.appointments where id = ${res.appointmentId}`)[0]!.client_confirmed_at).toBeNull();
    await withSystem((tx) => confirmAttendance(tx, A.slug, res.token), sql);
    const [a] = await sql`select status, client_confirmed_at from app.appointments where id = ${res.appointmentId}`;
    expect(a!.status).toBe("pending"); // a aprovação continua com o estabelecimento
    expect(a!.client_confirmed_at).toBeInstanceOf(Date);
    const [n] = await sql`select title from app.notifications where type = 'client_confirmed' and user_id = ${A.ownerId} order by created_at desc limit 1`;
    expect(n!.title).toBe("Pedro confirmou presença");
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), res.appointmentId, "cancelled"));
    await sql`update app.appointments set client_confirmed_at = null where id = ${res.appointmentId}`;
    await expect(withSystem((tx) => confirmAttendance(tx, A.slug, res.token), sql)).rejects.toThrow(/não pode mais/);
  });

  it("reenvio da confirmação fica registrado e aparece na agenda", async () => {
    const day = new Date(Date.parse(`${date}T00:00:00-03:00`));
    const range = [day, new Date(day.getTime() + 86_400_000)] as const;
    let [item] = (await asTenant(sql, A.ownerId, A.orgId, (tx) => listAgenda(tx, A.orgId, ...range))).filter((i) => i.id === apptId);
    expect(item).toMatchObject({ confirmation_sent_at: null, public_token: token, service_names: ["Manicure", "Esmaltação em gel"] });
    expect(item!.client_confirmed_at).toBeInstanceOf(Date);
    await asTenant(sql, A.ownerId, A.orgId, (tx) => recordConfirmationSent(tx, actor(), apptId));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => recordConfirmationSent(tx, actor(), apptId));
    [item] = (await asTenant(sql, A.ownerId, A.orgId, (tx) => listAgenda(tx, A.orgId, ...range))).filter((i) => i.id === apptId);
    expect(item!.confirmation_sent_at).toBeInstanceOf(Date);
    const ev = await sql`select data from app.appointment_events where appointment_id = ${apptId} and type = 'confirmation_sent'`;
    expect(ev).toHaveLength(2);
    expect(ev[0]!.data).toEqual({ via: "whatsapp" });
  });

  it("a mensagem de confirmação leva o link do comprovante (quando houver canal conectado)", async () => {
    const sent: OutgoingMessage[] = [];
    await dispatchDueMessages(sql, [{ channel: "whatsapp", send: async (m) => { sent.push(m); return { providerMessageId: m.idempotencyKey }; } }]);
    const mine = sent.find((m) => m.idempotencyKey.includes(apptId) && m.template === "appointment_confirmation");
    expect(mine?.variables.link).toMatch(new RegExp(`/b/${A.slug}/agendamento/${token}$`));
    expect(mine?.variables.servicos).toBe("Manicure + Esmaltação em gel");
    expect(mine?.variables.mensagem).toMatch(/^Oi, Carla! 😊 Tudo bem\? Passando pra confirmar seu horário de manicure e esmaltação em gel, na .+-feira \(\d\d\/\d\d\), às 10h, com /);
    expect(mine?.variables.mensagem).toContain(`🔗 Ver meu agendamento:\n${mine?.variables.link}`);
  });
});

describe("onda 1: desfazer e primeiro horário livre", () => {
  it("desfazer cancelamento devolve o horário e os lembretes; só quem fez, logo em seguida", async () => {
    const date = futureDate(25);
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
      professionalId: A.professionalId, clientId: A.clientId, serviceIds: [svc.manicure!], date, time: "09:00", squeezeIn: false, status: "confirmed",
    }));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), appt.id, "cancelled", "engano"));
    const manager = await addMember(sql, A.orgId, "manager");
    await expect(asTenant(sql, manager, A.orgId, (tx) => undoLastStatusChange(tx, { userId: manager, organizationId: A.orgId }, appt.id)))
      .rejects.toThrow(/Não há uma mudança recente/);
    await asTenant(sql, A.ownerId, A.orgId, (tx) => undoLastStatusChange(tx, actor(), appt.id));
    const [a] = await sql`select status, cancelled_at, cancel_reason from app.appointments where id = ${appt.id}`;
    expect(a).toMatchObject({ status: "confirmed", cancelled_at: null, cancel_reason: null });
    const jobs = await sql`select template, status from app.message_jobs where appointment_id = ${appt.id} order by template`;
    expect(jobs.find((j) => j.template === "appointment_reminder")?.status).toBe("pending");
    expect(jobs.find((j) => j.template === "appointment_cancelled")?.status ?? "cancelled").toBe("cancelled");
    // Desfazer de novo não repete (a última mudança agora é o próprio desfazer, que volta ao cancelado).
    const ev = await sql`select type from app.appointment_events where appointment_id = ${appt.id} order by created_at`;
    expect(ev.map((e) => e.type)).toEqual(["created", "status_changed", "status_reverted"]);
  });

  it("desfazer recusa quando o horário já foi ocupado", async () => {
    const date = futureDate(26);
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
      professionalId: A.professionalId, clientId: A.clientId, serviceIds: [svc.manicure!], date, time: "10:00", squeezeIn: false, status: "confirmed",
    }));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), appt.id, "cancelled"));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
      professionalId: A.professionalId, clientId: A.clientId, serviceIds: [svc.manicure!], date, time: "10:00", squeezeIn: false, status: "confirmed",
    }));
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => undoLastStatusChange(tx, actor(), appt.id))).rejects.toThrow(/já foi ocupado/);
  });

  it("desfazer só vale por 2 minutos", async () => {
    const appt = await asTenant(sql, A.ownerId, A.orgId, (tx) => createAppointment(tx, actor(), {
      professionalId: A.professionalId, clientId: A.clientId, serviceIds: [svc.manicure!], date: futureDate(27), time: "11:00", squeezeIn: false, status: "confirmed",
    }));
    await asTenant(sql, A.ownerId, A.orgId, (tx) => changeStatus(tx, actor(), appt.id, "no_show"));
    await sql`update app.appointment_events set created_at = now() - interval '3 minutes' where appointment_id = ${appt.id} and type = 'status_changed'`;
    await expect(asTenant(sql, A.ownerId, A.orgId, (tx) => undoLastStatusChange(tx, actor(), appt.id))).rejects.toThrow(/Não há uma mudança recente/);
  });

  it("primeiro horário livre respeita agenda ocupada, limpeza e antecedência", async () => {
    const date = futureDate(30);
    // Dia todo ocupado das 08:00 às 12:00 com bloqueio; manicure (60 + 15 de limpeza) só cabe depois.
    const now = new Date(`${futureDate(29)}T23:00:00-03:00`);
    await sql`insert into app.time_off (organization_id, professional_id, starts_at, ends_at, reason)
              values (${A.orgId}, ${A.professionalId}, ${`${date}T08:00:00-03:00`}, ${`${date}T12:00:00-03:00`}, 'Curso')`;
    const biz = (await withSystem((tx) => getPublicBusiness(tx, A.slug), sql))!;
    const first = await withSystem((tx) => firstAvailableSlots(tx, biz, now), sql);
    expect(first[svc.manicure!]).toEqual({ date, time: "12:00" });
    // Com 26 h de antecedência mínima, o primeiro dia possível passa a ser o seguinte.
    await sql`update app.organizations set min_advance_minutes = ${26 * 60} where id = ${A.orgId}`;
    const later = await withSystem((tx) => firstAvailableSlots(tx, biz, now), sql);
    await sql`update app.organizations set min_advance_minutes = 0 where id = ${A.orgId}`;
    expect(later[svc.manicure!]!.date > date).toBe(true);
  });
});
