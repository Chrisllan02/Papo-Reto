import type { FeedCategory } from '../../types';

export const detectLegislativeCategory = (text: string): FeedCategory => {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (t.includes('educacao') || t.includes('escola') || t.includes('ensino') || t.includes('fundeb')) {
    return 'education';
  }

  if (t.includes('saude') || t.includes('sus') || t.includes('medico') || t.includes('hospital') || t.includes('vacina')) {
    return 'health';
  }

  if (t.includes('economia') || t.includes('tribut') || t.includes('imposto') || t.includes('dinheiro') || t.includes('orcamento') || t.includes('fiscal')) {
    return 'economy';
  }

  if (t.includes('seguranca') || t.includes('policia') || t.includes('crime') || t.includes('pena') || t.includes('armas')) {
    return 'security';
  }

  if (t.includes('trabalho') || t.includes('emprego') || t.includes('salário') || t.includes('clt')) {
    return 'work';
  }

  if (t.includes('ambiente') || t.includes('floresta') || t.includes('animais') || t.includes('clima') || t.includes('agua')) {
    return 'environment';
  }

  if (t.includes('justica') || t.includes('lei') || t.includes('direito') || t.includes('codigo') || t.includes('constituicao')) {
    return 'justice';
  }

  return 'activity';
};

export const formatLegislativeText = (text: string) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
