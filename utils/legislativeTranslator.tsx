import React from 'react';
import { GraduationCap, HeartPulse, Banknote, Shield, Briefcase, Leaf, Gavel, Activity } from 'lucide-react';
import { Glossary } from '../components/Glossary';
import { DICTIONARY } from './glossary';
import { FeedCategory } from '../types';
import { detectLegislativeCategory, normalizeForMatch } from '../domain/legislative/classification';

// Dicionário Constitucional
export const CONSTITUTION_TOPICS: Record<string, { art: string, text: string }> = {
    'educação': { art: 'Art. 205', text: 'A educação é direito de todos e dever do Estado.' },
    'escola': { art: 'Art. 206', text: 'Ensino será ministrado com igualdade de condições.' },
    'saúde': { art: 'Art. 196', text: 'A saúde é direito de todos e dever do Estado.' },
    'sus': { art: 'Art. 198', text: 'Ações e serviços públicos de saúde integram uma rede regionalizada.' },
    'segurança': { art: 'Art. 144', text: 'Segurança pública é dever do Estado e responsabilidade de todos.' },
    'polícia': { art: 'Art. 144', text: 'Segurança pública é exercida para a preservação da ordem pública.' },
    'orçamento': { art: 'Art. 165', text: 'Leis de iniciativa do Executivo estabelecerão o plano plurianual.' },
    'dinheiro': { art: 'Art. 165', text: 'Orçamento fiscal referente aos poderes da União.' },
    'imposto': { art: 'Art. 145', text: 'A União, Estados e Municípios podem instituir tributos.' },
    'tribut': { art: 'Art. 145', text: 'O sistema tributário deve respeitar a capacidade econômica.' },
    'meio ambiente': { art: 'Art. 225', text: 'Todos têm direito ao meio ambiente ecologicamente equilibrado.' },
    'floresta': { art: 'Art. 225', text: 'Dever de defender e preservar o ambiente para futuras gerações.' },
    'trabalho': { art: 'Art. 6º', text: 'São direitos sociais a educação, a saúde e o trabalho.' },
    'salário': { art: 'Art. 7º', text: 'Direito a salário mínimo, fixado em lei.' },
    'cultura': { art: 'Art. 215', text: 'O Estado garantirá a todos o pleno exercício dos direitos culturais.' },
    'índio': { art: 'Art. 231', text: 'São reconhecidos aos índios sua organização social e terras.' },
    'indígena': { art: 'Art. 231', text: 'São reconhecidos aos índios sua organização social e terras.' },
    'mulher': { art: 'Art. 5º, I', text: 'Homens e mulheres são iguais em direitos e obrigações.' },
    'internet': { art: 'Art. 5º', text: 'É livre a manifestação do pensamento, vedado o anonimato.' },
    'transporte': { art: 'Art. 6º', text: 'Transporte é um direito social constitucional.' }
};

