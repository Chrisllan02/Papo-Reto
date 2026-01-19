
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import FeedView from './views/FeedView';
import ExploreView from './views/ExploreView';
import ProfileView from './views/ProfileView';
import MatchView from './views/MatchView';
import MatchResultsView from './views/MatchResultsView';
import ComparatorView from './views/ComparatorView';
import PartiesDashboardView from './views/PartiesDashboardView';
import FullFeedView from './views/FullFeedView';
import EducationView from './views/EducationView';
import ArticlesListView from './views/ArticlesListView';
import DataTransparencyModal from './components/DataTransparencyModal';
import OnboardingModal from './components/OnboardingModal'; 
import { fetchDeputados, fetchSenadores, fetchGlobalVotacoes, fetchPartidos, getStaticParties } from './services/camaraApi';
import { generateEducationalContent } from './services/ai';
import { Politician, FeedItem, Party } from './types';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL } from './constants';

// Helper para mapear temas da IA para estilos visuais
const mapArticleStyle = (index: number, topic: string) => {
    // Paleta rigorosa: Azul, Verde, Amarelo e Neutros (Bandeira + Moderno)
    const styles = [
        // 1. Verde (Esperança/Natureza)
        { colorFrom: 'from-green-600', colorTo: 'to-green-900', icon: 'Lightbulb', activeColor: 'bg-green-100 text-green-700' },
        // 2. Azul (Confiança/Institucional)
        { colorFrom: 'from-blue-600', colorTo: 'to-blue-900', icon: 'Banknote', activeColor: 'bg-blue-100 text-blue-700' },
        // 3. Amarelo/Ouro (Riqueza/Atenção - Substitui Vermelho)
        { colorFrom: 'from-yellow-500', colorTo: 'to-yellow-700', icon: 'ScrollText', activeColor: 'bg-yellow-100 text-yellow-700' },
        // 4. Neutro Escuro (Sério)
        { colorFrom: 'from-gray-800', colorTo: 'to-black', icon: 'Lightbulb', activeColor: 'bg-gray-100 text-gray-700' },
        // 5. Azul Vibrante (Tecnologia)
        { colorFrom: 'from-blue-500', colorTo: 'to-blue-700', icon: 'Banknote', activeColor: 'bg-blue-50 text-blue-600' },
        // 6. Verde Escuro (Dinheiro/Orçamento)
        { colorFrom: 'from-green-700', colorTo: 'to-green-950', icon: 'ScrollText', activeColor: 'bg-green-50 text-green-800' }
    ];
    
    // Tenta deduzir ícone pelo tópico se possível
    let base = styles[index % styles.length];
    let icon = base.icon;
    
    const t = topic ? topic.toLowerCase() : '';
    if (t.includes('orçamento') || t.includes('dinheiro') || t.includes('fundo') || t.includes('gasto')) icon = 'Banknote';
    if (t.includes('lei') || t.includes('pec') || t.includes('pl') || t.includes('constituição')) icon = 'ScrollText';

    return {
        ...base,
        icon
    };
};

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [politicians, setPoliticians] = useState<Politician[]>(POLITICIANS_DB);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
  const [articles, setArticles] = useState(EDUCATION_CAROUSEL); 
  const [parties, setParties] = useState<Party[]>(getStaticParties());
  
  const [darkMode, setDarkMode] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Politician | null>(null);
  
  // State for Comparison Logic
  const [compareSource, setCompareSource] = useState<Politician | null>(null);
  const [compareTarget, setCompareTarget] = useState<Politician | null>(null);

  const [matchResults, setMatchResults] = useState<Politician[] | null>(null);
  const [showDataModal, setShowDataModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false); 
  const [selectedEducationId, setSelectedEducationId] = useState<number | null>(null);
  const [isFullFeed, setIsFullFeed] = useState(false);
  
  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Bootstrap Data & Check Onboarding
  useEffect(() => {
    const loadData = async () => {
        try {
            // Check LocalStorage for onboarding
            const hasSeenOnboarding = localStorage.getItem('paporeto_onboarding_completed');
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }

            const [deps, sens, feeds, parts] = await Promise.all([
                fetchDeputados(),
                fetchSenadores(),
                fetchGlobalVotacoes(),
                fetchPartidos()
            ]);
            setPoliticians([...deps, ...sens]);
            setFeedItems(feeds);
            setParties(parts);

            // AI Educational Content
            const eduContent = await generateEducationalContent();
            if (eduContent && eduContent.length > 0) {
                 const newArticles = eduContent.map((item, index) => ({
                     id: index + 100,
                     title: item.title,
                     text: item.text,
                     ...mapArticleStyle(index, item.topic)
                 }));
                 setArticles(newArticles);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        }
    };
    loadData();
  }, []);

  const handleFinishOnboarding = () => {
      localStorage.setItem('paporeto_onboarding_completed', 'true');
      setShowOnboarding(false);
  };

  const handleSelectCandidate = (pol: Politician) => {
      if (compareSource) {
          // If we are selecting a target for comparison
          setCompareTarget(pol);
          // We keep compareSource as is, but now we have both, so View will switch to Comparator
      } else {
          // Normal selection
          setSelectedCandidate(pol);
      }
  };

  const startComparison = (pol: Politician) => {
      setCompareSource(pol);
      setSelectedCandidate(null); // Exit profile view
      setActiveTab('explore'); // Go to list to pick second
      // Ideally show a toast "Select another politician to compare"
      alert("Selecione outro político na lista para comparar com " + pol.name);
  };

  const cancelComparison = () => {
      setCompareSource(null);
      setCompareTarget(null);
  };
  
  // View Routing Logic
  let content;
  if (activeTab === 'match' && !matchResults) {
      content = <MatchView politicians={politicians} onFinish={setMatchResults} onCancel={() => setActiveTab('feed')} />;
  } else if (matchResults) {
      content = <MatchResultsView results={matchResults} onSelectProfile={(p) => { setMatchResults(null); setSelectedCandidate(p); }} onRetake={() => setMatchResults(null)} />;
  } else if (compareSource && compareTarget) {
      content = <ComparatorView candidateA={compareSource} candidateB={compareTarget} onBack={cancelComparison} />;
  } else if (selectedCandidate) {
      content = (
        <ProfileView 
            candidate={selectedCandidate} 
            onBack={() => setSelectedCandidate(null)} 
            onCompare={startComparison}
            onShare={() => {}}
            feedItems={feedItems.filter(f => f.candidateId === selectedCandidate.id)}
            allPoliticians={politicians}
            onUpdate={(updated) => {
                setPoliticians(prev => prev.map(p => p.id === updated.id ? updated : p));
                setSelectedCandidate(updated);
            }}
            // Mock following logic for now
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
            onSelectArticle={setSelectedEducationId}
        />
      );
  } else if (isFullFeed) {
      content = <FullFeedView feedItems={feedItems} politicians={politicians} onBack={() => setIsFullFeed(false)} onSelectCandidate={handleSelectCandidate} />;
  } else {
      switch (activeTab) {
          case 'feed':
              content = <FeedView politicians={politicians} feedItems={feedItems} articles={articles} onSelectCandidate={handleSelectCandidate} onEducationClick={setSelectedEducationId} onSeeMore={() => setIsFullFeed(true)} />;
              break;
          case 'explore':
              content = <ExploreView politicians={politicians} parties={parties} onSelectCandidate={handleSelectCandidate} />;
              break;
          case 'parties':
              content = <PartiesDashboardView politicians={politicians} parties={parties} onSelectCandidate={handleSelectCandidate} />;
              break;
          case 'articles':
              content = <ArticlesListView articles={articles} onSelectArticle={setSelectedEducationId} />;
              break;
          default:
              content = <FeedView politicians={politicians} feedItems={feedItems} articles={articles} onSelectCandidate={handleSelectCandidate} onEducationClick={setSelectedEducationId} onSeeMore={() => setIsFullFeed(true)} />;
      }
  }

  return (
    <div className={`flex h-screen w-full bg-[#F3F4F6] dark:bg-black overflow-hidden font-sans transition-colors duration-500 ${darkMode ? 'dark' : ''}`}>
        
        {/* Onboarding Overlay */}
        {showOnboarding && <OnboardingModal onFinish={handleFinishOnboarding} />}

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-[88px] xl:w-[240px] flex-col h-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 p-4 xl:p-6 z-50 shrink-0 transition-all duration-300">
             <Sidebar 
                activeTab={activeTab} 
                setActiveTab={(tab) => { 
                    setActiveTab(tab); 
                    setSelectedCandidate(null); 
                    setMatchResults(null); 
                    setSelectedEducationId(null); 
                    setIsFullFeed(false);
                    cancelComparison();
                }} 
                goToMatch={() => setActiveTab('match')}
                darkMode={darkMode}
                toggleDarkMode={toggleDarkMode}
                onShowData={() => setShowDataModal(true)}
             />
        </aside>

        <main className="flex-1 h-full relative overflow-hidden">
             {showDataModal && <DataTransparencyModal onClose={() => setShowDataModal(false)} />}
             {content}
        </main>

        <MobileNav 
            activeTab={activeTab} 
            setActiveTab={(tab) => { 
                setActiveTab(tab); 
                setSelectedCandidate(null); 
                setIsFullFeed(false); 
                cancelComparison();
            }} 
            goToMatch={() => setActiveTab('match')}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
        />
    </div>
  );
}

export default App;
