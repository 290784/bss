import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const postgres = require("postgres");
/**
 * Onda 1: primeiro horário livre, lembrar dados da cliente, cartão "Próxima cliente",
 * desfazer cancelamento, confirmações em sequência e botões de toque no celular.
 * Usa a conta de demonstração (npm run db:seed-demo) e prepara os horários de hoje pelo banco.
 * Uso: BASE_URL=http://localhost:3000 DATABASE_URL=... node tests/e2e/onda1.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
const b = await chromium.launch();
const ok = (c, m) => { console.log(c ? "✔" : "✘", m); if (!c) process.exitCode = 1; };
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.route("https://wa.me/**", (r) => r.fulfill({ contentType: "text/html", body: "WhatsApp" }));
const p = await ctx.newPage();
const errs = []; p.on("pageerror", (e) => errs.push(e.message));

// Prepara: três atendimentos de hoje — um em andamento e dois logo em seguida (encaixe, para não
// depender da agenda da demo nem cruzar a meia-noite).
// A conta demo (a vitrine também é de demonstração, mas é outra organização).
const [org] = await sql`select o.id, o.slug from app.organizations o join app.users u on u.id = o.created_by where o.is_demo and u.email = 'demo@beautyos.dev' limit 1`;
const [pro] = await sql`select id from app.professionals where organization_id = ${org.id} and is_active order by created_at limit 1`;
const [svc] = await sql`select id, name, price_cents, duration_minutes from app.services where organization_id = ${org.id} and is_active order by name limit 1`;
const created = [];
for (const [i, name] of ["Ana Onda", "Bia Onda", "Cris Onda"].entries()) {
  const [c] = await sql`insert into app.clients (organization_id, full_name, phone, phone_normalized) values (${org.id}, ${name}, ${`1190000${i}111`}, ${`551190000${i}111`}) returning id`;
  const start = new Date(Date.now() + [-10, 10, 15][i] * 60_000);
  const [a] = await sql`insert into app.appointments (organization_id, professional_id, client_id, starts_at, ends_at, blocked_until, status, allow_overlap, price_cents)
    values (${org.id}, ${pro.id}, ${c.id}, ${start}, ${new Date(start.getTime() + 45 * 60_000)}, ${new Date(start.getTime() + 45 * 60_000)}, 'confirmed', true, ${svc.price_cents}) returning id`;
  await sql`insert into app.appointment_services (organization_id, appointment_id, service_id, service_name, price_cents, duration_minutes, position)
    values (${org.id}, ${a.id}, ${svc.id}, ${svc.name}, ${svc.price_cents}, 45, 0)`;
  created.push({ client: c.id, appt: a.id });
}
try {
  // 1) Página pública: primeiro horário livre leva direto aos dados; lembrar dados
  await p.goto(`${BASE}/b/${org.slug}`);
  const chip = p.getByTestId("first-slot").first();
  await chip.waitFor();
  ok(/Próximo horário livre: (hoje|amanhã|\w{3}, \d\d\/\d\d) às \d\d:\d\d/.test(await chip.innerText()), "serviço mostra o próximo horário livre");
  await chip.tap();
  await p.getByLabel("Seu nome").waitFor();
  ok(true, "um toque leva direto para \"Seus dados\"");
  await p.getByLabel("Seu nome").fill("Dani Lembrada");
  await p.getByLabel("WhatsApp").fill("(11) 97654-3210");
  await p.locator('input[name="acceptPolicy"]').check();
  await p.locator('input[name="remember"]').check();
  await p.getByRole("button", { name: /Solicitar agendamento|Confirmar agendamento/ }).tap();
  await p.waitForURL(/\/agendamento\//);
  await p.goto(`${BASE}/b/${org.slug}`);
  await p.getByTestId("first-slot").first().tap();
  await p.getByTestId("saved-client").waitFor();
  ok(await p.getByLabel("Seu nome").inputValue() === "Dani Lembrada" && (await p.getByLabel("WhatsApp").inputValue()).includes("97654"), "próximo agendamento já vem preenchido");
  await p.getByRole("button", { name: "Não sou eu" }).tap();
  ok(await p.getByLabel("Seu nome").inputValue() === "" && await p.evaluate(() => localStorage.getItem("ge-cliente")) === null, "\"Não sou eu\" apaga os dados do aparelho");

  // 2) Painel: cartão "Próxima cliente". O pedido feito pela página pública cai no primeiro horário
  // livre (que pode ser agora) e passaria na frente da Ana: sai da agenda antes de olhar o cartão.
  await sql`update app.appointments a set status = 'cancelled' from app.clients c
    where c.id = a.client_id and a.organization_id = ${org.id} and c.full_name = 'Dani Lembrada' and a.status in ('pending', 'confirmed')`;
  await p.goto(`${BASE}/entrar`);
  await p.getByLabel("E-mail").fill("demo@beautyos.dev"); await p.getByLabel("Senha").fill(process.env.DEMO_PASSWORD ?? "demo-senha-123");
  await p.getByRole("button", { name: "Entrar" }).tap(); await p.waitForURL(/\/app$/);
  const card = p.getByTestId("next-client");
  await card.waitFor();
  const cardText = await card.innerText();
  ok(/próxima cliente · (agora|em \d+ min)/i.test(cardText) && cardText.includes("Ana Onda"), "cartão mostra a próxima cliente e quanto falta");
  ok(cardText.includes("ainda não recebeu a confirmação") && cardText.includes("Depois dela, mais"), "cartão mostra a situação da confirmação e os próximos");
  const [popup] = await Promise.all([p.waitForEvent("popup"), card.getByRole("link", { name: "Enviar confirmação" }).tap()]);
  await popup.close();
  await card.getByText("Você já mandou a confirmação; Ana ainda não respondeu").waitFor();
  ok(true, "enviar pelo cartão registra o envio");

  // 3) Botões do topo com 44 px no celular
  const sizes = await p.evaluate(() => ["Abrir menu", "Usar tema claro", "Notificações"].map((n) => {
    const el = [...document.querySelectorAll("button")].find((x) => (x.getAttribute("aria-label") ?? "").startsWith(n));
    const r = el?.getBoundingClientRect(); return r ? Math.min(r.width, r.height) : 0;
  }));
  ok(sizes.every((s) => s >= 44), `botões do topo com pelo menos 44 px (${sizes.join(", ")})`);

  // 4) Desfazer cancelamento
  await card.getByRole("link", { name: /Abrir atendimento/ }).tap();
  const dlg = p.getByRole("dialog").first();
  await dlg.getByRole("button", { name: "Cancelar", exact: true }).tap();
  await p.getByRole("button", { name: "Cancelar agendamento" }).tap();
  const undo = p.getByRole("button", { name: "Desfazer" });
  await undo.waitFor();
  ok(true, "cancelar mostra o aviso com \"Desfazer\"");
  await undo.tap();
  await p.getByText("Desfeito! O horário voltou para a agenda.").waitFor();
  await p.getByRole("dialog").getByText(/Desfeito: Cancelado → Confirmado/).waitFor();
  const [st] = await sql`select status from app.appointments where id = ${created[0].appt}`;
  ok(st.status === "confirmed", "desfazer devolve o agendamento para Confirmado");
  await p.keyboard.press("Escape");

  // 5) Confirmações em sequência
  await p.goto(`${BASE}/app/agenda?confirmacoes=1`);
  const seqBtn = p.getByRole("button", { name: /Enviar as \d+ pendentes em sequência/ });
  await seqBtn.waitFor();
  await seqBtn.tap();
  const seq = p.getByTestId("sequence");
  const first = await seq.innerText();
  const [pop2] = await Promise.all([p.waitForEvent("popup"), seq.getByRole("link", { name: /Enviar para/ }).tap()]);
  await pop2.close();
  await p.waitForTimeout(300);
  const second = await seq.innerText().catch(() => "");
  ok(/1 de \d+/i.test(first) && /2 de \d+/i.test(second), `sequência avança para a próxima cliente depois do envio (${first.replace(/\n/g, " ")} → ${second.replace(/\n/g, " ")})`);
  ok(await p.getByRole("link", { name: "Confirmações de amanhã" }).count() === 1, "atalho para as confirmações de amanhã");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sem rolagem horizontal");
  ok(errs.length === 0, `sem erros no console${errs.length ? ": " + errs.join(" | ") : ""}`);
} finally {
  for (const c of created) { await sql`delete from app.message_jobs where appointment_id = ${c.appt}`; await sql`delete from app.appointment_services where appointment_id = ${c.appt}`; }
  await sql`delete from app.appointment_events where appointment_id in ${sql(created.map((c) => c.appt))}`.catch(() => {});
  await sql`update app.appointments set status = 'cancelled' where id in ${sql(created.map((c) => c.appt))}`.catch(() => {});
  await sql.end(); await b.close();
}
