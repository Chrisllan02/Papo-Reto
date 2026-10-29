
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { Politician, FeedItem, Party, EducationalArticle } from '../types';
import { useInitialData } from '../hooks/useCamaraData';
import { normalizeLocationUF, reverseGeocodeToUF } from '../utils/location';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../services/storage';

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

const LOCATION_AUTO_PROMPT_KEY = 'paporeto_location_auto_prompted_at';
const LOCATION_AUTO_PROMPT_TTL = 1000 * 60 * 60 * 24 * 7;

// --- Provider ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use Custom Hook for Data Loading
    const { politicians, feedItems, parties, articles, isLoading, error, setPoliticians, loadEducationalContent } = useInitialData();

  const [activeTab, setActiveTab] = useState('feed');
  
  // Initialize from LocalStorage
  const [darkMode, setDarkMode] = useState(() => {
      const saved = safeGetItem('paporeto_dark_mode');
      if (saved !== null) return saved === 'true';
      try {
          if (typeof window !== 'undefined' && window.matchMedia) {
              return window.matchMedia('(prefers-color-scheme: dark)').matches;
          }
      } catch { /* matchMedia indisponível */ }
      return false;
  });
  const [isThemeLocked, setIsThemeLocked] = useState(() => safeGetItem('paporeto_dark_mode') !== null);
  const darkModeRef = useRef(darkMode);
  useEffect(() => { darkModeRef.current = darkMode; }, [darkMode]);
  const [highContrast, setHighContrast] = useState(() => safeGetItem('paporeto_high_contrast') === 'true');
  const clampFontSize = (value: number) => Math.min(1.5, Math.max(0.9, value));
  const [fontSizeLevel, setFontSizeLevel] = useState(() => {
      const hasUserSetting = safeGetItem('paporeto_font_size_set') === 'true';
      if (!hasUserSetting) {
          safeRemoveItem('paporeto_font_size');
          return 1;
      }
      const saved = parseFloat(safeGetItem('paporeto_font_size') || '');
      return Number.isFinite(saved) ? clampFontSize(saved) : 1;
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

  const updateUserLocation = useCallback((uf: string) => {
      const normalized = normalizeLocationUF(uf);
      setUserLocation(normalized);
      if (normalized) {
          safeSetItem('paporeto_user_location', normalized);
      } else {
          safeRemoveItem('paporeto_user_location');
      }
  }, []);

  // Geo Logic Refactored for Reusability
  const detectLocation = useCallback(async (silent = false) => {
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
          { timeout: 10000, enableHighAccuracy: false, maximumAge: 1000 * 60 * 10 }
      );
      });
  }, [updateUserLocation]);

  // Initial Load Location Check
  useEffect(() => {
      const savedLoc = safeGetItem('paporeto_user_location');
      const normalizedSavedLoc = normalizeLocationUF(savedLoc);
      if (normalizedSavedLoc) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- localização salva lida após montar, junto com a geolocalização
          setUserLocation(normalizedSavedLoc);
          if (normalizedSavedLoc !== savedLoc) {
              safeSetItem('paporeto_user_location', normalizedSavedLoc);
          }
          return;
      }
      if (savedLoc) safeRemoveItem('paporeto_user_location');

      if (!navigator.geolocation) return;

      const lastPrompt = Number(safeGetItem(LOCATION_AUTO_PROMPT_KEY) || 0);
      const canPromptAgain = Date.now() - lastPrompt > LOCATION_AUTO_PROMPT_TTL;

      const detectIfAllowed = async () => {
          try {
              const permissions = await navigator.permissions?.query?.({ name: 'geolocation' as PermissionName });
              if (permissions?.state === 'denied') return;
              if (permissions?.state === 'prompt' && !canPromptAgain) return;
              safeSetItem(LOCATION_AUTO_PROMPT_KEY, String(Date.now()));
              await detectLocation(true);
          } catch {
              if (!canPromptAgain) return;
              safeSetItem(LOCATION_AUTO_PROMPT_KEY, String(Date.now()));
              await detectLocation(true);
          }
      };

      void detectIfAllowed();
  }, [detectLocation]);

  // --- ACESSIBILIDADE: Efeitos Colaterais ---
  
  // 1. Aplicar Zoom
  useEffect(() => {
      const percentage = Math.round(fontSizeLevel * 100);
      document.documentElement.style.fontSize = `${percentage}%`;
      safeSetItem('paporeto_font_size', fontSizeLevel.toString());
  }, [fontSizeLevel]);

  // 2. Aplicar Classes de Tema no HTML (Root)
  useEffect(() => {
      if (darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Sincroniza com o tema do sistema quando o usuário não travou preferência
  useEffect(() => {
      if (isThemeLocked) return;
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event: MediaQueryListEvent) => setDarkMode(event.matches);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- assina o tema do sistema e aplica o valor atual
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
      safeSetItem('paporeto_high_contrast', highContrast.toString());
  }, [highContrast, darkMode]);


  // Theme Handling
  const toggleDarkMode = useCallback(() => {
    // Se alto contraste estiver ligado, desliga ele primeiro
    setHighContrast(false);
    setIsThemeLocked(true);
    const next = !darkModeRef.current;
    safeSetItem('paporeto_dark_mode', String(next));
    setDarkMode(next);
  }, []);

  const toggleHighContrast = useCallback(() => {
      setHighContrast(prev => !prev);
  }, []);

  const increaseFontSize = useCallback(() => {
      setFontSizeLevel(prev => {
          let next: number;
          if (prev >= 1.5) next = 1.5;
          else if (prev >= 1.25) next = 1.5;
          else if (prev >= 1.1) next = 1.25;
          else if (prev >= 1) next = 1.1;
          else next = 1;
          safeSetItem('paporeto_font_size_set', 'true');
          return clampFontSize(next);
      });
  }, []);

  const decreaseFontSize = useCallback(() => {
      setFontSizeLevel(prev => {
          let next: number;
          if (prev <= 0.9) next = 0.9;
          else if (prev <= 1) next = 0.9;
          else if (prev <= 1.1) next = 1;
          else if (prev <= 1.25) next = 1.1;
          else next = 1.25;
          safeSetItem('paporeto_font_size_set', 'true');
          return clampFontSize(next);
      });
  }, []);

  // Actions
  const markArticleAsRead = useCallback((id: number) => {
      setReadArticleIds(prev => prev.includes(id) ? prev : [...prev, id]);
      setSelectedEducationId(id);
  }, []);

  const updatePolitician = useCallback((updated: Politician) => {
      setPoliticians(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedCandidate(prev => prev?.id === updated.id ? updated : prev);
  }, [setPoliticians]);

  const resetNavigation = useCallback(() => {
      setSelectedCandidate(null);
      setSelectedEducationId(null);
      setIsFullFeed(false);
      setIsNewsHistory(false);
      setExplorePreselectedState('');
  }, []);

  const handleSetActiveTab = useCallback((tab: string) => {
      setActiveTab(tab);
      resetNavigation();
  }, [resetNavigation]);

  const goToExplore = useCallback((state: string) => {
      setExplorePreselectedState(state);
      setActiveTab('explore');
  }, []);

  useEffect(() => {
      if (activeTab === 'articles') {
          void loadEducationalContent();
      }
  }, [activeTab, loadEducationalContent]);

  const value = useMemo(() => ({
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
  }), [
    activeTab, politicians, feedItems, articles, parties, isLoading, error,
    darkMode, highContrast, fontSizeLevel,
    selectedCandidate, selectedEducationId, isFullFeed, isNewsHistory, explorePreselectedState,
    showDataModal, showOnboarding, readArticleIds,
    userLocation, isLocating,
    handleSetActiveTab, toggleDarkMode, toggleHighContrast, increaseFontSize, decreaseFontSize,
    markArticleAsRead, updatePolitician, updateUserLocation, detectLocation, resetNavigation, goToExplore
  ]);

  return (
    <AppContext.Provider value={value}>
        {children}
    </AppContext.Provider>
  );
};

// Hook Helper
// eslint-disable-next-line react-refresh/only-export-components -- hook do contexto fica junto do provider
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
