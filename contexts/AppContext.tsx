
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Politician, FeedItem, Party, EducationalArticle } from '../types';
import { useInitialData } from '../hooks/useCamaraData';

// --- Types ---
interface AppState {
  activeTab: string;
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: EducationalArticle[];
  parties: Party[];
  isLoading: boolean;
  
  // UI Preferences
  darkMode: boolean;
  highContrast: boolean;
  fontSizeLevel: number;

  // Navigation / Selection State
  selectedCandidate: Politician | null;
  selectedEducationId: number | null;
  isFullFeed: boolean;
  isNewsHistory: boolean;
  explorePreselectedState: string;
  showDataModal: boolean;
  showOnboarding: boolean;
  readArticleIds: number[];
  
  // Location
  userLocation: string; // UF
  isLocating: boolean; // Status do GPS
}

interface AppActions {
  setActiveTab: (tab: string) => void;
  toggleDarkMode: () => void;
  toggleHighContrast: () => void;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  
  selectCandidate: (pol: Politician | null) => void;
  selectEducation: (id: number | null) => void;
  markArticleAsRead: (id: number) => void;
  
  setFullFeed: (isOpen: boolean) => void;
  setNewsHistory: (isOpen: boolean) => void;
  setExplorePreselectedState: (state: string) => void;
  setShowDataModal: (show: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  
  updatePolitician: (updated: Politician) => void;
  updateUserLocation: (uf: string) => void;
  detectLocation: () => Promise<void>; // NOVO: Gatilho manual de GPS
  
  // Navigation Helpers
  resetNavigation: () => void;
  goToExplore: (state: string) => void;
}

const AppContext = createContext<{ state: AppState; actions: AppActions } | null>(null);

// --- Provider ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use Custom Hook for Data Loading
  const { politicians, feedItems, parties, articles, isLoading, setPoliticians } = useInitialData();

  const [activeTab, setActiveTab] = useState('feed');
  
  // Initialize from LocalStorage
  const [darkMode, setDarkMode] = useState(() => {
      try { return localStorage.getItem('paporeto_dark_mode') === 'true'; } catch { return false; }
  });
  const [highContrast, setHighContrast] = useState(() => {
      try { return localStorage.getItem('paporeto_high_contrast') === 'true'; } catch { return false; }
  });
  const [fontSizeLevel, setFontSizeLevel] = useState(() => {
      try { 
          const saved = localStorage.getItem('paporeto_font_size');
          return saved ? parseFloat(saved) : 1; 
      } catch { return 1; }
  });

  const [selectedCandidate, setSelectedCandidate] = useState<Politician | null>(null);
  const [selectedEducationId, setSelectedEducationId] = useState<number | null>(null);
  const [isFullFeed, setIsFullFeed] = useState(false);
  const [isNewsHistory, setIsNewsHistory] = useState(false);
  const [explorePreselectedState, setExplorePreselectedState] = useState<string>('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [readArticleIds, setReadArticleIds] = useState<number[]>([]);
  
  const [userLocation, setUserLocation] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);

  // Geo Logic Refactored for Reusability
  const detectLocation = async () => {
      if (!navigator.geolocation) {
          alert("Geolocalização não suportada neste dispositivo.");
          return;
      }

      setIsLocating(true);
      
      navigator.geolocation.getCurrentPosition(
          async (position) => {
              try {
                  const { latitude, longitude } = position.coords;
                  // Usando API Free de Reverse Geocoding (BigDataCloud é bom fallback)
                  const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
                  const data = await response.json();
                  // Tenta extrair UF do código ISO (ex: BR-SP -> SP) ou principalSubdivisionCode
                  const uf = data.principalSubdivisionCode ? data.principalSubdivisionCode.split('-')[1] : null;
                  
                  if (uf && uf.length === 2) {
                      updateUserLocation(uf);
                  } else {
                      console.warn("Não foi possível determinar o estado exato.");
                  }
              } catch (e) {
                  console.warn("Erro na API de geolocalização:", e);
              } finally {
                  setIsLocating(false);
              }
          },
          (err) => {
              console.warn("Permissão de geolocalização negada ou erro:", err);
              setIsLocating(false);
          },
          { timeout: 10000, enableHighAccuracy: false } // Timeout de 10s
      );
  };

