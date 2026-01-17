

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
import { fetchDeputados, fetchSenadores, fetchGlobalVotacoes, fetchPartidos } from './services/camaraApi';
import { Politician, FeedItem, Party } from './types';
import { POLITICIANS_DB, FEED_ITEMS } from './constants';

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [politicians, setPoliticians] = useState<Politician[]>(POLITICIANS_DB);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(FEED_ITEMS);
  const [parties, setParties] = useState<Party[]>([]); // Novo estado para partidos oficiais
  const [selectedProfile, setSelectedProfile] = useState<Politician | null>(null);
  const [comparisonProfile, setComparisonProfile] = useState<Politician | null>(null);
  const [matchResults, setMatchResults] = useState<Politician[] | null>(null);
  const [educationId, setEducationId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [followingIds, setFollowingIds] = useState<number[]>([]);

  useEffect(() => {
    const loadData = async () => {
        try {
            // Carrega Partidos Oficiais junto com Políticos
            const [deps, sens, feed, parts] = await Promise.all([
                fetchDeputados(),
                fetchSenadores(),
                fetchGlobalVotacoes(),
                fetchPartidos()
            ]);
            const allPol = [...deps, ...sens];
            setPoliticians(allPol);
            setFeedItems(feed);
            setParties(parts);
        } catch (error) {
            console.error("Failed to load initial data", error);
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
      if (educationId !== null) {
          return <EducationView educationId={educationId} onBack={() => setEducationId(null)} />;
      }

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
                    onSelectCandidate={handleProfileSelect} 
                    onEducationClick={setEducationId}
                    onSeeMore={() => setActiveTab('feed_all')}
                    followingIds={followingIds}
                />
              );
          case 'articles':
              return (
                  <ArticlesListView 
                    onSelectArticle={setEducationId}
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
                    parties={parties} // Passa dados oficiais de partidos
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
                />
              );
          default:
              return (
                <FeedView 
                    politicians={politicians} 
                    feedItems={feedItems} 
                    onSelectCandidate={handleProfileSelect} 
                    onEducationClick={setEducationId} 
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

        {showDataModal && <DataTransparencyModal onClose={() => setShowDataModal(false)} />}
    </div>
  );
}

export default App;