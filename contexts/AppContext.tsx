
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Politician, FeedItem, Party } from '../types';
import { useInitialData } from '../hooks/useCamaraData';

// --- Types ---
interface AppState {
  activeTab: string;
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: any[];
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
}

interface AppActions {
  setActiveTab: (tab: string) => void;
  toggleDarkMode: () => void;
  toggleHighContrast: () => void;
  cycleFontSize: () => void;
  
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
  const [darkMode, setDarkMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1);

  const [selectedCandidate, setSelectedCandidate] = useState<Politician | null>(null);
  const [selectedEducationId, setSelectedEducationId] = useState<number | null>(null);
  const [isFullFeed, setIsFullFeed] = useState(false);
  const [isNewsHistory, setIsNewsHistory] = useState(false);
  const [explorePreselectedState, setExplorePreselectedState] = useState<string>('');
  const [showDataModal, setShowDataModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [readArticleIds, setReadArticleIds] = useState<number[]>([]);
  const [userLocation, setUserLocation] = useState<string>('');

  // Initial Location Logic
  useEffect(() => {
      const savedLoc = localStorage.getItem('paporeto_user_location');
      if (savedLoc) {
          setUserLocation(savedLoc);
      } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              async (position) => {
                  try {
                      const { latitude, longitude } = position.coords;
                      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
                      const data = await response.json();
                      const uf = data.principalSubdivisionCode ? data.principalSubdivisionCode.split('-')[1] : null;
                      if (uf) {
                          setUserLocation(uf);
                          localStorage.setItem('paporeto_user_location', uf);
                      }
                  } catch (e) {
                      console.warn("Auto-geolocation failed", e);
                  }
              },
              (err) => console.warn("Geolocation permission denied", err)
          );
      }
  }, []);

  // Theme Handling
  const toggleDarkMode = () => {
    if (highContrast) setHighContrast(false);
    setDarkMode(prev => {
        const newVal = !prev;
        document.documentElement.classList.toggle('dark', newVal);
        document.documentElement.classList.remove('high-contrast');
        return newVal;
    });
  };

  const toggleHighContrast = () => {
      setHighContrast(prev => {
          const newVal = !prev;
          if (newVal) {
              setDarkMode(false);
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('high-contrast');
          } else {
              document.documentElement.classList.remove('high-contrast');
          }
          return newVal;
      });
  };

  const cycleFontSize = () => {
      setFontSizeLevel(prev => {
          if (prev === 1) return 1.1;
          if (prev === 1.1) return 1.25;
          return 1;
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
      // Update selectedCandidate if it matches, to reflect changes in UI immediately
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
        showDataModal, showOnboarding, readArticleIds, userLocation
    },
    actions: {
        setActiveTab: handleSetActiveTab,
        toggleDarkMode,
        toggleHighContrast,
        cycleFontSize,
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