  // Initial Load Location Check
  useEffect(() => {
      const savedLoc = localStorage.getItem('paporeto_user_location');
      if (savedLoc) {
          setUserLocation(savedLoc);
      } else {
          detectLocation();
      }
  }, []);

  // --- ACESSIBILIDADE: Efeitos Colaterais ---
  
  // 1. Aplicar Zoom
  useEffect(() => {
      const percentage = Math.round(fontSizeLevel * 100);
      document.documentElement.style.fontSize = `${percentage}%`;
      localStorage.setItem('paporeto_font_size', fontSizeLevel.toString());
  }, [fontSizeLevel]);

  // 2. Aplicar Classes de Tema no HTML (Root)
  useEffect(() => {
      if (darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('paporeto_dark_mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
      if (highContrast) {
          document.documentElement.classList.add('high-contrast');
          // Força remoção do dark mode visualmente se alto contraste estiver ativo, 
          // mas mantemos o estado do dark mode para quando desligar o alto contraste.
          document.documentElement.classList.remove('dark'); 
      } else {
          document.documentElement.classList.remove('high-contrast');
          // Restaura dark mode se estava ativo
          if (darkMode) document.documentElement.classList.add('dark');
      }
      localStorage.setItem('paporeto_high_contrast', highContrast.toString());
  }, [highContrast, darkMode]);


  // Theme Handling
  const toggleDarkMode = () => {
    // Se alto contraste estiver ligado, desliga ele primeiro
    if (highContrast) setHighContrast(false);
    setDarkMode(prev => !prev);
  };

  const toggleHighContrast = () => {
      setHighContrast(prev => !prev);
  };

  const increaseFontSize = () => {
      setFontSizeLevel(prev => {
          if (prev >= 1.5) return 1.5;
          if (prev >= 1.25) return 1.5;
          if (prev >= 1.1) return 1.25;
          return 1.1;
      });
  };

  const decreaseFontSize = () => {
      setFontSizeLevel(prev => {
          if (prev <= 1) return 1;
          if (prev <= 1.1) return 1;
          if (prev <= 1.25) return 1.1;
          return 1.25;
      });
  };

  // Actions
  const markArticleAsRead = (id: number) => {
      if (!readArticleIds.includes(id)) {
          setReadArticleIds(prev => [...prev, id]);
      }
      setSelectedEducationId(id);
  };

  const updatePolitician = (updated: Politician) => {
      setPoliticians(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedCandidate?.id === updated.id) {
          setSelectedCandidate(updated);
      }
  };

  const updateUserLocation = (uf: string) => {
      setUserLocation(uf);
      localStorage.setItem('paporeto_user_location', uf);
  };

  const resetNavigation = () => {
      setSelectedCandidate(null);
      setSelectedEducationId(null);
      setIsFullFeed(false);
      setIsNewsHistory(false);
      setExplorePreselectedState('');
  };

  const handleSetActiveTab = (tab: string) => {
      setActiveTab(tab);
      resetNavigation();
  };

  const goToExplore = (state: string) => {
      setExplorePreselectedState(state);
      setActiveTab('explore');
  };

  const value = {
    state: {
        activeTab, politicians, feedItems, articles, parties, isLoading,
        darkMode, highContrast, fontSizeLevel,
        selectedCandidate, selectedEducationId, isFullFeed, isNewsHistory, explorePreselectedState,
        showDataModal, showOnboarding, readArticleIds, 
        userLocation, isLocating
    },
    actions: {
        setActiveTab: handleSetActiveTab,
        toggleDarkMode,
        toggleHighContrast,
        increaseFontSize,
        decreaseFontSize,
        cycleFontSize: increaseFontSize, // Fallback/Alias
        selectCandidate: setSelectedCandidate,
        selectEducation: setSelectedEducationId,
        markArticleAsRead,
        setFullFeed: setIsFullFeed,
        setNewsHistory: setIsNewsHistory,
        setExplorePreselectedState,
        setShowDataModal,
        setShowOnboarding,
        updatePolitician,
        updateUserLocation,
        detectLocation,
        resetNavigation,
        goToExplore
    }
  };

  return (
    <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
  );
};

// Hook Helper
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};