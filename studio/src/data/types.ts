/** Estrutura de conteúdo de um studio. Trocar de cliente = trocar src/data/studio.ts. */

export type Imagem = {
  src: string;
  alt: string;
  /** true enquanto for imagem provisória (aparece marcada na tela). */
  placeholder?: boolean;
};

/** Dia da semana: 0 = domingo … 6 = sábado. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Faixa = { dia: DiaSemana; abre: string; fecha: string };

export type Profissional = { id: string; nome: string; foto?: Imagem };

export type Servico = {
  id: string;
  nome: string;
  duracaoMin: number;
  /** Valor em centavos. */
  precoCentavos: number;
  profissionais: string[];
};

export type ItemValor = { nome: string; precoCentavos: number };

export type LinkPrincipal = {
  titulo: string;
  rota: "/manual" | "/agendar" | "/guia";
  tipo: "pdf" | "pagina";
  paginas?: number;
  descricao?: string;
  capa?: Imagem;
};

export type Bloco =
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "lista"; itens: string[] }
  | { tipo: "topicos"; itens: { titulo: string; texto: string }[] }
  | { tipo: "destaque"; texto: string; acao?: "whatsapp" }
  | { tipo: "dicas"; titulo: string; itens: string[] }
  | { tipo: "fotos"; fotos: Imagem[] }
  | { tipo: "assinatura"; despedida: string; nome: string }
  | { tipo: "valores" }
  | { tipo: "localizacao" }
  | { tipo: "logo" };

export type SecaoDocumento = {
  id: string;
  /** "capa" ocupa a página toda com o degradê da marca. */
  estilo?: "capa" | "normal" | "encerramento";
  titulo: string;
  subtitulo?: string;
  imagem?: Imagem;
  blocos: Bloco[];
};

export type Documento = {
  titulo: string;
  descricao: string;
  nomeArquivoPdf: string;
  secoes: SecaoDocumento[];
};

export type Studio = {
  marca: {
    nome: string;
    subtitulo: string;
    cidade: string;
    /** Sem arquivo de logo, o nome é exibido na fonte de assinatura do BSS. */
    logo?: Imagem;
    monograma: string;
    foto: Imagem;
    creditos: { texto: string; url?: string };
  };
  perfil: {
    instagram: { usuario: string; nome: string; url: string };
    bio: string;
    destaques: string[];
  };
  contato: {
    whatsapp: { ddi: string; numero: string; exibicao: string };
    endereco: { linha: string; complemento?: string; bairro: string; cidade: string; uf: string; referencia?: string };
  };
  horarios: { fuso: string; faixas: Faixa[]; observacao?: string };
  links: LinkPrincipal[];
  agendamento: {
    textoApoio: string;
    textoProfissional: string;
    profissionais: Profissional[];
    servicos: Servico[];
    /** Modelo da mensagem. Variáveis: {servico} {duracao} {valor} {profissional}. */
    mensagemWhatsApp: string;
  };
  valores: { itens: ItemValor[]; notas: string[] };
  manual: Documento;
  guia: Documento;
  seo: Record<"links" | "agendar" | "manual" | "guia", { titulo: string; descricao: string }>;
};
