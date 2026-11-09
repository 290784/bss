import type { EmailMessage } from "@/server/email";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(titulo: string, paragrafos: string[], botao: { texto: string; url: string }, rodape: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f3ee;font-family:Arial,sans-serif;color:#1e1a17">
<div style="max-width:480px;margin:0 auto;padding:32px 20px"><div style="font-family:Georgia,serif;font-size:28px;color:#642350">Gê</div>
<h1 style="font-family:Georgia,serif;font-size:22px;margin:16px 0 8px">${esc(titulo)}</h1>
${paragrafos.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${esc(p)}</p>`).join("")}
<p style="margin:20px 0"><a href="${esc(botao.url)}" style="background:#642350;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;display:inline-block">${esc(botao.texto)}</a></p>
<p style="font-size:12px;color:#6b5a64;line-height:1.5">Se o botão não abrir, copie este endereço no navegador:<br>${esc(botao.url)}</p>
<p style="font-size:12px;color:#6b5a64">${esc(rodape)}</p></div></body></html>`;
}

export function resetPasswordEmail(to: string, url: string): EmailMessage {
  const rodape = "Se não foi você, ignore este e-mail: sua senha continua a mesma.";
  return {
    to, subject: "Redefina sua senha da Gê",
    text: `Oi! Recebemos um pedido para redefinir a sua senha da Gê. O link vale por 1 hora e só pode ser usado uma vez:\n\n${url}\n\n${rodape}`,
    html: layout("Redefina sua senha", ["Recebemos um pedido para redefinir a sua senha da Gê.", "O link vale por 1 hora e só pode ser usado uma vez."], { texto: "Escolher nova senha", url }, rodape),
  };
}

export function verifyEmailEmail(to: string, url: string): EmailMessage {
  const rodape = "Se você não criou uma conta na Gê, ignore este e-mail.";
  return {
    to, subject: "Confirme seu e-mail na Gê",
    text: `Bem-vinda à Gê! Confirme seu e-mail pelo link (vale por 7 dias):\n\n${url}\n\n${rodape}`,
    html: layout("Confirme seu e-mail", ["Bem-vinda à Gê! Falta só confirmar que este e-mail é seu.", "O link vale por 7 dias."], { texto: "Confirmar e-mail", url }, rodape),
  };
}
