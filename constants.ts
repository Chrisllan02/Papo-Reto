
import { Politician } from './types';

export const ESTADOS_BRASIL = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const EDUCATION_CAROUSEL = [
  {
    id: 1,
    title: "O que é o tal do 'Centrão'? 🤔",
    text: "O 'Centrão' não é um partido político formal, mas um fenômeno do nosso sistema multipartidário. Trata-se de um bloco informal de parlamentares de diversas siglas (geralmente de centro-direita) que não possuem uma orientação ideológica rígida, mas detêm a maioria dos votos no Congresso. A sua atuação baseia-se no 'Presidencialismo de Coalizão': para governar, o Presidente precisa formar alianças.\n\nHistoricamente, o Centrão atua como o 'fiel da balança'. Eles negociam apoio legislativo em troca de participação no governo (cargos em ministérios e estatais) e recursos orçamentários (emendas). Sem o apoio desse grupo, o Executivo corre riscos severos de paralisia ou até impeachment, como visto em momentos de crise política recente.\n\nEmbora garanta a governabilidade imediata, essa dinâmica é criticada por promover o fisiologismo — a troca de favores políticos em detrimento de um projeto de país. Constitucionalmente, o Art. 78 e o Art. 84 da CF/88 dão ao Presidente o poder de nomear cargos, mas a dependência do Legislativo para aprovar leis (Art. 44) cria essa necessidade de negociação constante.",
    topic: "Política",
    legislation: "CF/88, Art. 2º (Separação dos Poderes) e Art. 84 (Competências do PR)",
    impact: "Define se o governo consegue aprovar projetos vitais ou se fica refém de negociações custosas.",
    colorFrom: "from-green-600",
    colorTo: "to-green-900",
    icon: "Lightbulb"
  },
  {
    id: 2,
    title: "Emendas Parlamentares: Seu Dinheiro 💸",
    text: "As emendas parlamentares são a ferramenta pela qual deputados e senadores participam diretamente da alocação do Orçamento da União. A Constituição Federal, no Art. 166, permite que parlamentares indiquem para onde vai uma fatia do dinheiro público, visando atender as necessidades específicas de suas bases eleitorais (municípios e estados).\n\nExistem modalidades distintas: as Emendas Individuais (cada político tem sua cota), as de Bancada (estaduais) e as de Comissão. Mais recentemente, surgiram as 'Emendas Pix' (Transferência Especial), que enviam recursos direto ao caixa das prefeituras sem necessidade de convênio ou projeto específico prévio, o que dificulta a fiscalização pelos órgãos de controle como o TCU.\n\nO objetivo original é descentralizar recursos, levando verba para postos de saúde e escolas em locais que Brasília muitas vezes desconhece. Contudo, o uso político dessas verbas para garantir reeleição ou a falta de transparência na execução transformam as emendas em um ponto crítico do debate sobre eficiência do gasto público.",
    topic: "Orçamento",
    legislation: "CF/88, Art. 166 e Art. 166-A (Orçamento Impositivo)",
    impact: "Recursos que deveriam ir para grandes projetos nacionais acabam pulverizados em obras locais de interesse eleitoral.",
    colorFrom: "from-blue-600",
    colorTo: "to-blue-900",
    icon: "Banknote"
  },
  {
    id: 3,
    title: "PEC vs PL: A Hierarquia das Leis 📜",
    text: "No Brasil, nem toda lei nasce igual. A diferença crucial entre uma Proposta de Emenda à Constituição (PEC) e um Projeto de Lei (PL) está na hierarquia e na rigidez para aprovação. A Constituição é a lei suprema; para alterá-la via PEC, o Art. 60 exige um consenso massivo: 3/5 dos votos (308 deputados e 49 senadores) em dois turnos de votação em cada Casa (Câmara e Senado).\n\nJá o Projeto de Lei (PL) trata de normas infraconstitucionais — leis ordinárias que regulam o dia a dia, como o Código Civil ou regras de trânsito. Para aprovar um PL, basta a maioria simples (mais da metade dos presentes na sessão), conforme o Art. 47 da CF/88. Isso torna a legislação ordinária mais flexível e suscetível a mudanças conforme o governo de turno.\n\nPor que isso importa? Mudanças estruturais profundas, como a Reforma da Previdência ou Tributária, mexem no texto constitucional e exigem PECs. Já regras como a 'Lei das Estatais' ou diretrizes de educação podem vir via PL. Saber essa diferença ajuda a entender por que certas pautas travam no Congresso enquanto outras avançam rápido.",
    topic: "Legislação",
    legislation: "CF/88, Art. 59 (Processo Legislativo), Art. 60 (Emendas) e Art. 61 (Leis)",
    impact: "Mudanças na Constituição (PEC) são quase irreversíveis. Leis comuns (PL) mudam com mais facilidade.",
    colorFrom: "from-amber-700", 
    colorTo: "to-orange-900",
    icon: "ScrollText"
  }
];

