// Conteúdo da landing. Textos, preços e links marcados com TODO são provisórios:
// troque aqui sem mexer nos componentes.

// TODO: link real de aplicação (WhatsApp, formulário, etc.)
export const APPLY_URL = "https://wa.me/5500000000000?text=Quero%20aplicar%20para%20a%20FORGE";

export const nav = [
  { label: "Metodologia", href: "#metodologia" },
  { label: "Cases", href: "#cases" },
  { label: "Protocolos", href: "#protocolos" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export const hero = {
  eyebrow: "Consultoria online · treino + dieta",
  title: ["Forjado", "em método."],
  subtitle:
    "Protocolos individuais, check-in semanal e ajustes baseados em dados. Sem achismo, sem planilha genérica.",
  // TODO: números reais
  stats: [
    { value: "+500", label: "alunos acompanhados" },
    { value: "12 sem", label: "ciclo médio" },
    { value: "7 dias", label: "entre ajustes" },
  ],
  // Coloque o vídeo comprimido em public/video/hero.mp4 (e um poster em hero.jpg)
  video: { src: "/video/hero.mp4", poster: "/video/hero.jpg" },
};

export const pillars = [
  {
    title: "Diagnóstico",
    text: "Avaliação de histórico, rotina, medidas e objetivo antes de qualquer protocolo.",
  },
  {
    title: "Protocolo",
    text: "Treino, dieta e suplementação desenhados para o seu contexto, não copiados de modelo.",
  },
  {
    title: "Check-in",
    text: "Peso, fotos e percepção toda semana. O que não é medido não é ajustado.",
  },
  {
    title: "Ajuste",
    text: "Mudanças semanais guiadas pelos dados do check-in até a meta.",
  },
];

// TODO: cases reais (com autorização do aluno). image é opcional: /cases/nome.jpg
export const cases: {
  name: string;
  goal: string;
  weeks: number;
  result: string;
  quote: string;
  image?: string;
}[] = [
  { name: "Rafael M.", goal: "Cutting", weeks: 16, result: "−14 kg", quote: "Primeira vez que cheguei no fim de um cutting sem rebote." },
  { name: "Juliana S.", goal: "Recomp", weeks: 20, result: "−9 cm cintura", quote: "Mesmo peso, outro corpo. O check-in me manteve no trilho." },
  { name: "Bruno A.", goal: "Hipertrofia", weeks: 24, result: "+6 kg massa", quote: "Saí do platô de dois anos em três meses." },
  { name: "Camila R.", goal: "Cutting", weeks: 12, result: "−8 kg", quote: "Dieta que cabe na rotina de quem trabalha 10h por dia." },
  { name: "Diego P.", goal: "Recomp", weeks: 18, result: "−6% gordura", quote: "Os ajustes semanais fazem toda a diferença." },
  { name: "Larissa T.", goal: "Hipertrofia", weeks: 28, result: "+4 kg massa", quote: "Treino com propósito, cada série tem motivo." },
];

export const protocols = [
  { code: "HIP", title: "Hipertrofia", text: "Ganho de massa com superávit controlado e progressão de carga." },
  { code: "CUT", title: "Cutting", text: "Perda de gordura preservando massa magra e desempenho." },
  { code: "REC", title: "Recomposição", text: "Perder gordura e ganhar massa ao mesmo tempo, com paciência e dados." },
  { code: "PER", title: "Performance", text: "Força e condicionamento para quem treina com meta de desempenho." },
  { code: "SAU", title: "Saúde metabólica", text: "Marcadores, energia e composição corporal para o longo prazo." },
  { code: "MAN", title: "Manutenção", text: "Sustentar o resultado com flexibilidade e menos fricção." },
];

// TODO: preços e itens reais
export const plans = [
  {
    name: "Standard",
    price: "R$ 297",
    period: "/mês",
    highlight: false,
    features: [
      "Treino e dieta individuais",
      "Check-in semanal na plataforma",
      "Ajuste de protocolo a cada 4 semanas",
      "Suporte por mensagem em dias úteis",
    ],
  },
  {
    name: "Pro",
    price: "R$ 497",
    period: "/mês",
    highlight: true,
    features: [
      "Tudo do Standard",
      "Ajuste de protocolo semanal",
      "Protocolo de suplementação",
      "Análise de fotos e medidas",
      "Suporte prioritário",
    ],
  },
  {
    name: "Elite",
    price: "R$ 897",
    period: "/mês",
    highlight: false,
    features: [
      "Tudo do Pro",
      "Call mensal de estratégia",
      "Revisão de técnica por vídeo",
      "Suporte direto com o treinador",
    ],
  },
];

export const faq = [
  {
    q: "Preciso de academia?",
    a: "O protocolo é montado a partir do que você tem disponível: academia completa, estrutura reduzida ou treino em casa.",
  },
  {
    q: "Como funciona o check-in semanal?",
    a: "Toda semana você registra peso, duas fotos (frente e costas), humor e observações na área do aluno. Os ajustes saem a partir desses dados.",
  },
  {
    q: "Em quanto tempo vejo resultado?",
    a: "As primeiras mudanças mensuráveis costumam aparecer entre 3 e 4 semanas. Ciclos completos levam de 12 a 24 semanas.",
  },
  {
    q: "Posso trocar de plano depois?",
    a: "Sim. A troca vale a partir do próximo ciclo de cobrança.",
  },
  {
    q: "As minhas fotos ficam públicas?",
    a: "Não. As fotos ficam em armazenamento privado e só são visíveis para você e para o treinador.",
  },
  {
    q: "Tem fidelidade?",
    a: "Não há fidelidade. Recomendamos no mínimo 12 semanas para um ciclo completo.",
  },
];

export const ctaFinal = {
  eyebrow: "Vagas limitadas por ciclo",
  title: "Pronto pra forjar?",
  text: "A aplicação leva 2 minutos. Respondemos em até 24h com a análise do seu caso.",
};
