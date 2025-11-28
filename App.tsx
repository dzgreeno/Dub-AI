import React, { useState, useRef, useEffect } from 'react';
import { ProjectState, DubSegment, Speaker, ProcessingStage, VoiceOption, LanguageData } from './types';
import { analyzeVideoScript, generateSpeechForSegment } from './services/geminiService';
import { AudioEngine } from './services/audioEngine';
import { UploadIcon, PlayIcon, PauseIcon, MagicIcon, DownloadIcon, CheckIcon } from './components/Icons';
import Timeline from './components/Timeline';

// --- Translations ---
const translations = {
  en: {
    appTitle: "DubAI",
    subtitle: "AI Video Dubbing Agent v1.1",
    uploadTitle: "Upload Video to Start",
    uploadDesc: "Supports MP4, WebM, MOV formats",
    uploadClick: "Click or Drag & Drop",
    selectLangTitle: "Select Target Languages",
    selectLangDesc: "Choose one or more languages. A separate dubbing track will be created for each.",
    startProject: "Start Project",
    languages: {
      ar: "Arabic (العربية)",
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      hi: "Hindi",
      ru: "Russian"
    },
    stages: {
      upload: "Upload",
      separation: "Separation",
      analysis: "Analysis",
      casting: "Casting",
      generation: "Generation",
      sync: "Sync",
      assembly: "Assembly",
      mixing: "Mixing"
    },
    actions: {
      analyze: "Start Analysis for",
      generating: "Generating...",
      generateAll: "Generate All Segments",
      exportAudio: "Export Audio Only",
      exportVideo: "Export Final Video",
      confirmVoices: "Confirm & Generate",
      processing: "Processing..."
    },
    status: {
      waiting: "Waiting for data...",
      cleaning: "Cleaning script text...",
      profiling: "Profiling speaker voices...",
      emotions: "Analyzing emotions...",
      exporting: "Rendering Final Mix..."
    },
    labels: {
      script: "Script",
      music: "Music",
      dub: "Dub",
      atmosphere: "Atmosphere",
      original: "Original",
      improved: "Improved Script",
      voice: "Voice",
      gender: "Gender",
      age: "Age",
      removeVocals: "Vocal Remover (Beta)",
      apiKey: "Gemini API Key",
      settings: "Settings",
      apiKeyPlaceholder: "Paste your key here (starts with AIza...)",
      apiKeyHelp: "Leave empty to use the free trial limit. Add your own key for higher limits.",
      getKey: "Get API Key"
    }
  },
  fr: {
    appTitle: "DubAI",
    subtitle: "Agent de Doublage Vidéo IA v1.1",
    uploadTitle: "Télécharger une vidéo pour commencer",
    uploadDesc: "Supporte les formats MP4, WebM, MOV",
    uploadClick: "Cliquez ou Glissez-Déposez",
    selectLangTitle: "Sélectionner les langues cibles",
    selectLangDesc: "Choisissez une ou plusieurs langues. Une piste de doublage séparée sera créée pour chacune.",
    startProject: "Démarrer le projet",
    languages: {
      ar: "Arabe (العربية)",
      en: "Anglais",
      es: "Espagnol",
      fr: "Français",
      de: "Allemand",
      it: "Italien",
      ja: "Japonais",
      hi: "Hindi",
      ru: "Russe"
    },
    stages: {
      upload: "Téléchargement",
      separation: "Séparation",
      analysis: "Analyse",
      casting: "Casting",
      generation: "Génération",
      sync: "Synchro",
      assembly: "Assemblage",
      mixing: "Mixage"
    },
    actions: {
      analyze: "Démarrer l'analyse pour",
      generating: "Génération...",
      generateAll: "Générer tous les segments",
      exportAudio: "Exporter l'audio seulement",
      exportVideo: "Exporter la vidéo finale",
      confirmVoices: "Confirmer & Générer",
      processing: "Traitement en cours..."
    },
    status: {
      waiting: "En attente de données...",
      cleaning: "Nettoyage du texte...",
      profiling: "Profilage des voix...",
      emotions: "Analyse des émotions...",
      exporting: "Rendu du mix final..."
    },
    labels: {
      script: "Scénario",
      music: "Musique",
      dub: "Doublage",
      atmosphere: "Atmosphère",
      original: "Original",
      improved: "Script Amélioré",
      voice: "Voix",
      gender: "Genre",
      age: "Âge",
      removeVocals: "Suppression Vocale (Bêta)",
      apiKey: "Clé API Gemini",
      settings: "Paramètres",
      apiKeyPlaceholder: "Collez votre clé ici (commence par AIza...)",
      apiKeyHelp: "Laisser vide pour la limite d'essai gratuit. Ajoutez votre clé pour plus de limites.",
      getKey: "Obtenir une clé API"
    }
  },
  ar: {
    appTitle: "DubAI",
    subtitle: "وكيل دبلجة الفيديو بالذكاء الاصطناعي v1.1",
    uploadTitle: "ارفع الفيديو لبدء المشروع",
    uploadDesc: "يدعم صيغ MP4, WebM, MOV",
    uploadClick: "انقر أو اسحب الملف هنا",
    selectLangTitle: "اختر لغات الدبلجة",
    selectLangDesc: "اختر لغة واحدة أو أكثر. سيتم إنشاء مسار دبلجة مستقل لكل لغة.",
    startProject: "بدء المشروع",
    languages: {
      ar: "العربية",
      en: "الإنجليزية",
      es: "الإسبانية",
      fr: "الفرنسية",
      de: "الألمانية",
      it: "الإيطالية",
      ja: "اليابانية",
      hi: "الهندية",
      ru: "الروسية"
    },
    stages: {
      upload: "رفع",
      separation: "فصل الصوت",
      analysis: "تحليل",
      casting: "توزيع الأدوار",
      generation: "توليد",
      sync: "تزامن",
      assembly: "تجميع",
      mixing: "ميكساج"
    },
    actions: {
      analyze: "بدء التحليل لـ",
      generating: "جاري التوليد...",
      generateAll: "توليد جميع المقاطع",
      exportAudio: "ملف صوت فقط",
      exportVideo: "فيديو نهائي",
      confirmVoices: "تأكيد وبدء التوليد",
      processing: "جاري المعالجة...",
    },
    status: {
      waiting: "بانتظار البيانات...",
      cleaning: "تنظيف النص من الشوائب...",
      profiling: "تحديد بصمة الصوت...",
      emotions: "تحليل المشاعر...",
      exporting: "جاري معالجة الفيديو النهائي..."
    },
    labels: {
      script: "السيناريو",
      music: "موسيقى",
      dub: "دبلجة",
      atmosphere: "أجواء",
      original: "الأصل",
      improved: "النص المعدل",
      voice: "الصوت",
      gender: "الجنس",
      age: "العمر",
      removeVocals: "عزل الصوت الأصلي (تجريبي)",
      apiKey: "مفتاح Gemini API",
      settings: "الإعدادات",
      apiKeyPlaceholder: "الصق المفتاح هنا (يبدأ بـ AIza...)",
      apiKeyHelp: "اتركه فارغاً لاستخدام الحد التجريبي المجاني. أضف مفتاحك الخاص لرفع الحدود.",
      getKey: "احصل على مفتاح Gemini"
    }
  }
};

