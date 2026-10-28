import { useMemo, useState } from "react";
import { studio } from "@/data/studio";
import { criarProvedorWhatsApp } from "@/services/booking";
import { formatarDuracao, formatarPreco } from "@/utils/format";
import { NOMES_DIAS, hora, situacao } from "@/utils/openingHours";
import { useAgora } from "@/hooks/useAgora";
import { Seo } from "@/components/layout/Seo";
import { Logo, Sparkles } from "@/components/ui/Brand";
import { AccordionItem } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { ButtonA } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { cn } from "@/lib/cn";
import type { DiaSemana } from "@/data/types";

const provedor = criarProvedorWhatsApp(studio);
// TODO: "Efetuar login" da página de referência fica fora da fase 1 (sem conta de cliente ainda).

export default function Agendar() {
  const { agendamento, marca, contato, horarios, seo } = studio;
  const [aberto, setAberto] = useState<string | null>(null);
  // Profissional escolhida por serviço (com uma só profissional, já vem marcada).
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const profPor = (id: string) => agendamento.profissionais.find((p) => p.id === id);

  return (
    <>
      <Seo titulo={seo.agendar.titulo} descricao={seo.agendar.descricao} caminho="/agendar" />
      <section className="bg-marca relative mt-4 overflow-hidden rounded-card px-5 py-7 text-sobre-marca shadow-card" aria-label="Studio">
        <Sparkles />
        <div className="relative flex flex-col items-start gap-3">
          <Logo tamanho="md" claro />
          <div>
            <h1 className="text-xl font-extrabold">{marca.nome}</h1>
            <p className="mt-0.5 flex items-center gap-1 text-base text-sobre-marca-suave"><Icon name="pino" className="h-4 w-4" />{marca.cidade}</p>
          </div>
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-4" aria-labelledby="titulo-servicos">
        <SectionTitle id="titulo-servicos" sub={agendamento.textoApoio}>Serviços</SectionTitle>
        <div className="flex flex-col gap-3">
          {agendamento.servicos.map((s) => {
            const profs = s.profissionais.map(profPor).filter((p) => !!p);
            const escolhida = escolha[s.id] ?? (profs.length === 1 ? profs[0]!.id : undefined);
            const prof = escolhida ? profPor(escolhida) : undefined;
            const destino = prof ? provedor.concluir({ servico: s, profissional: prof }) : null;
            return (
              <AccordionItem key={s.id} aberto={aberto === s.id} onToggle={() => setAberto(aberto === s.id ? null : s.id)}
                titulo={s.nome} resumo={`${formatarDuracao(s.duracaoMin)} · ${formatarPreco(s.precoCentavos)}`}>
                <dl className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-afundado px-3 py-2"><dt className="text-sm text-texto-apoio">Duração</dt><dd className="font-semibold text-texto">{formatarDuracao(s.duracaoMin)}</dd></div>
                  <div className="rounded-xl bg-afundado px-3 py-2"><dt className="text-sm text-texto-apoio">Valor</dt><dd className="font-semibold text-texto tabular">{formatarPreco(s.precoCentavos)}</dd></div>
                </dl>
                <fieldset className="mt-4">
                  <legend className="mb-2 text-sm font-medium text-texto-suave">{agendamento.textoProfissional}</legend>
                  <div className="flex flex-wrap gap-2">
                    {profs.map((p) => {
                      const sel = escolhida === p.id;
                      return (
                        <label key={p.id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-full border py-1.5 pr-4 pl-1.5 transition",
                          sel ? "border-primaria bg-primaria-suave" : "border-borda hover:border-borda-forte")}>
                          <input type="radio" name={`prof-${s.id}`} value={p.id} checked={sel} onChange={() => setEscolha({ ...escolha, [s.id]: p.id })} className="sr-only" />
                          <span aria-hidden className="bg-marca grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-sobre-marca">
                            {p.foto ? <img src={p.foto.src} alt="" className="h-9 w-9 rounded-full object-cover" /> : p.nome.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                          </span>
                          <span className="font-medium text-texto">{p.nome}</span>
                          {sel && <Icon name="check" className="h-4 w-4 text-primaria-texto" />}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                {destino ? (
                  <ButtonA href={destino.url} className="mt-4 w-full" data-mensagem={destino.mensagem}>
                    <Icon name="whatsapp" className="h-5 w-5" />Agendar pelo WhatsApp
                  </ButtonA>
                ) : (
                  <p className="mt-4 text-sm text-texto-apoio">Escolha a profissional para agendar.</p>
                )}
              </AccordionItem>
            );
          })}
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Contato endereco={`${contato.endereco.linha}, ${contato.endereco.bairro}, ${contato.endereco.cidade} – ${contato.endereco.uf}`} />
        <Horarios faixas={horarios.faixas} fuso={horarios.fuso} observacao={horarios.observacao} />
      </div>
    </>
  );
}

function Contato({ endereco }: { endereco: string }) {
  const { whatsapp } = studio.contato;
  return (
    <Card as="section" className="flex flex-col gap-3 p-5" aria-labelledby="titulo-contato">
      <SectionTitle id="titulo-contato" as="h2">Contato</SectionTitle>
      <p className="flex gap-2 text-base text-texto-suave"><Icon name="pino" className="mt-0.5 h-5 w-5 shrink-0 text-primaria-texto" />{endereco}</p>
      <a href={`tel:+${whatsapp.ddi}${whatsapp.numero}`} className="flex min-h-11 items-center gap-2 text-base font-semibold text-texto underline-offset-4 hover:underline">
        <Icon name="telefone" className="h-5 w-5 shrink-0 text-primaria-texto" /><span className="tabular">{whatsapp.exibicao}</span>
      </a>
    </Card>
  );
}

function Horarios({ faixas, fuso, observacao }: { faixas: typeof studio.horarios.faixas; fuso: string; observacao?: string }) {
  const agora = useAgora();
  const sit = useMemo(() => situacao(faixas, fuso, agora), [faixas, fuso, agora]);
  const ordem: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Card as="section" className="flex flex-col gap-3 p-5" aria-labelledby="titulo-horarios">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionTitle id="titulo-horarios" as="h2">Horários de atendimento</SectionTitle>
        <Badge tom={sit.aberto ? "sucesso" : "neutro"} ponto>
          <span aria-live="polite">{sit.aberto ? `Aberto até ${hora(sit.faixaHoje!.fecha)}` : "Fechado agora"}</span>
        </Badge>
      </div>
      {!sit.aberto && sit.proxima && (
        <p className="text-sm text-texto-apoio">Abre {sit.proxima.dia === sit.hoje ? "hoje" : NOMES_DIAS[sit.proxima.dia].toLowerCase()} às {hora(sit.proxima.abre)}.</p>
      )}
      <ul className="flex flex-col divide-y divide-borda text-base">
        {ordem.map((d) => {
          const f = faixas.filter((x) => x.dia === d);
          const hoje = d === sit.hoje;
          return (
            <li key={d} className={cn("flex justify-between gap-3 py-2", hoje && "-mx-2 rounded-lg bg-primaria-suave px-2 font-semibold")} aria-current={hoje ? "date" : undefined}>
              <span className={hoje ? "text-primaria-texto" : "text-texto-suave"}>{NOMES_DIAS[d]}{hoje && " (hoje)"}</span>
              <span className={cn("tabular", f.length ? "text-texto" : "text-texto-apoio")}>{f.length ? f.map((x) => `${x.abre}–${x.fecha}`).join(", ") : "Fechado"}</span>
            </li>
          );
        })}
      </ul>
      {observacao && <p className="text-sm text-texto-apoio">{observacao}</p>}
    </Card>
  );
}
