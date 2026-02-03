
import React from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import FeedView from './views/FeedView';
import ExploreView from './views/ExploreView';
import ProfileView from './views/ProfileView';
import PartiesDashboardView from './views/PartiesDashboardView';
import FullFeedView from './views/FullFeedView';
import EducationView from './views/EducationView';
import ArticlesListView from './views/ArticlesListView';
import NewsHistoryView from './views/NewsHistoryView';
import ChatView from './views/ChatView';
import DataTransparencyModal from './components/DataTransparencyModal';
import OnboardingModal from './components/OnboardingModal'; 
import LoadingScreen from './components/LoadingScreen';
import { useAppContext } from './contexts/AppContext';

function App() {
  const { state, actions } = useAppContext();
  
  // Extraindo do contexto para facilitar leitura
  const { 
      activeTab, politicians, feedItems, articles, parties, isLoading,
      selectedCandidate, selectedEducationId, isFullFeed, isNewsHistory, explorePreselectedState,
      showDataModal, showOnboarding, readArticleIds
  } = state;

  if (isLoading) return <LoadingScreen />;

  // Lógica de Roteamento de Views
  let content;
  if (selectedCandidate) {
      content = (
        <ProfileView 
            candidate={selectedCandidate} 
            onBack={() => actions.selectCandidate(null)} 
            onShare={() => {}}
            feedItems={feedItems.filter(f => f.candidateId === selectedCandidate.id)}
            allPoliticians={politicians}
            onUpdate={actions.updatePolitician}
            isFollowing={false}
            onToggleFollow={() => {}}
        />
      );
  } else if (selectedEducationId) {
      content = (
        <EducationView 
            key={selectedEducationId} // Força reset de scroll e animação
            educationId={selectedEducationId} 
            articles={articles} 
            onBack={() => actions.selectEducation(null)}
            onSelectArticle={actions.markArticleAsRead}
        />
      );
  } else if (isFullFeed) {
      content = <FullFeedView feedItems={feedItems} politicians={politicians} onBack={() => actions.setFullFeed(false)} onSelectCandidate={actions.selectCandidate} />;
  } else if (isNewsHistory) {
      content = <NewsHistoryView onBack={() => actions.setNewsHistory(false)} />;
  } else {
      switch (activeTab) {
          case 'feed':
              content = <FeedView politicians={politicians} feedItems={feedItems} articles={articles} onSelectCandidate={actions.selectCandidate} onEducationClick={actions.markArticleAsRead} onSeeMore={() => actions.setFullFeed(true)} onGoToExplore={actions.goToExplore} />;
              break;
          case 'explore':
              content = <ExploreView politicians={politicians} parties={parties} onSelectCandidate={actions.selectCandidate} preselectedState={explorePreselectedState} />;
              break;
          case 'parties':
              content = <PartiesDashboardView politicians={politicians} parties={parties} onSelectCandidate={actions.selectCandidate} />;
              break;
          case 'articles':
              content = <ArticlesListView articles={articles} onSelectArticle={actions.markArticleAsRead} readArticleIds={readArticleIds} onOpenNewsHistory={() => actions.setNewsHistory(true)} />;
              break;
          case 'chat':
              content = <ChatView onBack={() => actions.setActiveTab('feed')} />;
              break;
          default:
              content = <FeedView politicians={politicians} feedItems={feedItems} articles={articles} onSelectCandidate={actions.selectCandidate} onEducationClick={actions.markArticleAsRead} onSeeMore={() => actions.setFullFeed(true)} onGoToExplore={actions.goToExplore} />;
      }
  }

  return (
    <div className={`flex h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-500`}>
        <style>{`
            /* ALTO CONTRASTE (Amarelo sobre Preto) - Global Scope */
            html.high-contrast, html.high-contrast body {
                background-color: #000000 !important;
                background-image: none !important;
                color: #FFFF00 !important;
            }
            
            /* Reset Global para High Contrast */
            html.high-contrast * {
                background-color: #000000 !important;
                background-image: none !important;
                color: #FFFF00 !important;
                box-shadow: none !important;
                text-shadow: none !important;
                backdrop-filter: none !important;
                border-color: #FFFF00 !important;
            }

            /* Bordas para definição de estrutura */
            html.high-contrast div, 
            html.high-contrast section, 
            html.high-contrast article, 
            html.high-contrast nav,
            html.high-contrast header,
            html.high-contrast aside {
                border-color: #FFFF00 !important;
            }

            /* Componentes Interativos */
            html.high-contrast button, 
            html.high-contrast a, 
            html.high-contrast input, 
            html.high-contrast select, 
            html.high-contrast textarea {
                border: 2px solid #FFFF00 !important;
                background-color: #000000 !important;
                color: #FFFF00 !important;
            }

            /* Estado Hover */
            html.high-contrast button:hover, 
            html.high-contrast a:hover,
            html.high-contrast select:hover {
                background-color: #FFFF00 !important;
                color: #000000 !important;
            }
            html.high-contrast button:hover *, 
            html.high-contrast a:hover * {
                color: #000000 !important;
                stroke: #000000 !important;
                fill: #000000 !important;
            }

            /* Ícones SVG */
            html.high-contrast svg {
                stroke: #FFFF00 !important;
                color: #FFFF00 !important;
                /* fill: none !important; REMOVIDO para permitir gráficos e mapas */
            }
            html.high-contrast svg.text-white {
                stroke: #FFFF00 !important;
            }

            /* Barras de Progresso e Gráficos */
            /* No alto contraste, preenchemos o que seria colorido com amarelo sólido */
            html.high-contrast .bg-blue-600, 
            html.high-contrast .bg-blue-500,
            html.high-contrast .bg-green-500, 
            html.high-contrast .bg-red-500,
            html.high-contrast .bg-orange-500,
            html.high-contrast .bg-yellow-400 {
                background-color: #FFFF00 !important;
                border: 1px solid #000 !important;
            }
            
            /* Tracks de fundo dos gráficos */
            html.high-contrast .bg-gray-200,
            html.high-contrast .bg-gray-100 {
                border: 1px solid #FFFF00 !important;
                background-color: #000000 !important;
            }

            /* Imagens */
            html.high-contrast img {
                filter: grayscale(100%) contrast(150%) !important;
                border: 2px solid #FFFF00 !important;
                opacity: 0.8 !important;
            }

            /* Mapa do Brasil (SVG) */
            html.high-contrast #map .state .shape {
                fill: #000000 !important;
                stroke: #FFFF00 !important;
                stroke-width: 1px !important;
            }
            html.high-contrast #map .state:hover .shape,
            html.high-contrast #map .state.active .shape {
                fill: #FFFF00 !important;
                stroke: #FFFF00 !important;
            }
            html.high-contrast #map .state:hover text,
            html.high-contrast #map .state.active text {
                fill: #000000 !important;
                stroke: none !important;
            }

            /* Scrollbars */
            html.high-contrast ::-webkit-scrollbar {
                width: 14px;
                background: #000;
                border-left: 2px solid #FFFF00;
            }
            html.high-contrast ::-webkit-scrollbar-thumb {
                background: #FFFF00;
                border: 2px solid #000;
            }

            body { background-attachment: fixed; }
        `}</style>
        
        {showOnboarding && <OnboardingModal onFinish={() => actions.setShowOnboarding(false)} />}

        <aside className="hidden md:flex w-[88px] xl:w-[240px] flex-col h-[95%] my-auto ml-4 glass rounded-[2.5rem] p-4 xl:p-6 z-50 shrink-0 transition-all duration-300 shadow-xl dark:shadow-none border border-white/20 dark:border-white/5">
             <Sidebar />
        </aside>

        <main id="main-content" className="flex-1 h-full relative overflow-hidden outline-none">
             {showDataModal && <DataTransparencyModal onClose={() => actions.setShowDataModal(false)} />}
             {content}
        </main>

        <MobileNav />
    </div>
  );
}

export default App;