const SUPPORTED_LANGUAGES_LIST = [
  { code: 'en', key: 'en' },
  { code: 'fr', key: 'fr' },
  { code: 'ar', key: 'ar' },
  { code: 'es', key: 'es' },
  { code: 'de', key: 'de' },
  { code: 'it', key: 'it' },
  { code: 'ja', key: 'ja' },
  { code: 'ru', key: 'ru' },
];

const App: React.FC = () => {
  const [project, setProject] = useState<ProjectState>({
    videoFile: null,
    videoUrl: null,
    selectedLanguages: [],
    activeLanguage: '',
    languageData: {},
    uiLanguage: 'en', // Default English
    backgroundVolume: 0.3,
    dubVolume: 1.0,
    reverbAmount: 0.0,
    vocalSuppression: false,
    isPlaying: false,
    currentTime: 0,
  });

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [isExporting, setIsExporting] = useState(false); // Local state for export overlay

  const t = translations[project.uiLanguage];
  const [loadingText, setLoadingText] = useState(t.actions.processing);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    audioEngineRef.current = new AudioEngine();
    // Load API Key
    const savedKey = localStorage.getItem('dubai_api_key');
    if (savedKey) setCustomApiKey(savedKey);

    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Update text direction based on UI language
  useEffect(() => {
    document.documentElement.dir = project.uiLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = project.uiLanguage;
  }, [project.uiLanguage]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setCustomApiKey(newVal);
    localStorage.setItem('dubai_api_key', newVal);
  };

  // Helpers to get/set active language data
  const getActiveData = (): LanguageData | undefined => {
    return project.languageData[project.activeLanguage];
  };

  const updateActiveData = (updates: Partial<LanguageData>) => {
    setProject(prev => ({
      ...prev,
      languageData: {
        ...prev.languageData,
        [prev.activeLanguage]: {
          ...prev.languageData[prev.activeLanguage],
          ...updates
        }
      }
    }));
  };

  // Sync mixing settings
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setMixSettings(
        project.backgroundVolume,
        project.dubVolume,
        project.reverbAmount
      );
    }
  }, [project.backgroundVolume, project.dubVolume, project.reverbAmount]);

  // Sync vocal suppression
  useEffect(() => {
    if (audioEngineRef.current) {
        audioEngineRef.current.toggleVocalSuppression(project.vocalSuppression);
    }
  }, [project.vocalSuppression]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setProject(prev => ({ 
        ...prev, 
        videoFile: file, 
        videoUrl: url, 
        languageData: {},
        selectedLanguages: [],
        activeLanguage: '',
      }));
    }
  };

  const toggleLanguageSelection = (langName: string) => {
    setProject(prev => {
      const exists = prev.selectedLanguages.includes(langName);
      const updated = exists 
        ? prev.selectedLanguages.filter(l => l !== langName)
        : [...prev.selectedLanguages, langName];
      return { ...prev, selectedLanguages: updated };
    });
  };

  const initLanguages = () => {
    if (project.selectedLanguages.length === 0) return;

    const initialData: Record<string, LanguageData> = {};
    project.selectedLanguages.forEach(lang => {
      initialData[lang] = {
        code: lang,
        name: lang, // Using code as key, name logic handled in UI
        stage: 'extracting_audio',
        progress: 0,
        segments: [],
        speakers: [],
        masterDubBuffer: null,
        isAnalyzed: false,
        isProcessing: false
      };
    });

    setProject(prev => ({
      ...prev,
      languageData: initialData,
      activeLanguage: project.selectedLanguages[0]
    }));

    setTimeout(() => {
        setProject(prev => {
            const newData = { ...prev.languageData };
            Object.keys(newData).forEach(key => {
                newData[key] = { ...newData[key], stage: 'analyzing_script', progress: 0 };
            });
            return { ...prev, languageData: newData };
        });
    }, 1500);
  };

  const switchLanguage = (langName: string) => {
    if (project.isPlaying) togglePlay();
    audioEngineRef.current?.stopSegments();
    setProject(prev => ({ ...prev, activeLanguage: langName }));
  };

  const startAnalysisForActive = async () => {
    const activeData = getActiveData();
    if (!project.videoFile || !activeData || activeData.isProcessing) return;
    
    // Lock UI immediately
    updateActiveData({ progress: 10, isProcessing: true });
    setLoadingText(`${t.actions.analyze} ${translations[project.uiLanguage].languages[activeData.code as keyof typeof translations.en.languages] || activeData.code}...`);

    const timers = [
      setTimeout(() => setLoadingText(t.status.cleaning), 2000),
      setTimeout(() => setLoadingText(t.status.profiling), 4000),
      setTimeout(() => setLoadingText(t.status.emotions), 6000),
    ];
    
    try {
      const targetLangName = translations['en'].languages[activeData.code as keyof typeof translations.en.languages] || activeData.code;
      // Pass customApiKey to enforce user key usage
      const { segments, speakers } = await analyzeVideoScript(project.videoFile, targetLangName, customApiKey);
      
      updateActiveData({
        segments,
        speakers,
        stage: 'configuring_voices',
        progress: 0,
        isAnalyzed: true,
        isProcessing: false // Unlock
      });

    } catch (error) {
      console.error(error);
      alert("Error analyzing video. Check API Key settings.");
      updateActiveData({ stage: 'analyzing_script', progress: 0, isProcessing: false });
    } finally {
      timers.forEach(t => clearTimeout(t));
    }
  };

  const confirmSpeakerConfig = () => {
    updateActiveData({ stage: 'generating_voices' });
  };

  const updateSpeakerVoice = (speakerId: string, newVoice: string) => {
    const activeData = getActiveData();
    if (!activeData) return;

    updateActiveData({
      speakers: activeData.speakers.map(s => s.id === speakerId ? { ...s, voiceName: newVoice } : s)
    });
  };

  const generateAudio = async (segment: DubSegment) => {
    const activeData = getActiveData();
    if (!activeData || !audioEngineRef.current || segment.isGenerating || activeData.isProcessing) return;

    const speaker = activeData.speakers.find(s => s.id === segment.speakerId);
    if (!speaker) return;

    updateActiveData({
      segments: activeData.segments.map(s => s.id === segment.id ? { ...s, isGenerating: true } : s)
    });

    try {
      const audioBuffer = await generateSpeechForSegment(
        segment.improvedText, 
        speaker.voiceName, 
        audioEngineRef.current.getContext(),
        customApiKey
      );

      updateActiveData({
        segments: activeData.segments.map(s => s.id === segment.id ? { ...s, audioBuffer, isGenerating: false } : s)
      });
    } catch (error) {
      console.error(error);
      alert("Generation failed. Check API Key or quota.");
      updateActiveData({
        segments: activeData.segments.map(s => s.id === segment.id ? { ...s, isGenerating: false } : s)
      });
    }
  };

  const performTimeAlignment = (segments: DubSegment[]): DubSegment[] => {
    return segments.map(seg => {
      if (!seg.audioBuffer) return seg;
      const v1 = seg.endTime - seg.startTime;
      const v2 = seg.audioBuffer.duration;
      let speedFactor = v2 / v1;
      speedFactor = Math.max(0.5, Math.min(speedFactor, 2.5));
      return { ...seg, speedFactor };
    });
  };

  const generateAllAudioForActive = async () => {
    const activeData = getActiveData();
    if (!activeData || activeData.isProcessing) return;

    // Lock UI immediately to prevent double clicks
    updateActiveData({ stage: 'generating_voices', isProcessing: true });
    
    let completedCount = 0;
    // Work with a copy to avoid weird state issues
    let currentSegments = [...activeData.segments];
    
    // Sequential Processing Loop with Delay to relieve pressure and allow cancellation if needed (though not implemented here)
    for (let i = 0; i < currentSegments.length; i++) {
      const segment = currentSegments[i];
      
      // Only generate if we don't have audio yet
      if (!segment.audioBuffer) {
        // Mark current segment as generating visually
        currentSegments[i] = { ...segment, isGenerating: true };
        updateActiveData({ segments: [...currentSegments] });

        const speaker = activeData.speakers.find(s => s.id === segment.speakerId);
        if (speaker && audioEngineRef.current) {
             try {
                 // Await the generation (Sequential)
                 const buffer = await generateSpeechForSegment(
                    segment.improvedText, 
                    speaker.voiceName, 
                    audioEngineRef.current.getContext(),
                    customApiKey
                 );
                 currentSegments[i] = { ...segment, audioBuffer: buffer, isGenerating: false };
                 
                 // Artificial delay to prevent rate limits and allow UI to breathe
                 await new Promise(r => setTimeout(r, 500));
                 
             } catch (e) {
                 console.error(e);
                 // Don't fail the whole batch, just this segment
                 currentSegments[i] = { ...segment, isGenerating: false };
             }
        }
      }
      completedCount++;
      // Update progress bar
      updateActiveData({
          progress: (completedCount / currentSegments.length) * 100,
          segments: [...currentSegments]
      });
    }

    updateActiveData({ stage: 'time_alignment', progress: 50 });
    await new Promise(r => setTimeout(r, 1000));
    
    const alignedSegments = performTimeAlignment(currentSegments);
    
    updateActiveData({ 
        segments: alignedSegments, 
        stage: 'assembling_audio', 
        progress: 0 
    });
    
    if (audioEngineRef.current && videoRef.current) {
        const masterBuffer = await audioEngineRef.current.renderMasterDubTrack(
            alignedSegments, 
            videoRef.current.duration || 60
        );
        
        updateActiveData({ 
            masterDubBuffer: masterBuffer,
            stage: 'mixing', 
            progress: 100,
            isProcessing: false // Unlock UI
        });
    } else {
        updateActiveData({ isProcessing: false });
    }
  };

  const handleExport = async (type: 'video' | 'audio') => {
    const activeData = getActiveData();
    if (!videoRef.current || !audioEngineRef.current || !activeData || isExporting || !project.videoFile) return;

    videoRef.current.pause();
    audioEngineRef.current.stopSegments();
    
    setIsExporting(true); // Show overlay locally
    setProject(prev => ({ ...prev, isPlaying: true }));
    
    try {
        // 1. Prepare High Quality Audio Mix (Offline Rendering)
        // This prevents the "choppy" audio because we pre-render everything (music, dubs, ducking) to a single buffer
        const bgAudioBuffer = await audioEngineRef.current.extractAudioFromVideo(project.videoFile);
        
        const finalMixBuffer = await audioEngineRef.current.renderFinalMix(
            activeData.segments,
            bgAudioBuffer,
            {
                bgVol: project.backgroundVolume,
                dubVol: project.dubVolume,
                reverbAmt: project.reverbAmount,
                vocalSuppression: project.vocalSuppression
            }
        );

        // 2. Setup Recording
        const audioDest = audioEngineRef.current.getContext().createMediaStreamDestination();
        
        // Connect the *Pre-Rendered* mix to the recorder destination
        // We use a buffer source node to play the perfect mix
        const mixSource = audioEngineRef.current.getContext().createBufferSource();
        mixSource.buffer = finalMixBuffer;
        mixSource.connect(audioDest);
        
        let recorder: MediaRecorder;
        let mimeType = '';
        const chunks: BlobPart[] = [];

        if (type === 'video') {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            const canvasStream = canvas.captureStream(30); // 30 FPS constant
            
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDest.stream.getAudioTracks()
            ]);

            mimeType = 'video/mp4';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
            
            recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5000000 });
            
            // Sync play
            videoRef.current.currentTime = 0;
            videoRef.current.muted = true; // Mute video element, we use the mixSource audio

            const draw = () => {
                if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                    if(ctx) ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                    requestAnimationFrame(draw);
                }
            };
            
            // Start Everything together
            recorder.start();
            mixSource.start(0);
            await videoRef.current.play();
            draw();

            // Wait for end
            await new Promise<void>((resolve) => {
                videoRef.current!.onended = () => resolve();
                mixSource.onended = () => resolve(); 
                // Fallback timeout just in case
                setTimeout(resolve, (videoRef.current!.duration * 1000) + 1000);
            });
            
            recorder.stop();
            videoRef.current.muted = false;

        } else {
            // Audio Only Export
            mimeType = 'audio/webm';
            recorder = new MediaRecorder(audioDest.stream, { mimeType });
            recorder.start();
            mixSource.start(0);
            
            mixSource.onended = () => recorder.stop();
        }

        recorder.ondataavailable = (e) => {
           if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
           const blob = new Blob(chunks, { type: mimeType });
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = type === 'video' 
               ? `dubai_${activeData.name}_final.mp4` 
               : `dubai_${activeData.name}_audio_track.webm`;
           a.click();
           
           setIsExporting(false);
           setProject(prev => ({ ...prev, isPlaying: false }));
        };

    } catch (e) {
        console.error("Export failed", e);
        setIsExporting(false);
        setProject(prev => ({ ...prev, isPlaying: false }));
        alert("Export failed. Please try again.");
    }
  };

  const togglePlay = () => {
    const activeData = getActiveData();
    if (!videoRef.current || !audioEngineRef.current || !activeData) return;

    if (project.isPlaying) {
      videoRef.current.pause();
      audioEngineRef.current.stopSegments();
      setProject(prev => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      audioEngineRef.current.resume();
      audioEngineRef.current.setupBackgroundAudio(videoRef.current);
      
      videoRef.current.play();
      
      audioEngineRef.current.playMixedAudio(
          activeData.masterDubBuffer,
          activeData.segments, 
          videoRef.current.currentTime
      );
      
      setProject(prev => ({ ...prev, isPlaying: true }));
      
      const updateLoop = () => {
        if (videoRef.current) {
          setProject(prev => ({ ...prev, currentTime: videoRef.current!.currentTime }));
          animationFrameRef.current = requestAnimationFrame(updateLoop);
        }
      };
      updateLoop();
    }
  };

  const updateSegment = (id: string, updates: Partial<DubSegment>) => {
    const activeData = getActiveData();
    if (!activeData || activeData.isProcessing) return;
    
    updateActiveData({
      segments: activeData.segments.map(s => s.id === id ? { ...s, ...updates, audioBuffer: null } : s),
      masterDubBuffer: null,
      stage: activeData.stage === 'mixing' || activeData.stage === 'complete' ? 'generating_voices' : activeData.stage
    });
  };

  // UI Renders
  const renderTabs = () => (
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {Object.values(project.languageData).map((lang) => {
              const isActive = project.activeLanguage === lang.code;
              const langName = translations[project.uiLanguage].languages[lang.code as keyof typeof translations.en.languages] || lang.code;
              return (
                <button
                    key={lang.code}
                    onClick={() => switchLanguage(lang.code)}
                    disabled={lang.isProcessing || isExporting}
                    className={`px-5 py-2.5 rounded-lg font-bold flex items-center gap-3 whitespace-nowrap transition-all border disabled:opacity-50
                        ${isActive 
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                            : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                        }`}
                >
                    {langName}
                    {lang.stage === 'complete' && <span className="text-green-500 text-xs">✓</span>}
                    {lang.stage === 'analyzing_script' && !lang.isAnalyzed && <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>}
                    {lang.isProcessing && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>}
                </button>
              );
          })}
      </div>
  );

  const renderStageIndicator = (stage: ProcessingStage, progress: number) => {
    // UPDATED: Removed 'exporting' from the list
    const stages: ProcessingStage[] = ['extracting_audio', 'separating_stems', 'analyzing_script', 'configuring_voices', 'generating_voices', 'time_alignment', 'assembling_audio', 'mixing'];
    
    // Map stage keys to translated values
    const labels = stages.map(s => {
        const key = s.replace('_audio', '').replace('_script', '').replace('_voices', '').replace('extracting', 'upload').replace('separating_stems', 'separation').replace('analyzing', 'analysis').replace('configuring', 'casting').replace('generating', 'generation').replace('time_alignment', 'sync').replace('assembling', 'assembly').replace('mixing', 'mixing');
        return t.stages[key as keyof typeof t.stages] || s;
    });
    
    const currentIndex = stages.indexOf(stage === 'complete' ? 'mixing' : stage === 'idle' ? 'extracting_audio' : stage);

    return (
      <div className="w-full bg-card border border-border rounded-xl p-4 mb-8 shadow-sm">
        <div className="flex justify-between items-center relative overflow-x-auto pb-2 no-scrollbar">
            <div className="absolute top-[14px] left-0 w-full h-0.5 bg-muted -z-10 min-w-[800px]"></div>
            {stages.map((s, idx) => {
            const isCompleted = currentIndex > idx;
            const isCurrent = currentIndex === idx;
            return (
                <div key={s} className="flex flex-col items-center gap-3 min-w-[70px]">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border-2
                    ${isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent 
                            ? 'bg-primary border-primary text-primary-foreground scale-125 shadow-lg shadow-primary/30' 
                            : 'bg-card border-muted text-muted-foreground'}
                    `}>
                    {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{labels[idx]}</span>
                </div>
            );
            })}
        </div>
      </div>
    );
  };

  const renderLanguageSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-card rounded-2xl border border-border shadow-xl">
      <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner">
        🌍
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-3 font-serif">{t.selectLangTitle}</h2>
      <p className="text-muted-foreground mb-10 max-w-lg leading-relaxed">
        {t.selectLangDesc}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10 w-full max-w-2xl">
        {SUPPORTED_LANGUAGES_LIST.map((lang) => {
          const isSelected = project.selectedLanguages.includes(lang.code);
          const langLabel = translations[project.uiLanguage].languages[lang.key as keyof typeof translations.en.languages];
          return (
            <button
                key={lang.code}
                onClick={() => toggleLanguageSelection(lang.code)}
                className={`p-4 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-between group ${
                isSelected
                    ? 'bg-primary/5 border-primary text-primary shadow-md' 
                    : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted'
                }`}
            >
                {langLabel}
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 group-hover:border-primary'}`}>
                    {isSelected && <span className="text-[10px]">✓</span>}
                </div>
            </button>
          );
        })}
      </div>

      <button 
        onClick={initLanguages}
        disabled={project.selectedLanguages.length === 0}
        className="px-12 py-4 bg-primary hover:bg-primary/90 rounded-full text-primary-foreground font-bold text-lg shadow-lg shadow-primary/25 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
      >
        {t.startProject} <span>🚀</span>
      </button>
    </div>
  );

  const activeData = getActiveData();

  return (
    <div className="min-h-screen font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg shadow-lg shadow-primary/20"></div>
            <h1 className="text-xl font-bold tracking-tight font-serif text-foreground">DubAI</h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* API Key Toggle */}
             <div className="relative">
                <button 
                   onClick={() => setShowSettings(!showSettings)}
                   className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                   title={t.labels.settings}
                >
                   ⚙️
                </button>
                {showSettings && (
                   <div className="absolute top-12 right-0 w-80 bg-card border border-border rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                       <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t.labels.apiKey}</label>
                       <input 
                          type="password" 
                          value={customApiKey}
                          onChange={handleApiKeyChange}
                          placeholder={t.labels.apiKeyPlaceholder}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                       />
                       <p className="text-[10px] text-muted-foreground leading-snug mb-3">
                          {t.labels.apiKeyHelp}
                       </p>
                       <a 
                         href="https://aistudio.google.com/app/apikey" 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-colors"
                       >
                         {t.labels.getKey} ↗
                       </a>
                   </div>
                )}
             </div>

             <div className="hidden md:flex gap-1 bg-muted/50 p-1 rounded-lg">
                {['en', 'fr', 'ar'].map((lang) => (
                    <button
                        key={lang}
                        onClick={() => setProject(prev => ({ ...prev, uiLanguage: lang as any }))}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${project.uiLanguage === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {lang}
                    </button>
                ))}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* Step 1: Upload */}
        {Object.keys(project.languageData).length === 0 && project.selectedLanguages.length === 0 && !project.videoFile && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] border-2 border-dashed border-border rounded-3xl bg-card hover:bg-muted/30 transition-colors group">
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" id="video-upload" />
              <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-6 p-10 w-full h-full justify-center">
                <div className="p-8 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-primary/10">
                    <UploadIcon />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold font-serif text-foreground">{t.uploadTitle}</h2>
                    <p className="text-muted-foreground text-lg">{t.uploadDesc}</p>
                    <span className="inline-block mt-4 text-sm font-mono text-primary bg-primary/10 px-4 py-2 rounded-full">
                        {t.uploadClick}
                    </span>
                </div>
              </label>
           </div>
        )}

        {/* Step 2: Language Selection */}
        {project.videoFile && Object.keys(project.languageData).length === 0 && (
            renderLanguageSelection()
        )}

        {/* Step 3: Main Workflow */}
        {activeData && (
          <>
            {renderTabs()}
            {renderStageIndicator(activeData.stage, activeData.progress)}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                   <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-border group">
                      {project.videoUrl && (
                        <video 
                          ref={videoRef}
                          src={project.videoUrl}
                          className="w-full h-full object-contain"
                          onEnded={() => setProject(prev => ({...prev, isPlaying: false}))}
                          playsInline
                          crossOrigin="anonymous"
                        />
                      )}
                      
                      {/* Overlays */}
                      {(activeData.isProcessing || isExporting || ['analyzing_script', 'separating_stems', 'assembling_audio', 'time_alignment'].includes(activeData.stage)) && !['mixing', 'configuring_voices'].includes(activeData.stage) && (
                        <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                           {isExporting ? (
                             <div className="text-center w-full max-w-md px-8">
                                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
                                <h3 className="text-xl font-bold text-foreground mb-3">{t.status.exporting}</h3>
                                {/* Simple Indeterminate Progress for export if we can't track exact */}
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                   <div className="h-full bg-primary animate-pulse w-full"></div>
                                </div>
                             </div>
                           ) : activeData.stage === 'analyzing_script' && !activeData.isAnalyzed ? (
                              <div className="text-center">
                                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6 mx-auto"></div>
                                <h3 className="text-2xl font-bold text-foreground mb-2 font-serif">{t.stages.analysis}</h3>
                                <p className="text-muted-foreground animate-pulse font-mono text-sm">{loadingText}</p>
                              </div>
                           ) : (
                               <div className="text-center">
                                  <div className="w-12 h-12 border-4 border-muted-foreground border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                                  <p className="text-muted-foreground font-medium">{t.actions.processing}</p>
                                  {activeData.stage === 'generating_voices' && (
                                     <p className="text-xs text-muted-foreground mt-2">{(activeData.progress).toFixed(0)}%</p>
                                  )}
                               </div>
                           )}
                        </div>
                      )}

                       {/* Play Button Overlay */}
                       {!project.isPlaying && (activeData.stage === 'generating_voices' || activeData.stage === 'mixing' || activeData.stage === 'complete') && !activeData.isProcessing && !isExporting && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <button 
                                className="w-20 h-20 bg-primary/90 backdrop-blur-sm rounded-full flex items-center justify-center text-primary-foreground pointer-events-auto cursor-pointer hover:scale-110 transition-transform shadow-2xl" 
                                onClick={togglePlay}
                            >
                                <PlayIcon />
                            </button>
                        </div>
                       )}
                   </div>

                   {/* Contextual Actions */}
                   {activeData.stage === 'analyzing_script' && !activeData.isAnalyzed && !activeData.isProcessing && (
                        <button onClick={startAnalysisForActive} className="w-full py-5 bg-primary hover:bg-primary/90 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all text-primary-foreground">
                            {t.actions.analyze} {translations[project.uiLanguage].languages[activeData.code as keyof typeof translations.en.languages]}
                        </button>
                   )}

                   {activeData.stage === 'configuring_voices' && (
                       <div className="bg-card p-8 rounded-2xl border border-border shadow-sm">
                            <h3 className="text-xl font-bold mb-6 text-foreground flex items-center gap-3 font-serif">
                                <span className="text-2xl">🎭</span> {t.stages.casting}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {activeData.speakers.map(speaker => (
                                <div key={speaker.id} className="bg-muted/30 p-5 rounded-xl border border-border flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm ${speaker.gender === 'male' ? 'bg-blue-500/10 text-blue-500' : 'bg-pink-500/10 text-pink-500'}`}>
                                        {speaker.gender === 'male' ? '♂' : '♀'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-lg text-foreground">{speaker.name}</div>
                                        <div className="text-xs text-muted-foreground flex gap-2 mt-1.5">
                                            <span className="bg-muted px-2 py-0.5 rounded font-mono">{speaker.ageEstimate}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5 items-end">
                                        <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t.labels.voice}</label>
                                        <select 
                                            value={speaker.voiceName}
                                            onChange={(e) => updateSpeakerVoice(speaker.id, e.target.value)}
                                            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-primary outline-none focus:ring-1 focus:ring-primary shadow-sm"
                                        >
                                            {Object.values(VoiceOption).map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                ))}
                            </div>
                            <button 
                                onClick={confirmSpeakerConfig} 
                                disabled={activeData.isProcessing}
                                className="w-full py-4 bg-primary hover:bg-primary/90 rounded-xl text-primary-foreground font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t.actions.confirmVoices}
                            </button>
                       </div>
                   )}

                   {/* Mixing Console */}
                   {(activeData.stage === 'generating_voices' || activeData.stage === 'mixing' || activeData.stage === 'complete') && (
                       <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                           <div className="flex flex-col md:flex-row items-center gap-6">
                                <button 
                                    onClick={togglePlay} 
                                    disabled={activeData.isProcessing || isExporting}
                                    className="w-14 h-14 flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-50"
                                >
                                    {project.isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </button>
                                
                                {activeData.stage === 'generating_voices' && (
                                    <button 
                                        onClick={generateAllAudioForActive} 
                                        disabled={activeData.isProcessing}
                                        className="w-full md:w-auto px-8 py-4 bg-accent hover:bg-accent/90 rounded-xl text-accent-foreground font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {activeData.isProcessing ? (
                                            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                        ) : <MagicIcon />} 
                                        {activeData.isProcessing ? t.actions.processing : t.actions.generateAll}
                                    </button>
                                )}

                                {(activeData.stage === 'mixing' || activeData.stage === 'complete') && (
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider"><span>{t.labels.music}</span><span>{(project.backgroundVolume * 100).toFixed(0)}%</span></div>
                                            <input type="range" min="0" max="1" step="0.01" value={project.backgroundVolume} onChange={(e) => setProject(prev => ({...prev, backgroundVolume: parseFloat(e.target.value)}))} className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-foreground" />
                                        </div>
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                            <div className="flex justify-between text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider"><span>{t.labels.dub}</span><span>{(project.dubVolume * 100).toFixed(0)}%</span></div>
                                            <input type="range" min="0" max="1.5" step="0.01" value={project.dubVolume} onChange={(e) => setProject(prev => ({...prev, dubVolume: parseFloat(e.target.value)}))} className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
                                        </div>
                                    </div>
                                )}
                           </div>
                           
                           {(activeData.stage === 'mixing' || activeData.stage === 'complete') && (
                               <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                    {/* Atmosphere + Vocal Removal */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg">
                                            <span className="text-xs text-muted-foreground font-bold w-24 uppercase tracking-wider">{t.labels.atmosphere}</span>
                                            <input type="range" min="0" max="0.8" step="0.05" value={project.reverbAmount} onChange={(e) => setProject(prev => ({...prev, reverbAmount: parseFloat(e.target.value)}))} className="w-full h-1.5 bg-muted-foreground/30 rounded-lg appearance-none cursor-pointer accent-accent" />
                                        </div>
                                        <button 
                                            onClick={() => setProject(prev => ({...prev, vocalSuppression: !prev.vocalSuppression}))}
                                            disabled={isExporting}
                                            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${project.vocalSuppression ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'}`}
                                        >
                                            <span className="text-sm font-bold flex items-center gap-2">
                                                <span>🎤</span> {t.labels.removeVocals}
                                            </span>
                                            <div className={`w-10 h-5 rounded-full relative transition-colors ${project.vocalSuppression ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${project.vocalSuppression ? 'left-6' : 'left-1'}`}></div>
                                            </div>
                                        </button>
                                    </div>

                                    <div className="flex justify-end gap-3 h-full items-end">
                                        <button 
                                            onClick={() => handleExport('audio')} 
                                            disabled={isExporting}
                                            className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg text-secondary-foreground text-xs font-bold shadow-sm transition-all border border-border h-12 disabled:opacity-50"
                                        >
                                            {t.actions.exportAudio}
                                        </button>
                                        <button 
                                            onClick={() => handleExport('video')} 
                                            disabled={isExporting}
                                            className="px-5 py-2.5 bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition-all h-12 disabled:opacity-50"
                                        >
                                            <DownloadIcon /> {t.actions.exportVideo}
                                        </button>
                                    </div>
                               </div>
                           )}
                       </div>
                   )}
                </div>

                {/* Right Column: Timeline */}
                <div className="lg:col-span-1 h-[600px] lg:h-auto flex flex-col">
                  <div className="bg-card rounded-2xl border border-border h-full flex flex-col overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-border bg-muted/20 flex justify-between items-center backdrop-blur-sm">
                       <h2 className="font-bold text-sm text-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-primary"></span>
                         {t.labels.script}
                       </h2>
                    </div>
                    <div className="flex-1 overflow-hidden relative bg-card">
                       <Timeline 
                        segments={activeData.segments}
                        speakers={activeData.speakers}
                        currentTime={project.currentTime}
                        onUpdateSegment={updateSegment}
                        onGenerateAudio={generateAudio}
                        translations={t}
                      />
                    </div>
                  </div>
                </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;