// BACKUP DE DADOS DE PARTIDOS (GARANTIA DE EXIBIÇÃO)
// ATUALIZADO: Usando Wikimedia Commons (SVG) para estabilidade
export const PARTY_METADATA: Record<string, { nome: string, logo: string, ideology: 'Esquerda' | 'Centro' | 'Direita' }> = {
    'PT': { nome: 'Partido dos Trabalhadores', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Partido_dos_Trabalhadores_Logo.svg', ideology: 'Esquerda' },
    'PL': { nome: 'Partido Liberal', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Partido_Liberal_%282006%29_logo.svg', ideology: 'Direita' },
    'PP': { nome: 'Progressistas', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Progressistas_logo.svg', ideology: 'Centro' },
    'MDB': { nome: 'Movimento Democrático Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Logo_MDB_2017.svg', ideology: 'Centro' },
    'PSD': { nome: 'Partido Social Democrático', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Partido_Social_Democr%C3%A1tico_%282011%29_logo.svg', ideology: 'Centro' },
    'REPUBLICANOS': { nome: 'Republicanos', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Republicanos_Logo.svg', ideology: 'Direita' },
    'REP': { nome: 'Republicanos', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Republicanos_Logo.svg', ideology: 'Direita' },
    'UNIÃO': { nome: 'União Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Uni%C3%A3o_Brasil_logo.svg', ideology: 'Direita' },
    'UNIAO': { nome: 'União Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Uni%C3%A3o_Brasil_logo.svg', ideology: 'Direita' },
    'PSB': { nome: 'Partido Socialista Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Partido_Socialista_Brasileiro_Logo.svg', ideology: 'Esquerda' },
    'PDT': { nome: 'Partido Democrático Trabalhista', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Partido_Democr%C3%A1tico_Trabalhista_logo.svg', ideology: 'Esquerda' },
    'PSOL': { nome: 'Partido Socialismo e Liberdade', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Logo_PSOL.svg', ideology: 'Esquerda' },
    'PODE': { nome: 'Podemos', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Podemos_logo.svg', ideology: 'Centro' },
    'PODEMOS': { nome: 'Podemos', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Podemos_logo.svg', ideology: 'Centro' },
    'AVANTE': { nome: 'Avante', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Avante_logo.svg', ideology: 'Centro' },
    'PSC': { nome: 'Partido Social Cristão', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Partido_Social_Crist%C3%A3o_logo.svg', ideology: 'Direita' },
    'PCdoB': { nome: 'Partido Comunista do Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/PCdoB_Logo.svg', ideology: 'Esquerda' },
    'PCDOB': { nome: 'Partido Comunista do Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/PCdoB_Logo.svg', ideology: 'Esquerda' },
    'CIDADANIA': { nome: 'Cidadania', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Cidadania_logo.svg', ideology: 'Centro' },
    'SOLIDARIEDADE': { nome: 'Solidariedade', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Solidariedade_logo.svg', ideology: 'Centro' },
    'SD': { nome: 'Solidariedade', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Solidariedade_logo.svg', ideology: 'Centro' },
    'NOVO': { nome: 'Partido Novo', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Partido_Novo_logo.svg', ideology: 'Direita' },
    'REDE': { nome: 'Rede Sustentabilidade', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Rede_Sustentabilidade_logo.svg', ideology: 'Esquerda' },
    'PATRIOTA': { nome: 'Patriota', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Patriota_logo.svg', ideology: 'Direita' },
    'PV': { nome: 'Partido Verde', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Partido_Verde_logo.svg', ideology: 'Esquerda' },
    'PSDB': { nome: 'Partido da Social Democracia Brasileira', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Logo_do_PSDB.svg', ideology: 'Centro' },
    'AGIR': { nome: 'Agir', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Agir_logo.svg', ideology: 'Centro' },
    'PMB': { nome: 'Partido da Mulher Brasileira', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Partido_da_Mulher_Brasileira_logo.svg', ideology: 'Centro' },
    'PRD': { nome: 'Partido da Renovação Democrática', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/PRD_logo.svg', ideology: 'Direita' },
    'DC': { nome: 'Democracia Cristã', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Democracia_Crist%C3%A3_logo.svg', ideology: 'Direita' },
    'UP': { nome: 'Unidade Popular', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Unidade_Popular_logo.svg', ideology: 'Esquerda' },
    'PCO': { nome: 'Partido da Causa Operária', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/22/PCO_Logo.svg', ideology: 'Esquerda' },
    'PSTU': { nome: 'Partido Socialista dos Trabalhadores Unificado', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/PSTU_Logo.svg', ideology: 'Esquerda' },
    'PCB': { nome: 'Partido Comunista Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Partido_Comunista_Brasileiro_Logo.svg', ideology: 'Esquerda' },
    'PMN': { nome: 'Partido da Mobilização Nacional', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/PMN_Logo.svg', ideology: 'Direita' },
    'PRTB': { nome: 'Partido Renovador Trabalhista Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Partido_Renovador_Trabalhista_Brasileiro_logo.svg', ideology: 'Direita' }
};

export const POLITICIANS_DB: Politician[] = [];
