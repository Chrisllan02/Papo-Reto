
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import FeedView from './views/FeedView';
import ExploreView from './views/ExploreView';
import ProfileView from './views/ProfileView';
import PartiesDashboardView from './views/PartiesDashboardView';
import EducationView from './views/EducationView';
import ArticlesListView from './views/ArticlesListView';
import NewsHistoryView from './views/NewsHistoryView';
import DataTransparencyModal from './components/DataTransparencyModal';
import OnboardingModal from './components/OnboardingModal'; 
import LoadingScreen from './components/LoadingScreen';
import { fetchDeputados, fetchSenadores, fetchGlobalVotacoes, fetchPartidos, getStaticParties } from './services/camaraApi';
import { generateEducationalContent } from './services/ai';
import { Politician, FeedItem, Party } from './types';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL } from './constants';

const mapArticleStyle = (index: number, topic: string) => {
    const styles = [
        { colorFrom: 'from-picture', colorTo: 'to-midnight', icon: 'Lightbulb', activeColor: 'bg-spring/20 text-picture' },
        { colorFrom: 'from-nuit', colorTo: 'to-midnight', icon: 'Banknote', activeColor: 'bg-nuit/10 text-nuit' },
        { colorFrom: 'from-spring', colorTo: 'to-mantis', icon: 'ScrollText', activeColor: 'bg-praxeti text-midnight border border-spring' },
        { colorFrom: 'from-midnight', colorTo: 'to-black', icon: 'Lightbulb', activeColor: 'bg-praxeti text-midnight' },
        { colorFrom: 'from-nuit', colorTo: 'to-blue-900', icon: 'Banknote', activeColor: 'bg-blue-50 text-nuit' },
        { colorFrom: 'from-picture', colorTo: 'to-green-900', icon: 'ScrollText', activeColor: 'bg-green-50 text-picture' }
    ];
    let base = styles[index % styles.length];
    let icon = base.icon;
    const t = topic ? topic.toLowerCase() : '';
    if (t.includes('orçamento') || t.includes('dinheiro') || t.includes('fundo') || t.includes('gasto')) icon = 'Banknote';
    if (t.includes('lei') || t.includes('pec') || t.includes('pl') || t.includes('constituição')) icon = 'ScrollText';
    return { ...base, icon };
};

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [politicians, setPoliticians] = useState<Politician[]>(POLITICIANS_DB);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
  // Fix: Use any[] or union type to allow optional properties from generated content
  const [articles, setArticles] = useState<any[]>(EDUCATION_CAROUSEL); 
  const [parties, setParties] = useState<Party[]>(getStaticParties());
  
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1); 

  const [selectedCandidate, setSelectedCandidate] = useState<Politician | null>(null);
  const [readArticleIds, setReadArticleIds] = useState<number[]>([]); 
  
  const [showDataModal, setShowDataModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false); 
  const [selectedEducationId, setSelectedEducationId] = useState<number | null>(null);
  const [isNewsHistory, setIsNewsHistory] = useState(false);
  const [explorePreselectedState, setExplorePreselectedState] = useState<string>(''); 
  
  const [isLoading, setIsLoading] = useState(true);
  
  const toggleDarkMode = () => {
    if (highContrast) setHighContrast(false);
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    document.documentElement.classList.remove('high-contrast');
  };

  const toggleHighContrast = () => {
      const newVal = !highContrast;
      setHighContrast(newVal);
      if (newVal) {
          setDarkMode(false);
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('high-contrast');
      } else {
          document.documentElement.classList.remove('high-contrast');
      }
  };

  const cycleFontSize = () => {
      setFontSizeLevel(prev => {
          if (prev === 1) return 1.1;
          if (prev === 1.1) return 1.25;
          return 1;
      });
  };

  const markArticleAsRead = (id: number) => {
      if (!readArticleIds.includes(id)) {
          setReadArticleIds(prev => [...prev, id]);
      }
      setSelectedEducationId(id);
  };

  useEffect(() => {
    const loadData = async () => {
        try {
            const [deps, sens, feeds, parts] = await Promise.all([
                fetchDeputados(),
                fetchSenadores(),
                fetchGlobalVotacoes().catch(() => []), 
                fetchPartidos()
            ]);
            setPoliticians([...deps, ...sens]);
            if (feeds && feeds.length > 0) setFeedItems(feeds);
            else setFeedItems(FEED_ITEMS);
            setParties(parts);
            generateEducationalContent().then(eduContent => {
                if (eduContent && eduContent.length > 0) {
                     const newArticles = eduContent.map((item, index) => ({
                         id: index + 100, // IDs start at 100 to avoid conflict with static IDs (1, 2, 3...)
                         title: item.title,
                         text: item.text,
                         topic: item.topic, 
                         legislation: item.legislation, 
                         impact: item.impact,           
                         ...mapArticleStyle(index, item.topic)
                     }));
                     // MERGE instead of replace to avoid "Content not found" if user is reading static content
                     setArticles(prev => {
                         // Check for duplicates based on title to be safe with React.StrictMode double-invocations
                         const existingTitles = new Set(prev.map(a => a.title));
                         const uniqueNew = newArticles.filter(a => !existingTitles.has(a.title));
                         return [...prev, ...uniqueNew];
                     });
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

  const handleSelectCandidate = (pol: Politician) => {
      setSelectedCandidate(pol);
  };

  const handleGoToExplore = (state: string) => {
      setExplorePreselectedState(state);
      setActiveTab('explore');
  };
  
  if (isLoading) return <LoadingScreen />;

  let content;
  if (selectedCandidate) {
      content = (
        <ProfileView 
            candidate={selectedCandidate} 
            onBack={() => setSelectedCandidate(null)} 
            onShare={() => {}}
            feedItems={feedItems.filter(f => f.candidateId === selectedCandidate.id)}
            allPoliticians={politicians}
            onUpdate={(updated) => {
                setPoliticians(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedCandidate(updated);
            }}
            isFollowing={false}
            onToggleFollow={() => {}}
        />
      );
  } else if (selectedEducationId) {
      content = (
        <EducationView 
            educationId={selectedEducationId} 
            articles={articles} 
            onBack={() => setSelectedEducationId(null)}
            onSelectArticle={markArticleAsRead}
        />
      );
  } else if (isNewsHistory) {
      content = <NewsHistoryView onBack={() => setIsNewsHistory(false)} />;
  } else {
      switch (activeTab) {
          case 'feed':
              content = <FeedView politicians={politicians} feedItems={feedItems} articles={articles} onSelectCandidate={handleSelectCandidate} onEducationClick={markArticleAsRead} onGoToExplore={handleGoToExplore} />;
              break;
          case 'explore':
              content = <ExploreView politicians={politicians} parties={parties} onSelectCandidate={handleSelectCandidate} preselectedState={explorePreselectedState} />;
              break;
          case 'parties':
              content = <PartiesDashboardView politicians={politicians} parties={parties} onSelectCandidate={handleSelectCandidate} />;
              break;
          case 'articles':
              content = <ArticlesListView articles={articles} onSelectArticle={markArticleAsRead} readArticleIds={readArticleIds} onOpenNewsHistory={() => setIsNewsHistory(true)} />;
              break;
          default:
              content = <FeedView politicians={politicians} feedItems={feedItems} articles={articles} onSelectCandidate={handleSelectCandidate} onEducationClick={markArticleAsRead} onGoToExplore={handleGoToExplore} />;
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
             <Sidebar 
                activeTab={activeTab} 
                setActiveTab={(tab) => { 
                    setActiveTab(tab); 
                    setSelectedCandidate(null); 
                    setSelectedEducationId(null); 
                    setIsNewsHistory(false);
                    if (tab !== 'explore') setExplorePreselectedState('');
                }} 
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                onShowData={() => setShowDataModal(true)}
                onStartTour={() => setShowOnboarding(true)}
                highContrast={highContrast}
                onToggleHighContrast={toggleHighContrast}
                fontSizeLevel={fontSizeLevel}
                onCycleFontSize={cycleFontSize}
             />
        </aside>

        <main id="main-content" className="flex-1 h-full relative overflow-hidden outline-none">
             {showDataModal && <DataTransparencyModal onClose={() => setShowDataModal(false)} />}
             {content}
        </main>

        <MobileNav 
            activeTab={activeTab} 
            setActiveTab={(tab) => { 
                setActiveTab(tab); 
                setSelectedCandidate(null); 
                setIsNewsHistory(false);
                if (tab !== 'explore') setExplorePreselectedState('');
            }} 
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            highContrast={highContrast}
            onToggleHighContrast={toggleHighContrast}
            onStartTour={() => setShowOnboarding(true)}
            fontSizeLevel={fontSizeLevel}
            onCycleFontSize={cycleFontSize}
        />
    </div>
  );
}

export default App;
