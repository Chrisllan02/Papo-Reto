
import React, { Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import DataTransparencyModal from './components/DataTransparencyModal';
import OnboardingModal from './components/OnboardingModal';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppContext } from './contexts/AppContext';

const FeedView = lazy(() => import('./views/FeedView'));
const ExploreView = lazy(() => import('./views/ExploreView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const PartiesDashboardView = lazy(() => import('./views/PartiesDashboardView'));
const FullFeedView = lazy(() => import('./views/FullFeedView'));
const EducationView = lazy(() => import('./views/EducationView'));
const ArticlesListView = lazy(() => import('./views/ArticlesListView'));
const NewsHistoryView = lazy(() => import('./views/NewsHistoryView'));
const ChatView = lazy(() => import('./views/ChatView'));

function App() {
  const { state, actions } = useAppContext();
  
  // Extraindo do contexto para facilitar leitura
  const { 
      activeTab, politicians, feedItems, articles, parties, isLoading,
      selectedCandidate, selectedEducationId, isFullFeed, isNewsHistory, explorePreselectedState,
      showDataModal, showOnboarding, readArticleIds, error, followedIds
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
            isFollowing={followedIds.includes(selectedCandidate.id)}
            onToggleFollow={() => actions.toggleFollow(selectedCandidate.id)}
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
              content = <FeedView politicians={politicians} feedItems={feedItems} onSelectCandidate={actions.selectCandidate} onSeeMore={() => actions.setFullFeed(true)} onGoToExplore={actions.goToExplore} />;
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
              content = <FeedView politicians={politicians} feedItems={feedItems} onSelectCandidate={actions.selectCandidate} onSeeMore={() => actions.setFullFeed(true)} onGoToExplore={actions.goToExplore} />;
      }
  }

  return (
    <div className={`flex h-[100dvh] w-full overflow-hidden font-sans transition-colors duration-500`}>
        {showOnboarding && <OnboardingModal onFinish={() => actions.setShowOnboarding(false)} />}
        {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 shadow-sm">
                {error}
            </div>
        )}

           <aside className="hidden md:flex w-[88px] xl:w-[264px] flex-col h-[95%] my-auto ml-4 glass-surface rounded-[2.5rem] p-4 xl:p-6 z-50 shrink-0 transition-all duration-300">
             <Sidebar />
        </aside>

        <main id="main-content" className="flex-1 h-full relative overflow-hidden outline-none">
             {showDataModal && <DataTransparencyModal onClose={() => actions.setShowDataModal(false)} />}
             <ErrorBoundary>
               <Suspense fallback={<LoadingScreen />}>
                 {content}
               </Suspense>
             </ErrorBoundary>
        </main>

        <MobileNav />
    </div>
  );
}

export default App;
