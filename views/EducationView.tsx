import React, { useMemo } from 'react';
import { ArrowRight, ChevronLeft, Scale, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { EducationalArticle } from '../types';
import { getArticleTheme, renderIcon } from '../utils/articleTheme';
import { safeHttpUrl } from '../utils/url';

interface EducationViewProps {
  educationId: number;
  articles: EducationalArticle[];
  onBack: () => void;
  onSelectArticle: (id: number) => void;
}

const EducationView: React.FC<EducationViewProps> = ({ educationId, articles, onBack, onSelectArticle }) => {
  const article = useMemo(() => articles.find(a => a.id === educationId), [articles, educationId]);
  const articleIndex = useMemo(() => articles.findIndex(a => a.id === educationId), [articles, educationId]);
  
  // Lógica inteligente para "Próximo Artigo"
  const nextItem = useMemo(() => {
      const currentIndex = articles.findIndex(a => a.id === educationId);
      const currentArticle = articles[currentIndex];

      if (!currentArticle || articles.length === 0) return articles[0];

      // 1. Prioridade: Próximo artigo do mesmo tópico (Fluxo de Aprendizado)
      // Agrupa artigos do mesmo tema
      const sameTopicArticles = articles.filter(a => a.topic === currentArticle.topic);
      // Descobre onde o atual está dentro desse grupo
      const indexInTopic = sameTopicArticles.findIndex(a => a.id === educationId);

      // Se não for o último do tópico, avança dentro do tópico
      if (indexInTopic !== -1 && indexInTopic < sameTopicArticles.length - 1) {
          return sameTopicArticles[indexInTopic + 1];
      }

      // 2. Fallback: Se acabou o tópico, vai para o próximo da lista geral (Mudança de Tópico / Cíclico)
      return articles[(currentIndex + 1) % articles.length];
  }, [articles, educationId]);

  // Renderizador de Texto Rico (Parágrafos + Negrito Básico)
  const renderRichText = (text: string) => {
      if (!text) return null;
      
      // Divide por quebra de linha dupla para criar parágrafos
      const paragraphs = text.split(/\n\n+/);

      return paragraphs.map((paragraph, pIndex) => {
          // Processa negrito (**texto**) dentro do parágrafo
          const parts = paragraph.split(/(\*\*.*?\*\*)/g);
          
          return (
              <p key={pIndex} className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed text-lg mb-6 last:mb-0">
                  {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                              <strong key={i} className="font-black text-gray-900 dark:text-white">
                                  {part.slice(2, -2)}
                              </strong>
                          );
                      }
                      return part;
                  })}
              </p>
          );
      });
  };

  if (!article) return null;
  const articleTheme = getArticleTheme(article.topic, articleIndex);
  const nextIndex = nextItem ? articles.findIndex(a => a.id === nextItem.id) : -1;
  const nextTheme = nextItem ? getArticleTheme(nextItem.topic, nextIndex) : null;

  return (
    <div className="w-full h-full bg-transparent font-sans overflow-y-auto animate-in slide-in-from-right duration-300">
        
        <div className="px-4 md:px-8 pt-4 md:pt-6">
            {/* Hero Header */}
            <div className={`relative min-h-[300px] rounded-2xl overflow-hidden p-6 md:p-12 flex flex-col justify-between bg-midnight ${articleTheme.bg}`}>
                {/* Texture */}
                <div className="absolute inset-0 opacity-10 texture-overlay mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-black/10" aria-hidden="true"></div>
                
                {/* Nav */}
                <div className="relative z-10 flex justify-between items-start">
                    <button 
                        type="button"
                        onClick={onBack}
                        aria-label="Voltar para o Guia Cidadão"
                        className="w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]"
                    >
                        <ChevronLeft size={24} aria-hidden="true" />
                    </button>
                    <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-semibold border border-white/20">
                        {article.topic}
                    </div>
                </div>

                {/* Title */}
                <div className="relative z-10 mt-8">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-6 border border-white/30">
                        {renderIcon(article.icon, 32, "")}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-2 break-words">
                        {article.title}
                    </h1>
                </div>
            </div>
        </div>

        {/* Content Body */}
        <div className="px-4 md:px-12 py-10 max-w-4xl mx-auto -mt-12 relative z-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 md:p-10 border border-gray-200 dark:border-gray-800">
                
                <div className="prose dark:prose-invert prose-lg max-w-none mb-10">
                    {renderRichText(article.text)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {article.legislation && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-300 font-bold text-sm">
                                <Scale size={16} aria-hidden="true" /> Legislação
                            </div>
                            <p className="text-blue-900 dark:text-blue-100 font-medium text-sm leading-relaxed">
                                {article.legislation}
                            </p>
                        </div>
                    )}
                    
                    {article.impact && (
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                            <div className="flex items-center gap-2 mb-3 text-orange-800 dark:text-orange-300 font-bold text-sm">
                                <AlertCircle size={16} aria-hidden="true" /> Impacto na sua vida
                            </div>
                            <p className="text-orange-900 dark:text-orange-100 font-medium text-sm leading-relaxed">
                                {article.impact}
                            </p>
                        </div>
                    )}
                </div>

                {(article.sourceUrl || article.generatedAt) && (
                    <div className="mb-12 rounded-2xl border border-green-100 dark:border-green-900/30 bg-green-50 dark:bg-green-900/10 p-6">
                        <div className="flex items-center gap-2 mb-3 text-green-800 dark:text-green-300 font-bold text-sm">
                            <RefreshCw size={16} aria-hidden="true" />
                            Conteúdo atualizado automaticamente todos os dias
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-green-900 dark:text-green-100 mb-4">
                            Este material foi montado automaticamente a partir de movimentações legislativas recentes e pode mudar conforme novas pautas entram no Congresso.
                        </p>
                        {safeHttpUrl(article.sourceUrl) && (
                            <a
                                href={safeHttpUrl(article.sourceUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 min-h-[44px] text-sm font-semibold text-green-800 dark:text-green-100 underline underline-offset-4 hover:text-green-900 dark:hover:text-white focus-visible:ring-4 focus-visible:ring-blue-500/40 rounded-lg transition-colors"
                            >
                                Fonte oficial
                                <ExternalLink size={13} aria-hidden="true" />
                            </a>
                        )}
                    </div>
                )}

                {/* Next Suggestion - INCREASED PADDING BOTTOM FOR MOBILE */}
                {nextItem && (
                    <div className="pt-8 border-t border-gray-200 dark:border-gray-800 pb-48 md:pb-0">
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                            {nextItem.topic === article.topic ? 'Continue no tema' : 'Próximo tópico'}
                        </p>
                        <button 
                            type="button"
                            onClick={() => onSelectArticle(nextItem.id)}
                            className={`w-full group ${nextTheme?.bg || 'bg-gradient-to-r from-nuit to-midnight'} p-1 rounded-2xl active:scale-[0.98] transition-transform cursor-pointer text-left focus-visible:ring-4 focus-visible:ring-blue-500/40`}
                        >
                            <div className="glass-panel rounded-xl p-5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center dark:text-white ${nextTheme?.text || 'text-nuit'}`}>
                                        {renderIcon(nextItem.icon, 20, "opacity-80")}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Próximo</p>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg line-clamp-2">{nextItem.title}</h4>
                                    </div>
                                </div>
                                <div className="w-11 h-11 shrink-0 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                                    <ArrowRight size={18} aria-hidden="true" />
                                </div>
                            </div>
                        </button>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

export default EducationView;
