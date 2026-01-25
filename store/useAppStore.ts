
import { create } from 'zustand';
import { Politician, FeedItem, Party } from '../types';
import { POLITICIANS_DB, FEED_ITEMS, EDUCATION_CAROUSEL } from '../constants';

interface AppState {
  // --- Data Slice ---
  politicians: Politician[];
  feedItems: FeedItem[];
  parties: Party[];
  articles: any[];
  
  setPoliticians: (data: Politician[]) => void;
  setFeedItems: (data: FeedItem[]) => void;
  setParties: (data: Party[]) => void;
  setArticles: (data: any[]) => void;
  updatePolitician: (pol: Politician) => void;

  // --- UI/Navigation Slice ---
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  selectedCandidate: Politician | null;
  setSelectedCandidate: (pol: Politician | null) => void;
  
  selectedEducationId: number | null;
  setSelectedEducationId: (id: number | null) => void;
  
  exploreFilterState: string; // Para filtro vindo do Feed (Giro pelos Estados)
  setExploreFilterState: (uf: string) => void;

  isNewsHistoryOpen: boolean;
  setIsNewsHistoryOpen: (isOpen: boolean) => void;

  showDataModal: boolean;
  setShowDataModal: (show: boolean) => void;
  
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;

  // --- Preferences Slice ---
  darkMode: boolean;
  highContrast: boolean;
  fontSizeLevel: number;
  
  toggleDarkMode: () => void;
  toggleHighContrast: () => void;
  cycleFontSize: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Data
  politicians: POLITICIANS_DB,
  feedItems: FEED_ITEMS,
  parties: [],
  articles: EDUCATION_CAROUSEL,

  setPoliticians: (data) => set({ politicians: data }),
  setFeedItems: (data) => set({ feedItems: data }),
  setParties: (data) => set({ parties: data }),
  setArticles: (data) => set({ articles: data }),
  updatePolitician: (pol) => set((state) => ({
    politicians: state.politicians.map((p) => (p.id === pol.id ? pol : p)),
    selectedCandidate: state.selectedCandidate?.id === pol.id ? pol : state.selectedCandidate
  })),

  // UI
  activeTab: 'feed',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  selectedCandidate: null,
  setSelectedCandidate: (pol) => set({ selectedCandidate: pol }),
  
  selectedEducationId: null,
  setSelectedEducationId: (id) => set({ selectedEducationId: id }),
  
  exploreFilterState: '',
  setExploreFilterState: (uf) => set({ exploreFilterState: uf, activeTab: 'explore' }),

  isNewsHistoryOpen: false,
  setIsNewsHistoryOpen: (isOpen) => set({ isNewsHistoryOpen: isOpen }),

  showDataModal: false,
  setShowDataModal: (show) => set({ showDataModal: show }),

  showOnboarding: false,
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  // Preferences (Includes DOM manipulation side-effects)
  darkMode: false,
  highContrast: false,
  fontSizeLevel: 1,

  toggleDarkMode: () => set((state) => {
    const newMode = !state.darkMode;
    if (state.highContrast) {
        document.documentElement.classList.remove('high-contrast');
    }
    if (newMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    return { darkMode: newMode, highContrast: false };
  }),

  toggleHighContrast: () => set((state) => {
    const newVal = !state.highContrast;
    if (newVal) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('high-contrast');
        return { highContrast: true, darkMode: false };
    } else {
        document.documentElement.classList.remove('high-contrast');
        return { highContrast: false };
    }
  }),

  cycleFontSize: () => set((state) => {
    let nextLevel = 1;
    if (state.fontSizeLevel === 1) nextLevel = 1.1;
    else if (state.fontSizeLevel === 1.1) nextLevel = 1.25;
    return { fontSizeLevel: nextLevel };
  })
}));