const CONSTITUTION_MATCHERS = Object.entries(CONSTITUTION_TOPICS).map(([key, value]) => {
    const term = normalizeForMatch(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = key.length <= 3 ? `\\b${term}\\b` : `\\b${term}[a-z0-9]*\\b`;
    return { regex: new RegExp(pattern), value };
});

export const LEGISLATIVE_TYPES: Record<string, string> = {
    'PEC': 'Esta é uma Proposta de Emenda à Constituição. É a mudança mais difícil e poderosa das leis, exigindo 3/5 dos votos para passar. Altera a base do país.',
    'PL': 'Este é um Projeto de Lei Ordinária. Define as regras do dia a dia. Precisa da maioria simples dos presentes para ser aprovado.',
    'MPV': 'Medida Provisória: tem força de lei imediata e é assinada pelo Presidente. O Congresso precisa confirmar depois.',
    'PLP': 'Projeto de Lei Complementar: detalha regras específicas exigidas pela Constituição. Requer maioria absoluta (257 deputados).',
    'PDL': 'Projeto de Decreto Legislativo: competência exclusiva do Congresso, geralmente para tratar de tratados internacionais ou sustar atos do Presidente.',
    'REQ': 'Requerimento: um pedido formal feito por parlamentares para cobrar informações, criar comissões ou mudar a pauta.'
};

/**
 * Analisa o texto e retorna a categoria semântica.
 * Deve ser usado na camada de dados (fetch/API) e não na renderização.
 */
export const detectCategory = (text: string): FeedCategory => {
    return detectLegislativeCategory(text);
};

/**
 * Retorna a configuração visual baseada na categoria já processada.
 * Rápido e leve para uso na renderização.
 */
export const getCategoryIcon = (category: FeedCategory) => {
    switch (category) {
        case 'education':
            return { icon: GraduationCap, label: 'Educação', color: 'text-nuit dark:text-blue-400', bg: 'bg-nuit/10 dark:bg-blue-900/30' };
        case 'health':
            return { icon: HeartPulse, label: 'Saúde', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100/50 dark:bg-red-900/30' };
        case 'economy':
            return { icon: Banknote, label: 'Economia', color: 'text-picture dark:text-green-400', bg: 'bg-picture/10 dark:bg-green-900/30' };
        case 'security':
            return { icon: Shield, label: 'Segurança', color: 'text-midnight dark:text-gray-300', bg: 'bg-gray-200/50 dark:bg-gray-800/50' };
        case 'work':
            return { icon: Briefcase, label: 'Trabalho', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100/50 dark:bg-orange-900/30' };
        case 'environment':
            return { icon: Leaf, label: 'Ambiente', color: 'text-mantis dark:text-mantis', bg: 'bg-mantis/20 dark:bg-emerald-900/30' };
        case 'justice':
            return { icon: Gavel, label: 'Legislação', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100/50 dark:bg-purple-900/30' };
        default:
            return { icon: Activity, label: 'Atividade', color: 'text-nuit dark:text-blue-400', bg: 'bg-gray-100/50 dark:bg-gray-800/50' };
    }
};

export const formatCardTitle = (title: string, type: string) => {
    if (type === 'despesa') return title;

    let clean = title.trim();

    if (clean.match(/^Retirado o Requerimento/i)) return "Requerimento Retirado da Pauta";
    if (clean.match(/^Aprovado o Requerimento de Urgência/i)) return "Urgência Aprovada";
    if (clean.match(/^Indeferido o Requerimento/i)) return "Pedido Negado";
    if (clean.match(/^Deferido o Requerimento/i)) return "Pedido Aceito";
    if (clean.match(/^Aprovada a Redação Final/i)) return "Texto Final Aprovado";
    if (clean.match(/^Encaminhada à publicação/i)) return "Projeto Publicado";
    if (clean.match(/^Designado Relator/i)) return "Relator Escolhido";
    if (clean.match(/^Parecer.*aprovado/i)) return "Parecer Aprovado";
    if (clean.match(/^Novo Despacho/i)) return "Atualização de Tramitação";
    if (clean.match(/^Rejeitado o Requerimento/i)) return "Pedido Rejeitado";

    clean = clean
        .replace(/^Institui a /i, '')
        .replace(/^Institui o /i, '')
        .replace(/^Dispõe sobre a /i, '')
        .replace(/^Dispõe sobre o /i, '')
        .replace(/^Altera a Lei /i, 'Alteração na Lei ')
        .replace(/\bn[.º]{1,2}\s?(?=\d)/gi, '')
        .replace(/\/\d{4}/, '');

    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    if (clean.length > 60) return clean.substring(0, 60) + '...';
    return clean;
};

export const getDidacticContext = (title: string, description: string | undefined, type: string) => {
    if (type === 'despesa') {
        const desc = description || '';
        if (desc.includes('Emissão Bilhete Aéreo')) return { text: "Compra de passagens aéreas com dinheiro público.", const: null };
        if (desc.includes('Combustíveis')) return { text: "Abastecimento de veículos oficiais do gabinete.", const: null };
        if (desc.includes('Telefonia')) return { text: "Pagamento de contas de telefone e internet móvel.", const: null };
        if (desc.includes('Divulgação')) return { text: "Gastos com publicidade do mandato (redes sociais, panfletos).", const: null };
        return { text: desc || "Gasto operacional do gabinete.", const: null };
    }

    const text = description || title || "";
    let constitutionRef = null;

    let legislativeExplanation = "";
    const typeMatchers: Array<{ regex: RegExp, key: string }> = [
        { regex: /\bPEC\b/, key: 'PEC' },
        { regex: /\bMPV\b/, key: 'MPV' },
        { regex: /\bPLP\b/, key: 'PLP' },
        { regex: /\bPDL\b/, key: 'PDL' },
        { regex: /\bPL\b|Projeto de Lei/, key: 'PL' },
        { regex: /\bREQ\b|Requerimento/, key: 'REQ' }
    ];
    const typeSource = `${title} ${text}`;
    const matchedType = typeMatchers.find(({ regex }) => regex.test(typeSource));
    if (matchedType) legislativeExplanation = LEGISLATIVE_TYPES[matchedType.key];

    const dictionary = [
        { regex: /Retirado o Requerimento.*em raz[ãa]o do deferimento.*/i, replace: "Pedido cancelado pois um novo mais atual foi aceito." },
        { regex: /Retirado de pauta.*/i, replace: "Votação adiada: o tema foi retirado da discussão de hoje." },
        { regex: /Rejeitado o Requerimento.*/i, replace: "O pedido foi negado pela maioria ou pela Mesa." },
        { regex: /Deferido o Requerimento.*/i, replace: "Pedido aceito! A solicitação do deputado foi atendida." },
        { regex: /Aprovado o Requerimento de Urgência.*/i, replace: "Urgência Aprovada: Este projeto vai pular a fila das comissões." },
        { regex: /Designado Relator.*/i, replace: "Um deputado foi escolhido para analisar este projeto e dar seu parecer." },
        { regex: /Parecer.*pela aprovação/i, replace: "O relator analisou e recomenda a APROVAÇÃO deste projeto." },
        { regex: /Parecer.*pela rejeição/i, replace: "O relator analisou e recomenda a REJEIÇÃO deste projeto." },
        { regex: /Encaminhada à publicação.*/i, replace: "O texto oficial foi publicado no diário da Câmara." },
        { regex: /Arquivado.*/i, replace: "Projeto encerrado/arquivado e não deve virar lei por enquanto." },
        { regex: /Aprovada a Redação Final.*/i, replace: "Texto final revisado e aprovado. Próximo passo: Senado ou Sanção." },
        { regex: /Remessa ao Senado Federal.*/i, replace: "Aprovado na Câmara! O projeto segue agora para o Senado." },
        { regex: /Transformado na Lei Ordinária.*/i, replace: "VITÓRIA: O projeto foi aprovado e virou Lei!" },
        { regex: /^Altera a Lei.*/i, replace: "Propõe mudanças em uma lei que já existe." },
        { regex: /^Institui.*/i, replace: "Cria um novo programa, data comemorativa ou regra." }
    ];

    let translatedStatus = "";
    for (const rule of dictionary) {
        if (rule.regex.test(text)) {
            translatedStatus = rule.replace;
            break;
        }
    }
    
    if (!translatedStatus) {
        translatedStatus = text.replace(/Requerimento n\. \d+(\/\d+)?/gi, "o pedido").substring(0, 100) + (text.length > 100 ? "..." : "");
    }

    const fullTextSearch = normalizeForMatch(`${title} ${text}`);
    const constitutionMatch = CONSTITUTION_MATCHERS.find(({ regex }) => regex.test(fullTextSearch));
    if (constitutionMatch) constitutionRef = constitutionMatch.value;

    let didacticText = translatedStatus;
    if (legislativeExplanation) {
        didacticText += " " + legislativeExplanation;
    }

    return { 
        text: didacticText, 
        constitution: constitutionRef, 
        isExpense: false
    };
};

export const renderWithGlossary = (text: string) => {
    if (!text) return null;
    
    const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keys = Object.keys(DICTIONARY);
    const terms = [...keys].sort((a, b) => b.length - a.length).map(escapeRegExp);

    if (terms.length === 0) return text;

    const isWordChar = (char: string | undefined) => Boolean(char) && /[\p{L}\p{N}]/u.test(char as string);
    const regex = new RegExp(`(${terms.join('|')})`, 'giu');

    const parts: Array<string | { term: string, value: string }> = [];
    let lastIndex = 0;
    for (const match of text.matchAll(regex)) {
        const index = match.index ?? 0;
        const value = match[0];
        const end = index + value.length;
        if (isWordChar(text[index - 1]) || isWordChar(text[end])) continue;
        const term = keys.find(t => t.toLowerCase() === value.toLowerCase());
        if (!term) continue;
        if (index > lastIndex) parts.push(text.slice(lastIndex, index));
        parts.push({ term, value });
        lastIndex = end;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));

    return parts.map((part, i) => {
        if (typeof part === 'string') return part;
        return <Glossary key={i} term={part.term}>{part.value}</Glossary>;
    });
};
