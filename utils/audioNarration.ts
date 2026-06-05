import { FeedItem, Politician } from '../types';

const MAX_SENTENCE_LENGTH = 190;

const cleanText = (value?: string | null) => {
    if (!value) return '';
    return value
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\bn[ºo]\.?\s*/gi, 'número ')
        .replace(/\bPLP\b/g, 'Projeto de Lei Complementar')
        .replace(/\bPL\b/g, 'Projeto de Lei')
        .replace(/\bPEC\b/g, 'Proposta de Emenda à Constituição')
        .replace(/\bMPV\b/g, 'Medida Provisória')
        .replace(/\bPDL\b/g, 'Projeto de Decreto Legislativo')
        .replace(/\bREQ\b/g, 'Requerimento')
        .replace(/\bCDHMIR\b/g, 'Comissão de Direitos Humanos')
        .replace(/\bCCJC\b/g, 'Comissão de Constituição e Justiça')
        .replace(/\bCFT\b/g, 'Comissão de Finanças e Tributação')
        .replace(/\bCSPCCO\b/g, 'Comissão de Segurança Pública')
        .trim();
};

const sentence = (value?: string | null) => {
    const text = cleanText(value);
    if (!text) return '';
    if (text.length <= MAX_SENTENCE_LENGTH) return text;
    const cut = text.slice(0, MAX_SENTENCE_LENGTH);
    const lastBreak = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(';'), cut.lastIndexOf(','), cut.lastIndexOf(' '));
    return `${cut.slice(0, lastBreak > 80 ? lastBreak : MAX_SENTENCE_LENGTH).trim()}...`;
};

const getTypeIntro = (item: FeedItem) => {
    if (item.type === 'evento') return 'Agenda do Congresso.';
    if (item.type === 'despesa') return 'Registro de gasto parlamentar.';
    if (item.type === 'educacao') return 'Conteúdo do Guia Cidadão.';
    if (item.status === 'Urgência') return 'Movimentação legislativa em regime de urgência.';
    if (item.status === 'Aprovado') return 'Votação ou tramitação aprovada.';
    if (item.status === 'Rejeitado') return 'Pedido ou proposta rejeitada.';
    return 'Atualização legislativa.';
};

export const buildActivityAudioScript = (
    item: FeedItem,
    didacticText?: string,
    politician?: Politician | null
) => {
    const parts: string[] = [getTypeIntro(item)];
    const title = sentence(item.summary || item.title);
    const subject = sentence(item.summary ? item.title : item.description || item.content || item.originalDescription);
    const why = sentence(item.whyItMatters);
    const next = sentence(item.nextStep);
    const didactic = sentence(didacticText);

    if (title) parts.push(title);

    if (item.type === 'despesa') {
        const responsible = politician ? `O registro está ligado a ${politician.name}, do ${politician.party} de ${politician.state}.` : '';
        const amount = item.amount ? `Valor informado: ${item.amount}.` : '';
        const provider = item.provider ? `Fornecedor: ${sentence(item.provider)}.` : '';
        parts.push(...[responsible, amount, provider].filter(Boolean));
    } else {
        if (subject && subject !== title) parts.push(subject);
        if (why) parts.push(`Por que importa: ${why}`);
        else if (didactic && didactic !== title && didactic !== subject) parts.push(`Em português claro: ${didactic}`);
        if (next) parts.push(`Próximo passo: ${next}`);
    }

    if (politician && item.type !== 'despesa') {
        parts.push(`Parlamentar relacionado: ${politician.name}, ${politician.party} de ${politician.state}.`);
    } else if (item.organ) {
        parts.push(`Fonte institucional: ${sentence(item.organ)}.`);
    }

    return parts
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
};
