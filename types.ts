
export interface Speaker {
  id: string;
  name: string;
  gender: 'male' | 'female';
  ageEstimate?: string; // e.g., "Young Adult", "Senior"
  voiceQuality?: string; // e.g., "Deep", "Soft", "Raspy"
  voiceName: string; // Map to Gemini Voice names (e.g., 'Kore', 'Fenrir')
}

export interface DubSegment {
  id: string;
  startTime: number; // Seconds
  endTime: number; // Seconds
  speakerId: string;
  originalText: string;
  improvedText: string; // The refined/dubbing-ready text (Phase 3)
  emotion?: string; // e.g., 'excited', 'sad' (Phase 4)
  audioBuffer?: AudioBuffer | null; // The generated TTS audio
  isGenerating?: boolean;
  speedFactor?: number; // Phase 5: v2/v1 ratio for time alignment
}

export type ProcessingStage = 
  | 'idle' 
  | 'selecting_languages' // Changed from singular
  | 'extracting_audio' // Phase 1
  | 'separating_stems' // Phase 2
  | 'analyzing_script' // Phase 3
  | 'configuring_voices' // Phase 4 (Setup)
  | 'generating_voices' // Phase 4 (Execution)
  | 'time_alignment' // Phase 5: Time Stretching & Sync
  | 'assembling_audio' // Phase 6: Combine into one track (previously 5)
  | 'mixing' // Phase 7 (previously 6)
  | 'complete';

// State specific to a single language track
export interface LanguageData {
  code: string;
  name: string;
  stage: ProcessingStage;
  progress: number;
  segments: DubSegment[];
  speakers: Speaker[];
  masterDubBuffer: AudioBuffer | null;
  isAnalyzed: boolean; // Flag to check if initial analysis is done
  isProcessing: boolean; // New: Locks UI during async operations
}

export interface ProjectState {
  videoFile: File | null;
  videoUrl: string | null;
  
  // Multi-language support
  selectedLanguages: string[]; // List of codes/names selected
  activeLanguage: string; // The language currently being viewed/edited
  languageData: Record<string, LanguageData>; // Map of language name -> Data
  
  // UI Settings
  uiLanguage: 'en' | 'fr' | 'ar';

  // Global settings (shared across languages or current view)
  backgroundVolume: number; // 0 to 1
  dubVolume: number; // 0 to 1
  reverbAmount: number; // 0 to 1
  vocalSuppression: boolean; // NEW: Toggle for vocal removal DSP
  
  // Playback State
  isPlaying: boolean;
  currentTime: number;
}

export enum VoiceOption {
  Kore = 'Kore',     // Female, Clear, Narrator
  Puck = 'Puck',     // Male, Soft, Neutral
  Fenrir = 'Fenrir', // Male, Deep, Intense
  Zephyr = 'Zephyr', // Female, Soft, Gentle
  Charon = 'Charon'  // Male, Deep, Authoritative
}