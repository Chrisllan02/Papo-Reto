
import React, { useEffect, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import DataTransparencyModal from './components/DataTransparencyModal';
import OnboardingModal from './components/OnboardingModal'; 
import LoadingScreen from './components/LoadingScreen';
import { fetchDeputados, fetchSenadores, fetchGlobalVotacoes, fetchPartidos, getStaticParties } from './services/camaraApi';
import { generateEducationalContent } from './services/ai';
import { useAppStore } from './store/useAppStore';
import { FEED_ITEMS } from './constants';

// --- LAZY LOADED VIEWS ---
const FeedView = React.lazy(() => import('./views/FeedView'));
const ExploreView = React.lazy(() => import('./views/ExploreView'));
const ProfileView = React.lazy(() => import('./views/ProfileView'));
const PartiesDashboardView = React.lazy(() => import('./views/PartiesDashboardView'));
const EducationView = React.lazy(() => import('./views/EducationView'));
const ArticlesListView = React.lazy(() => import('./views/ArticlesListView'));
const NewsHistoryView = React.lazy(() => import('./views/NewsHistoryView'));

const mapArticleStyle = (index: number, topic: string) => {
    const styles = [
        { colorFrom: 'from-picture', colorTo: 'to-midnight', icon: 'Lightbulb' },
        { colorFrom: 'from-nuit', colorTo: 'to-midnight', icon: 'Banknote' },
        { colorFrom: 'from-spring', colorTo: 'to-mantis', icon: 'ScrollText' },
        { colorFrom: 'from-midnight', colorTo: 'to-black', icon: 'Lightbulb' },
        { colorFrom: 'from-nuit', colorTo: 'to-blue-900', icon: 'Banknote' },
        { colorFrom: 'from-picture', colorTo: 'to-green-900', icon: 'ScrollText' }
    ];
    let base = styles[index % styles.length];
    let icon = base.icon;
    const t = topic ? topic.toLowerCase() : '';
    if (t.includes('orçamento') || t.includes('dinheiro') || t.includes('fundo') || t.includes('gasto')) icon = 'Banknote';
    if (t.includes('lei') || t.includes('pec') || t.includes('pl') || t.includes('constituição')) icon = 'ScrollText';
    return { ...base, icon };
};

function App() {
  // Global State Consumption
  const { 
      activeTab, 
      selectedCandidate, 
      selectedEducationId, 
      isNewsHistoryOpen, 
      showDataModal, 
      showOnboarding,
      fontSizeLevel,
      darkMode,
      highContrast,
      setShowDataModal,
      setShowOnboarding,
      setSelectedCandidate,
      setSelectedEducationId,
      setIsNewsHistoryOpen,
      setPoliticians,
      setFeedItems,
      setParties,
      setArticles
  } = useAppStore();

  const [isLoading, setIsLoading] = React.useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
        try {
            // Set static defaults first to avoid empty screen
            setParties(getStaticParties());
            setFeedItems(FEED_ITEMS);

            const [deps, sens, feeds, parts] = await Promise.all([
                fetchDeputados(),
                fetchSenadores(),
                fetchGlobalVotacoes().catch(() => []), 
                fetchPartidos()
            ]);
            
            setPoliticians([...deps, ...sens]);
            if (feeds && feeds.length > 0) setFeedItems(feeds);
            setParties(parts);

            // Async AI content generation (non-blocking)
            generateEducationalContent().then(eduContent => {
                if (eduContent && eduContent.length > 0) {
                     const newArticles = eduContent.map((item, index) => ({
                         id: index + 100, 
                         title: item.title,
                         text: item.text,
                         topic: item.topic, 
                         legislation: item.legislation, 
                         impact: item.impact,           
                         ...mapArticleStyle(index, item.topic)
                     }));
                     setArticles(newArticles);
                }
            });
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setTimeout(() => setIsLoading(false), 2500);
        }
    };
    loadData();
  }, []);

  if (isLoading) return <LoadingScreen />;

  let content;
  if (selectedCandidate) {
      content = (
        <ProfileView />
      );
  } else if (selectedEducationId) {
      content = (
        <EducationView />
      );
  } else if (isNewsHistoryOpen) {
      content = <NewsHistoryView onBack={() => setIsNewsHistoryOpen(false)} />;
  } else {
      switch (activeTab) {
          case 'feed':
              content = <FeedView />;
              break;
          case 'explore':
              content = <ExploreView />;
              break;
          case 'parties':
              content = <PartiesDashboardView />;
              break;
          case 'articles':
              content = <ArticlesListView />;
              break;
          default:
              content = <FeedView />;
      }
  }

  const fontStyle = { fontSize: `${fontSizeLevel * 100}%` };

  return (
    <div className={`flex h-screen w-full bg-praxeti dark:bg-midnight overflow-hidden font-sans transition-colors duration-500 ${darkMode ? 'dark' : ''} ${highContrast ? 'high-contrast' : ''}`} style={fontStyle}>
        <style>{`
            .high-contrast { background-color: #000 !important; color: #fff !important; }
            .high-contrast * { background-color: transparent !important; color: #fff !important; border-color: #fff !important; box-shadow: none !important; text-shadow: none !important; }
            .high-contrast button, .high-contrast a { background-color: #000 !important; border: 2px solid #fff !important; }
            .high-contrast button:hover, .high-contrast a:hover { background-color: #fff !important; color: #000 !important; }
            .high-contrast .bg-blue-600, .high-contrast .bg-nuit { background-color: #ffff00 !important; color: #000 !important; }
            
            body { background: fixed; }
        `}</style>
        
        {showOnboarding && <OnboardingModal onFinish={() => setShowOnboarding(false)} />}

        <aside className="hidden md:flex w-[88px] xl:w-[240px] flex-col h-[95%] my-auto ml-4 bg-white/40 dark:bg-midnight/90 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-[2.5rem] p-4 xl:p-6 z-50 shrink-0 transition-all duration-300 shadow-[0_20px_50px_rgba(0,31,63,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
             <Sidebar />
        </aside>

        <main id="main-content" className="flex-1 h-full relative overflow-hidden outline-none">
             {showDataModal && <DataTransparencyModal onClose={() => setShowDataModal(false)} />}
             
             <Suspense fallback={<LoadingScreen />}>
                {content}
             </Suspense>
        </main>

        <MobileNav />
    </div>
  );
}

export default App;
