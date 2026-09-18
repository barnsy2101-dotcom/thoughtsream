import { create } from 'zustand';
import { LS_APIKEY } from '../utils/constants';
import { loadProjects } from '../utils/storage';

export const useStore = create((set) => ({
  theme: localStorage.getItem('ts_theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('ts_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },

  drawerOpen: false,
  setDrawerOpen: (val) => set({ drawerOpen: val }),

  splitViewOpen: false,
  setSplitViewOpen: (val) => set({ splitViewOpen: val }),

  focusedOutlineId: null,
  setFocusedOutlineId: (val) => set({ focusedOutlineId: val }),

  modalId: null,
  setModalId: (val) => set({ modalId: val }),

  aiTopicSuggestions: [],
  setAiTopicSuggestions: (val) => set({ aiTopicSuggestions: val }),

  hoveredSuggId: null,
  setHoveredSuggId: (val) => set({ hoveredSuggId: val }),

  stagingSuggId: null,
  setStagingSuggId: (val) => set({ stagingSuggId: val }),

  stagingNodeIds: new Set(),
  setStagingNodeIds: (val) => set(typeof val === 'function' ? (state) => ({ stagingNodeIds: val(state.stagingNodeIds) }) : { stagingNodeIds: val }),

  activeLink: null,
  setActiveLink: (val) => set({ activeLink: val }),

  linkFrom: null,
  setLinkFrom: (val) => set({ linkFrom: val }),

  input: '',
  setInput: (val) => set({ input: val }),

  query: '',
  setQuery: (val) => set({ query: val }),

  selIds: new Set(),
  setSelIds: (val) => set(typeof val === 'function' ? (state) => ({ selIds: val(state.selIds) }) : { selIds: val }),

  marquee: null,
  setMarquee: (val) => set({ marquee: val }),

  replayIdx: null,
  setReplayIdx: (val) => set({ replayIdx: val }),

  listening: false,
  setListening: (val) => set({ listening: val }),

  settingsOpen: false,
  setSettingsOpen: (val) => set({ settingsOpen: val }),

  menuOpen: false,
  setMenuOpen: (val) => set({ menuOpen: val }),

  aiBusy: false,
  setAiBusy: (val) => set({ aiBusy: val }),

  aiNote: '',
  setAiNote: (val) => set({ aiNote: val }),

  expandBusy: false,
  setExpandBusy: (val) => set({ expandBusy: val }),

  apiKey: localStorage.getItem(LS_APIKEY) || '',
  setApiKey: (val) => {
    localStorage.setItem(LS_APIKEY, val);
    set({ apiKey: val });
  },

  targetId: null,
  setTargetId: (val) => set({ targetId: val }),

  pureDump: false,
  setPureDump: (val) => set({ pureDump: val }),

  activeTopic: null,
  setActiveTopic: (val) => set({ activeTopic: val }),

  topicMenuOpen: false,
  setTopicMenuOpen: (val) => set({ topicMenuOpen: val }),

  newTopicName: '',
  setNewTopicName: (val) => set({ newTopicName: val }),

  timerMenuOpen: false,
  setTimerMenuOpen: (val) => set({ timerMenuOpen: val }),

  studyTimeInput: '25',
  setStudyTimeInput: (val) => set({ studyTimeInput: val }),

  breakTimeInput: '5',
  setBreakTimeInput: (val) => set({ breakTimeInput: val }),

  timerActive: false,
  setTimerActive: (val) => set({ timerActive: val }),

  timerMode: 'study',
  setTimerMode: (val) => set({ timerMode: val }),

  timerTimeLeft: 0,
  setTimerTimeLeft: (val) => set(typeof val === 'function' ? (state) => ({ timerTimeLeft: val(state.timerTimeLeft) }) : { timerTimeLeft: val }),

  activeSorterTopicId: null,
  setActiveSorterTopicId: (val) => set({ activeSorterTopicId: val }),

  drawerTab: 'projects',
  setDrawerTab: (val) => set({ drawerTab: val }),

  drawerSearch: '',
  setDrawerSearch: (val) => set({ drawerSearch: val }),

  vacuumTopicId: null,
  setVacuumTopicId: (val) => set({ vacuumTopicId: val }),

  vacuumSelectedIds: new Set(),
  setVacuumSelectedIds: (val) => set(typeof val === 'function' ? (state) => ({ vacuumSelectedIds: val(state.vacuumSelectedIds) }) : { vacuumSelectedIds: val }),

  hoveredPullTopicId: null,
  setHoveredPullTopicId: (val) => set({ hoveredPullTopicId: val }),

  flashActive: false,
  setFlashActive: (val) => set({ flashActive: val }),

  customTime: '5',
  setCustomTime: (val) => set({ customTime: val }),

  unexportedArchiveAlert: null,
  setUnexportedArchiveAlert: (val) => set({ unexportedArchiveAlert: val }),


  projects: loadProjects(),
  setProjects: (val) => set({ projects: val }),

  autoAIEnabled: localStorage.getItem('ts_auto_ai') !== 'false',
  setAutoAIEnabled: (val) => {
    localStorage.setItem('ts_auto_ai', val);
    set({ autoAIEnabled: val });
  },

  activeDrawTool: null,
  setActiveDrawTool: (val) => set({ activeDrawTool: val }),

  drawMenuOpen: false,
  setDrawMenuOpen: (val) => set(typeof val === 'function' ? (state) => ({ drawMenuOpen: val(state.drawMenuOpen) }) : { drawMenuOpen: val }),

  drawingPreview: null,
  setDrawingPreview: (val) => set({ drawingPreview: val }),

  isPlacingMarker: false,
  setIsPlacingMarker: (val) => set((state) => ({ isPlacingMarker: typeof val === 'function' ? val(state.isPlacingMarker) : val })),
}));
