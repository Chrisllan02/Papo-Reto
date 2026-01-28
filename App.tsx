
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
      darkMode, highContrast, fontSizeLevel,
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

  const fontStyle = { fontSize: `${fontSizeLevel * 100}%` };

  return (
    <div className={`flex h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-500 ${darkMode ? 'dark' : ''} ${highContrast ? 'high-contrast' : ''}`} style={fontStyle}>
        <style>{`
            .high-contrast { background-color: #000 !important; color: #fff !important; }
            .high-contrast * { background-color: transparent !important; color: #fff !important; border-color: #fff !important; box-shadow: none !important; text-shadow: none !important; }
            .high-contrast button, .high-contrast a { background-color: #000 !important; border: 2px solid #fff !important; }
            .high-contrast button:hover, .high-contrast a:hover { background-color: #fff !important; color: #000 !important; }
            .high-contrast .bg-blue-600, .high-contrast .bg-nuit { background-color: #ffff00 !important; color: #000 !important; }
            
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
