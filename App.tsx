
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
import EducationModal from './views/EducationView'; // Alterado para Modal
import ArticlesListView from './views/ArticlesListView';
import DataTransparencyModal from './components/DataTransparencyModal';
import { fetchDeputados, fetchSenadores, fetchGlobalVotacoes } from './services/camaraApi';
import { generateEducationalFeed, EducationalItem } from './services/ai';
import { Politician, FeedItem } from './types';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL as STATIC_EDUCATION } from './constants';

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [politicians, setPoliticians] = useState<Politician[]>(POLITICIANS_DB);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
  
  // Estado para Conteúdo Educativo (Dinâmico)
  const [educationItems, setEducationItems] = useState<any[]>(STATIC_EDUCATION);
  const [loadingEducation, setLoadingEducation] = useState(true);

  const [selectedProfile, setSelectedProfile] = useState<Politician | null>(null);
  const [comparisonProfile, setComparisonProfile] = useState<Politician | null>(null);
  const [matchResults, setMatchResults] = useState<Politician[] | null>(null);
  
  // Controle do Modal de Educação
  const [selectedEducationId, setSelectedEducationId] = useState<number | null>(null);
  
  const [darkMode, setDarkMode] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [followingIds, setFollowingIds] = useState<number[]>([]);

  useEffect(() => {
    const loadData = async () => {
        try {
            // 1. Dados do Congresso (Rápido/Cacheado)
            const [deps, sens, feed] = await Promise.all([
                fetchDeputados(),
                fetchSenadores(),
                fetchGlobalVotacoes()
            ]);
            const allPol = [...deps, ...sens];
            setPoliticians(allPol);
            setFeedItems(feed);

            // 2. Dados de IA (Geração sob demanda - não bloqueia UI inicial)
            generateEducationalFeed().then(aiItems => {
                if (aiItems && aiItems.length > 0) {
                    setEducationItems(aiItems);
                }
                setLoadingEducation(false);
            });

        } catch (error) {
            console.error("Failed to load initial data", error);
            setLoadingEducation(false);
        }
    };
    loadData();

    const savedFollowing = localStorage.getItem('paporeto_following');
    if (savedFollowing) {
        try {
            setFollowingIds(JSON.parse(savedFollowing));
        } catch (e) {
            console.error("Error parsing following ids", e);
        }
    }
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleProfileSelect = (pol: Politician) => {
      setSelectedProfile(pol);
  };

  const handleToggleFollow = (id: number) => {
      setFollowingIds(prev => {
          const newVal = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
          localStorage.setItem('paporeto_following', JSON.stringify(newVal));
          return newVal;
      });
  };

  const renderContent = () => {
      // Modais são renderizados fora do switch principal, no final do componente
      if (matchResults) {
          return <MatchResultsView results={matchResults} onSelectProfile={handleProfileSelect} onRetake={() => { setMatchResults(null); setActiveTab('match'); }} />;
      }
      
      if (activeTab === 'match') {
          return <MatchView politicians={politicians} onFinish={setMatchResults} onCancel={() => setActiveTab('feed')} />;
      }

      if (comparisonProfile && selectedProfile) {
          return <ComparatorView candidateA={selectedProfile} candidateB={comparisonProfile} onBack={() => setComparisonProfile(null)} />;
      }

      if (selectedProfile) {
          return (
            <ProfileView 
                candidate={selectedProfile} 
                onBack={() => setSelectedProfile(null)} 
                onCompare={(pol) => {
                    alert("Funcionalidade de comparação em desenvolvimento. Selecione outro perfil na aba 'Explorar'.");
                    setComparisonProfile(null); 
                }}
                onShare={() => {
                     if (navigator.share) navigator.share({ title: selectedProfile.name, url: window.location.href }).catch(() => {});
                }}
                feedItems={feedItems.filter(f => f.candidateId === selectedProfile.id)}
                allPoliticians={politicians}
                isFollowing={followingIds.includes(selectedProfile.id)}
                onToggleFollow={() => handleToggleFollow(selectedProfile.id)}
            />
          );
      }

      switch (activeTab) {
          case 'feed':
              return (
                <FeedView 
                    politicians={politicians} 
                    feedItems={feedItems} 
                    educationItems={educationItems} // Passando dados dinâmicos
                    loadingEducation={loadingEducation}
                    onSelectCandidate={handleProfileSelect} 
                    onEducationClick={setSelectedEducationId}
                    onSeeMore={() => setActiveTab('feed_all')}
                    followingIds={followingIds}
                />
              );
          case 'articles':
              return (
                  <ArticlesListView 
                    educationItems={educationItems} // Passando dados dinâmicos
                    onSelectArticle={setSelectedEducationId}
                  />
              );
          case 'feed_all':
              return (
                  <FullFeedView 
                    feedItems={feedItems} 
                    politicians={politicians} 
                    onBack={() => setActiveTab('feed')} 
                    onSelectCandidate={handleProfileSelect} 
                  />
              );
          case 'explore':
              return (
                  <ExploreView 
                    politicians={politicians} 
                    onSelectCandidate={handleProfileSelect} 
                    followingIds={followingIds}
                  />
              );
          case 'parties':
              return (
                <PartiesDashboardView 
                    politicians={politicians} 
                    feedItems={feedItems}
                    onSelectCandidate={handleProfileSelect}
                    onGoToFeed={() => setActiveTab('feed')} // Novo Drill-down
                    onGoToExplore={() => setActiveTab('explore')} // Novo Drill-down
                />
              );
          default:
              return (
                <FeedView 
                    politicians={politicians} 
                    feedItems={feedItems} 
                    educationItems={educationItems}
                    loadingEducation={loadingEducation}
                    onSelectCandidate={handleProfileSelect} 
                    onEducationClick={setSelectedEducationId} 
                    onSeeMore={() => setActiveTab('feed_all')} 
                    followingIds={followingIds}
                />
              );
      }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-500">
        <div className="hidden md:flex w-24 xl:w-72 flex-col border-r border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl z-20">
            <div className="p-4 h-full">
                <Sidebar 
                    activeTab={activeTab} 
                    setActiveTab={setActiveTab} 
                    goToMatch={() => setActiveTab('match')} 
                    darkMode={darkMode} 
                    toggleDarkMode={toggleDarkMode}
                    onShowData={() => setShowDataModal(true)}
                />
            </div>
        </div>

        <div className="flex-1 flex flex-col relative overflow-hidden">
            <main className="flex-1 overflow-hidden relative">
                {renderContent()}
            </main>

            <MobileNav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                goToMatch={() => setActiveTab('match')} 
                darkMode={darkMode} 
                toggleDarkMode={toggleDarkMode}
            />
        </div>

        {/* MODAIS GLOBAIS */}
        {showDataModal && <DataTransparencyModal onClose={() => setShowDataModal(false)} />}
        
        {selectedEducationId !== null && (
            <EducationModal 
                items={educationItems}
                selectedId={selectedEducationId} 
                onClose={() => setSelectedEducationId(null)} 
                onSelect={(id) => setSelectedEducationId(id)}
            />
        )}
    </div>
  );
}

export default App;
