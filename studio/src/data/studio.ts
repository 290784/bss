import type { Studio } from "./types";

/**
 * Conteúdo do Studio Manoella Lopes (seed de referência).
 * Todo o texto, preço, horário e regra do site e dos PDFs vem daqui.
 * Itens marcados com "TODO:" precisam de confirmação com a cliente (lista no README).
 */

const PROFISSIONAL = "manoella";

export const studio: Studio = {
  marca: {
    nome: "Studio Manoella Lopes",
    subtitulo: "Nail Designer | Especialista em Unhas",
    cidade: "Olaria – RJ",
    // Logo completo (nome desenhado) ainda não veio em arquivo: o nome segue na fonte de assinatura.
    logo: undefined,
    monograma: "ML",
    simbolo: { src: "/brand/monograma.png", alt: "Monograma ML do Studio Manoella Lopes" },
    foto: { src: "/img/manoella-lopes.jpg", alt: "Manoella Lopes, nail designer" },
    // TODO: confirmar o texto e o link de créditos do rodapé.
    creditos: { texto: "Feito com BSS" },
  },
  perfil: {
    instagram: {
      usuario: "@studiomanoellalopes",
      nome: "Manoella Lopes | Nail Designer",
      url: "https://www.instagram.com/studiomanoellalopes/",
    },
    bio: "✨Te ajudo a se sentir linda e confiante. DualForm – banho de gel – molde F1. Naturalidade e resistência.",
    destaques: ["MOLDE F1", "Banho de gel"],
  },
  contato: {
    whatsapp: { ddi: "55", numero: "21995781069", exibicao: "(21) 99578-1069" },
    endereco: {
      linha: "Rua Carlina, N 11",
      // TODO: confirmar se o complemento "apto 102" deve aparecer em todo o site (a agenda online não mostra; o Manual mostra).
      complemento: "apto 102",
      bairro: "Olaria",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      referencia: "segundo botão do interfone de cima pra baixo",
    },
  },
  horarios: {
    fuso: "America/Sao_Paulo",
    // TODO: confirmar com a cliente o horário de sábado — a agenda online diz 09:00–15:00 e o Manual diz 8h–16h30.
    // Padrão usado: o da agenda online. Terça a sexta é igual nas duas fontes (9h–19h30).
    faixas: [
      { dia: 2, abre: "09:00", fecha: "19:30" },
      { dia: 3, abre: "09:00", fecha: "19:30" },
      { dia: 4, abre: "09:00", fecha: "19:30" },
      { dia: 5, abre: "09:00", fecha: "19:30" },
      { dia: 6, abre: "09:00", fecha: "15:00" },
    ],
    observacao: "Atendimento com horário marcado.",
  },
  links: [
    { titulo: "Manual de Agendamento", rota: "/manual", tipo: "pdf", paginas: 7 },
    { titulo: "Agende aqui!", rota: "/agendar", tipo: "pagina", descricao: "Serviços, valores e horários" },
    { titulo: "Guia de Cuidados", rota: "/guia", tipo: "pdf", paginas: 4 },
  ],
  agendamento: {
    textoApoio: "Selecione abaixo qual serviço deseja realizar o agendamento",
    textoProfissional: "Selecione o profissional desejado para o agendamento",
    profissionais: [
      { id: PROFISSIONAL, nome: "Manoella Lopes", foto: { src: "/img/manoella-lopes.jpg", alt: "Manoella Lopes" } },
    ],
    servicos: [
      { id: "aplicacao", nome: "Aplicação", duracaoMin: 120, precoCentavos: 14000, profissionais: [PROFISSIONAL] },
      { id: "manutencao", nome: "Manutenção", duracaoMin: 90, precoCentavos: 10000, profissionais: [PROFISSIONAL] },
      { id: "manutencao-outro", nome: "Manutenção (outro profissional)", duracaoMin: 90, precoCentavos: 11500, profissionais: [PROFISSIONAL] },
      { id: "banho-gel", nome: "Banho de gel", duracaoMin: 90, precoCentavos: 10000, profissionais: [PROFISSIONAL] },
      { id: "banho-gel-outra", nome: "Banho de Gel (outra profissional)", duracaoMin: 90, precoCentavos: 11500, profissionais: [PROFISSIONAL] },
      { id: "esmaltacao-gel-naturais", nome: "Esmaltação em gel em unhas naturais", duracaoMin: 90, precoCentavos: 8500, profissionais: [PROFISSIONAL] },
      { id: "remocao", nome: "Remoção", duracaoMin: 60, precoCentavos: 3500, profissionais: [PROFISSIONAL] },
    ],
    mensagemWhatsApp: "Olá! Quero agendar: {servico} ({duracao}, R$ {valor}) com {profissional}. Tenho disponibilidade em: ____.",
  },
  valores: {
    itens: [
      { nome: "Alongamento", precoCentavos: 14000 },
      { nome: "Manutenção", precoCentavos: 10000 },
      { nome: "Banho de Gel", precoCentavos: 10000 },
      { nome: "Esmaltação em Gel no pé", precoCentavos: 6000 },
      { nome: "Baby Boomer", precoCentavos: 1500 },
      { nome: "Borda Camuflada", precoCentavos: 2000 },
      { nome: "Pó Cromado", precoCentavos: 1000 },
      { nome: "Baby Glitter ou Color", precoCentavos: 1000 },
      { nome: "Troca de Formato", precoCentavos: 1500 },
    ],
    notas: [
      "Em todos os procedimentos em gel são inclusos: cutilagem; esmaltação em gel (francesinhas e decoração simples).",
      "Formato stiletto tem acréscimo de R$10,00 nos procedimentos.",
      "Primeiro agendamento com o procedimento vindo de outra profissional tem acréscimo de R$15,00.",
    ],
  },
  manual: {
    titulo: "Manual de Agendamento",
    descricao: "Como agendar, serviços, valores, protocolo de atendimento e localização.",
    nomeArquivoPdf: "manual-de-agendamento-studio-manoella-lopes.pdf",
    secoes: [
      {
        id: "capa", estilo: "capa", titulo: "Manual de Agendamento", subtitulo: "Studio Manoella Lopes",
        imagem: { src: "/img/manoella-lopes-capa.jpg", alt: "Manoella Lopes, nail designer do studio" },
        blocos: [{ tipo: "logo" }],
      },
      {
        id: "boas-vindas", titulo: "Boas-vindas",
        imagem: { src: "/img/boas-vindas.jpg", alt: "Mãos aplicando óleo de cutícula com conta-gotas" },
        blocos: [
          { tipo: "paragrafo", texto: "Olá, eu sou a Manoella Lopes, Nail Designer Especialista, e preparei este manual de agendamento com muito carinho para facilitar a sua experiência comigo." },
          { tipo: "paragrafo", texto: "Aqui você vai encontrar todas as informações necessárias para agendar seu horário de forma prática, além de algumas orientações importantes para que o nosso atendimento seja ainda mais especial." },
          { tipo: "paragrafo", texto: "Meu objetivo é que cada visita seja um momento de cuidado, beleza e bem-estar. Quero que você se sinta à vontade e confiante, sabendo que está em boas mãos." },
          { tipo: "paragrafo", texto: "Obrigada por confiar no meu trabalho, e seja muito bem-vinda a essa experiência de autocuidado comigo!" },
          { tipo: "assinatura", despedida: "Com carinho,", nome: "Manoella Lopes" },
        ],
      },
      {
        id: "alongamento", titulo: "Serviços", subtitulo: "Alongamento de Unhas",
        blocos: [
          { tipo: "paragrafo", texto: "Esse serviço é para as clientes que possuem unhas quebradiças e que desejam ter as unhas alongadas de imediato, podendo ser usado os métodos extensores como: DualForm (tip + mold)." },
          { tipo: "lista", itens: [
            "O procedimento leva em média 2 horas",
            "Incluso cutilagem e esmaltação em gel",
            "Pode incluir outros serviços como decoração (adicional)",
            "Manutenção até 30 dias",
          ] },
          { tipo: "fotos", fotos: [
            { src: "/img/alongamento-1.jpg", alt: "Alongamento amendoado nude com flores brancas" },
            { src: "/img/alongamento-2.jpg", alt: "Alongamento amendoado com francesinha branca" },
          ] },
        ],
      },
      {
        id: "banho-de-gel", titulo: "Serviços", subtitulo: "Banho de Gel",
        blocos: [
          { tipo: "paragrafo", texto: "É um procedimento que usamos gel construtor somente em cima da unha natural, criando uma estrutura resistente a impactos do dia a dia, permitindo que a unha natural cresça." },
          { tipo: "lista", itens: [
            "Média de 1h30",
            "Incluso cutilagem e esmaltação em gel",
            "Pode incluir decoração (adicional)",
            "Manutenção de 20 à 30 dias",
          ] },
          { tipo: "fotos", fotos: [
            { src: "/img/banho-de-gel-1.jpg", alt: "Banho de gel com francesinha cintilante" },
            { src: "/img/banho-de-gel-2.jpg", alt: "Banho de gel vermelho" },
          ] },
        ],
      },
      { id: "valores", titulo: "Valores", blocos: [{ tipo: "valores" }] },
      {
        id: "protocolo", titulo: "Protocolo de atendimento",
        blocos: [
          { tipo: "lista", itens: [
            // TODO: confirmar sábado (aqui: 8h às 16h30, como no Manual original; a agenda online diz 9h às 15h).
            "Horário de atendimento: terça à sex das 9h às 19h30, sábado de 8h às 16h30, com horário marcado.",
            "Em caso de imprevistos, avisar com 24 horas de antecedência para que eu possa agendar outra cliente.",
            "Em caso de não comparecimento sem aviso prévio, o próximo horário será agendado mediante pagamento de 50% do procedimento.",
            "Atrasos superiores a 10 min sem aviso são automaticamente CANCELADOS.",
            "Se possível, chegue com 5 minutos de antecedência.",
          ] },
          { tipo: "dicas", titulo: "Dicas", itens: [
            "Aproveite para marcar sua manutenção com antecedência, logo após a aplicação, para ter preferência de horários (deixar para marcar na semana pode não haver disponibilidade).",
            "É permitida a entrada de um acompanhante apenas em caso de extrema necessidade da cliente, pois o espaço não tem estrutura para receber mais.",
            "Em agendamentos com mais de 35 dias será analisada a possibilidade de manutenção ou nova colocação.",
          ] },
          { tipo: "destaque", texto: "Para preservar a saúde da unha natural e evitar quebras/descolamentos do alongamento, é extremamente importante não passar do prazo de manutenção." },
        ],
      },
      { id: "localizacao", titulo: "Localização", blocos: [{ tipo: "localizacao", mapa: { src: "/img/mapa.jpg", alt: "Mapa da região da Rua Carlina, em Olaria" } }] },
    ],
  },
  guia: {
    titulo: "Guia de Cuidados",
    descricao: "Como cuidar do seu alongamento e blindagem: higienização, cuidados e remoção.",
    nomeArquivoPdf: "guia-de-cuidados-studio-manoella-lopes.pdf",
    secoes: [
      {
        id: "capa", estilo: "capa", titulo: "Cuidados com o seu ALONGAMENTO E BLINDAGEM:", subtitulo: "— Leia com atenção!",
        blocos: [{ tipo: "logo" }],
      },
      {
        id: "ola", titulo: "OLÁ!",
        blocos: [
          { tipo: "paragrafo", texto: "Agora você faz parte do grupo de meninas que decidiram ter praticidade nas unhas! Unhas sempre lindas e com o esmalte intacto!" },
          { tipo: "paragrafo", texto: "Para manter suas unhas perfeitas, irei passar algumas orientações e peço que leia com atenção." },
          { tipo: "destaque", texto: "Caso tenha alguma dúvida ou aconteça algum incidente com suas unhas, não hesite em me mandar uma mensagem. Estou à disposição para ajudar.", acao: "whatsapp" },
        ],
      },
      {
        id: "orientacoes", titulo: "Orientações",
        blocos: [
          { tipo: "paragrafo", texto: "Realizar a manutenção correta do seu alongamento é muito importante para mantê-lo bonito e saudável." },
          { tipo: "topicos", itens: [
            { titulo: "HIGIENIZAÇÃO", texto: "Com o auxílio de uma escovinha, água e sabão, esfregar a parte de trás do alongamento; enxaguar e, para melhorar o acabamento, passar óleo nas cutículas." },
            { titulo: "CUIDADOS", texto: "Não colocar a unha na boca, realizar as manutenções, utilizar luvas, manter as cutículas hidratadas e evitar causar atrito." },
            { titulo: "REMOÇÃO", texto: "Não tentar remover o alongamento em casa, não arrancar os cantinhos com a boca! Caso queira remover, ir até a profissional para a remoção segura." },
          ] },
        ],
      },
      {
        id: "encerramento", estilo: "encerramento", titulo: "AGORA VOCÊ JÁ SABE NÉ?",
        blocos: [
          { tipo: "paragrafo", texto: "Aproveite suas unhas! Agradeço a atenção." },
          { tipo: "logo" },
        ],
      },
    ],
  },
  seo: {
    links: { titulo: "Studio Manoella Lopes · Nail Designer em Olaria – RJ", descricao: "Agende seu horário, veja o manual de agendamento e o guia de cuidados do Studio Manoella Lopes." },
    agendar: { titulo: "Agende aqui · Studio Manoella Lopes", descricao: "Serviços, duração, valores e horários. Agende pelo WhatsApp." },
    manual: { titulo: "Manual de Agendamento · Studio Manoella Lopes", descricao: "Serviços, valores, protocolo de atendimento e localização do studio." },
    guia: { titulo: "Guia de Cuidados · Studio Manoella Lopes", descricao: "Higienização, cuidados e remoção do alongamento e blindagem." },
  },
};
