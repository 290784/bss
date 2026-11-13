/*
 * DADOS COMERCIAIS DA GÊ — edite este arquivo quando algo for definido.
 * Hoje NADA disso está definido oficialmente (ver documents/BSS_COMMERCIAL_PENDING.md):
 *   - preços dos planos (C-01), formas de pagamento (F-01), canal e horário do suporte (C-04), oferta de lançamento (C-02).
 * Enquanto estiverem vazios (null), o deck mostra apenas a condição oficial:
 *   teste grátis de 14 dias, sem cartão, com aviso antes de qualquer cobrança.
 * NUNCA coloque aqui um valor que não foi aprovado pelo dono.
 */
window.DADOS_COMERCIAIS = {
  precosDefinidos: false,            // troque para true SOMENTE depois de preencher os preços abaixo
  planos: {
    solo:     { preco: null },     // exemplo de preenchimento: { preco: "R$ 00,00/mês" }
    pro:      { preco: null },
    studio:   { preco: null },
    business: { preco: null },
  },
  formasPagamento: null,           // exemplo: ["Pix", "Cartão de crédito"]  (só quando a cobrança estiver integrada)
  ofertaLancamento: null,          // exemplo: "Condição de lançamento: ..." (só se existir e estiver documentada)
  suporte: { canal: null, horario: null }, // exemplo: { canal: "WhatsApp", horario: "seg a sex, 9h às 18h" }
  linkCadastro: "https://bss-six.vercel.app/cadastro?c=call-vendas", // o código "call-vendas" mede os cadastros vindos das calls
};
