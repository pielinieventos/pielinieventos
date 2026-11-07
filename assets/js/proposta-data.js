/* =====================================================================
   Pielini Coffee — dados compartilhados entre o gerador de orçamento
   (orcamento.html) e a proposta que o cliente abre (proposta.html).
   Edite aqui as condições comerciais e a composição das estações.
===================================================================== */
window.PIELINI = (() => {
  const WHATSAPP = '5551995168104';

  const PLANS = [
    {
      name: 'Estação Básica', price: 990, img: 'mesa-basica', pos: '62% 55%',
      tagline: 'O ritual essencial do café passado na hora.',
      methods: ['Hario V60', 'Prensa Francesa'],
    },
    {
      name: 'Estação Filtrados', price: 1290, img: 'mesa-filtrados', pos: '45% 30%',
      tagline: 'A experiência visual e sensorial dos métodos filtrados.',
      methods: ['Hario V60', 'Prensa Francesa', 'Koar', 'Chemex'],
    },
    {
      name: 'Estação Espressos', price: 2190, img: 'mesa-espressos', pos: '45% 88%',
      tagline: 'Os filtrados e os clássicos da cafeteria.',
      methods: ['Hario V60', 'Prensa Francesa', 'Koar', 'Chemex', 'Espresso', 'Cappuccino', 'Caramel Macchiato', 'Mocaccino'],
    },
    {
      name: 'Estação Premium Plus', price: 2390, img: 'mesa-premium-plus', pos: '50% 28%',
      tagline: 'A experiência completa, com bebidas geladas.',
      methods: ['Hario V60', 'Prensa Francesa', 'Koar', 'Chemex', 'Espresso', 'Cappuccino', 'Caramel Macchiato', 'Mocaccino', 'Sodas Italianas ou cafés gelados'],
    },
  ];

  // incluso em todas as estações
  const INCLUDED = [
    'Barista(s) dedicado(s) durante o serviço',
    'Café especial de torra própria',
    'Moedor, balança, bancada e demais equipamentos',
    'Copos, água, filtros, açúcar, adoçante e palitinhos',
    'Personalização e impressos',
    'Montagem, reabastecimento e desmontagem',
    'Transporte até 10 km da cafeteria',
  ];

  // condições comerciais (as mesmas do contrato)
  const TERMS = {
    validityDays: 30,
    cashDiscount: 0.10,
    payment: [
      'Reserva da data: 50% de sinal na assinatura do contrato.',
      'Restante: 50% na semana do evento.',
      'À vista (Pix ou transferência): 10% de desconto sobre o total.',
      'Cartão de crédito: parcelamento na quantidade de vezes que preferir, com as taxas da maquininha por conta do contratante.',
    ],
    client: [
      'Aparador nivelado para a montagem da estação (de preferência fechado embaixo).',
      'Ponto de energia exclusivo 220V a no máximo 2 metros da estação.',
      'Acesso da equipe ao local com no mínimo 1h30 de antecedência.',
      'Alimentação e hidratação da equipe, no padrão dos demais profissionais do evento.',
    ],
    cancel: [
      'Até 30 dias antes do evento: sem multa, mediante aviso por escrito.',
      'Com menos de 30 dias: multa de 10% do valor contratado.',
      'Com 10 dias ou menos: multa de 20% do valor contratado.',
    ],
  };

  const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // a proposta viaja inteira no próprio link (base64 url-safe de um JSON)
  const encode = (obj) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const decode = (str) => {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  };

  return { WHATSAPP, PLANS, INCLUDED, TERMS, brl, encode, decode };
})();
