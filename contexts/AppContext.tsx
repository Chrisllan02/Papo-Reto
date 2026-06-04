
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Politician, FeedItem, Party, EducationalArticle } from '../types';
import { useInitialData } from '../hooks/useCamaraData';
import { normalizeLocationUF, reverseGeocodeToUF } from '../utils/location';

// --- Types ---
interface AppState {
  activeTab: string;
  politicians: Politician[];
  feedItems: FeedItem[];
  articles: EducationalArticle[];
  parties: Party[];
  isLoading: boolean;
    error: string | null;
  
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
    const { politicians, feedItems, parties, articles, isLoading, error, setPoliticians, loadEducationalContent } = useInitialData();

  const [activeTab, setActiveTab] = useState('feed');
  
  // Initialize from LocalStorage
  const [darkMode, setDarkMode] = useState(() => {
      try {
          const saved = localStorage.getItem('paporeto_dark_mode');
          if (saved !== null) return saved === 'true';
          if (typeof window !== 'undefined' && window.matchMedia) {
              return window.matchMedia('(prefers-color-scheme: dark)').matches;
          }
          return false;
      } catch { return false; }
  });
  const [isThemeLocked, setIsThemeLocked] = useState(() => {
      try { return localStorage.getItem('paporeto_dark_mode') !== null; } catch { return false; }
  });
  const [highContrast, setHighContrast] = useState(() => {
      try { return localStorage.getItem('paporeto_high_contrast') === 'true'; } catch { return false; }
  });
  const clampFontSize = (value: number) => Math.min(1.5, Math.max(0.9, value));
  const [fontSizeLevel, setFontSizeLevel] = useState(() => {
      try { 
          const hasUserSetting = localStorage.getItem('paporeto_font_size_set') === 'true';
          if (!hasUserSetting) {
              localStorage.removeItem('paporeto_font_size');
          }
          if (!hasUserSetting) return 1;
          const saved = localStorage.getItem('paporeto_font_size');
          return saved ? clampFontSize(parseFloat(saved)) : 1; 
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
  const LOCATION_AUTO_PROMPT_KEY = 'paporeto_location_auto_prompted_at';
  const LOCATION_AUTO_PROMPT_TTL = 1000 * 60 * 60 * 24 * 7;

  // Geo Logic Refactored for Reusability
  const detectLocation = async (silent = false) => {
      if (!navigator.geolocation) {
          if (!silent) alert("Geolocalização não suportada neste dispositivo.");
          return;
      }

      setIsLocating(true);
      
      return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
          async (position) => {
              try {
                  const { latitude, longitude } = position.coords;
                  const uf = await reverseGeocodeToUF(latitude, longitude);
                  
                  if (uf) {
                      updateUserLocation(uf);
                  } else {
                      console.warn("Não foi possível determinar o estado exato.");
                  }
              } catch (e) {
                  console.warn("Erro na API de geolocalização:", e);
              } finally {
                  setIsLocating(false);
                  resolve();
              }
          },
          (err) => {
              console.warn("Permissão de geolocalização negada ou erro:", err);
              setIsLocating(false);
              resolve();
          },
          { timeout: 15000, enableHighAccuracy: true, maximumAge: 1000 * 60 * 10 }
      );
      });
  };

  // Initial Load Location Check
  useEffect(() => {
      const savedLoc = localStorage.getItem('paporeto_user_location');
      const normalizedSavedLoc = normalizeLocationUF(savedLoc);
      if (normalizedSavedLoc) {
          setUserLocation(normalizedSavedLoc);
          if (normalizedSavedLoc !== savedLoc) {
              localStorage.setItem('paporeto_user_location', normalizedSavedLoc);
          }
          return;
      }
      if (savedLoc) localStorage.removeItem('paporeto_user_location');

      if (!navigator.geolocation) return;

      const lastPrompt = Number(localStorage.getItem(LOCATION_AUTO_PROMPT_KEY) || 0);
      const canPromptAgain = Date.now() - lastPrompt > LOCATION_AUTO_PROMPT_TTL;

      const detectIfAllowed = async () => {
          try {
              const permissions = await navigator.permissions?.query?.({ name: 'geolocation' as PermissionName });
              if (permissions?.state === 'denied') return;
              if (permissions?.state === 'prompt' && !canPromptAgain) return;
              localStorage.setItem(LOCATION_AUTO_PROMPT_KEY, String(Date.now()));
              await detectLocation(true);
          } catch {
              if (!canPromptAgain) return;
              localStorage.setItem(LOCATION_AUTO_PROMPT_KEY, String(Date.now()));
              await detectLocation(true);
          }
      };

      void detectIfAllowed();
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

  // Sincroniza com o tema do sistema quando o usuário não travou preferência
  useEffect(() => {
      if (isThemeLocked) return;
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event: MediaQueryListEvent) => setDarkMode(event.matches);
      setDarkMode(media.matches);
      if (media.addEventListener) {
          media.addEventListener('change', handleChange);
      } else {
          media.addListener(handleChange);
      }
      return () => {
          if (media.removeEventListener) {
              media.removeEventListener('change', handleChange);
          } else {
              media.removeListener(handleChange);
          }
      };
  }, [isThemeLocked]);

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
        setIsThemeLocked(true);
    setDarkMode(prev => !prev);
  };

  const toggleHighContrast = () => {
      setHighContrast(prev => !prev);
  };

  const increaseFontSize = () => {
      setFontSizeLevel(prev => {
          let next = prev;
          if (prev >= 1.5) next = 1.5;
          else if (prev >= 1.25) next = 1.5;
          else if (prev >= 1.1) next = 1.25;
          else if (prev >= 1) next = 1.1;
          else next = 1;
          try { localStorage.setItem('paporeto_font_size_set', 'true'); } catch {}
          return clampFontSize(next);
      });
  };

  const decreaseFontSize = () => {
      setFontSizeLevel(prev => {
          let next = prev;
          if (prev <= 0.9) next = 0.9;
          else if (prev <= 1) next = 0.9;
          else if (prev <= 1.1) next = 1;
          else if (prev <= 1.25) next = 1.1;
          else next = 1.25;
          try { localStorage.setItem('paporeto_font_size_set', 'true'); } catch {}
          return clampFontSize(next);
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
      const normalized = normalizeLocationUF(uf);
      setUserLocation(normalized);
      if (normalized) {
          localStorage.setItem('paporeto_user_location', normalized);
      } else {
          localStorage.removeItem('paporeto_user_location');
      }
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

  useEffect(() => {
      if (activeTab === 'articles') {
          void loadEducationalContent();
      }
  }, [activeTab, loadEducationalContent]);

  const value = {
    state: {
        activeTab, politicians, feedItems, articles, parties, isLoading, error,
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
