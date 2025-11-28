
import React, { useRef, useEffect } from 'react';
import { DubSegment, Speaker } from '../types';
import { MagicIcon } from './Icons';

interface TimelineProps {
  segments: DubSegment[];
  speakers: Speaker[];
  currentTime: number;
  onUpdateSegment: (id: string, updates: Partial<DubSegment>) => void;
  onGenerateAudio: (segment: DubSegment) => void;
  translations: any;
}

const Timeline: React.FC<TimelineProps> = ({ 
  segments, 
  speakers, 
  currentTime, 
  onUpdateSegment,
  onGenerateAudio,
  translations
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active segment
  useEffect(() => {
    if (scrollRef.current) {
       const activeEl = scrollRef.current.querySelector('.active-segment');
       if (activeEl) {
         activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
       }
    }
  }, [currentTime]);

  return (
    <div ref={scrollRef} className="flex flex-col gap-3 p-4 overflow-y-auto h-full pb-20 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
      {segments.length === 0 && (
        <div className="text-muted-foreground text-center py-20 flex flex-col items-center gap-4 opacity-50">
          <div className="w-8 h-8 border-2 border-muted-foreground border-dashed rounded-full animate-spin-slow"></div>
          <span className="text-sm font-medium">{translations.status.waiting}</span>
        </div>
      )}
      {segments.map((segment) => {
        const speaker = speakers.find(s => s.id === segment.speakerId);
        const isActive = currentTime >= segment.startTime && currentTime <= segment.endTime;
        
        return (
          <div 
            key={segment.id} 
            className={`p-4 rounded-xl border transition-all duration-300 relative group
              ${isActive 
                ? 'active-segment border-primary bg-primary/5 shadow-md shadow-primary/10 scale-[1.02]' 
                : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30'
              }`}
          >
            {/* Audio Presence Indicator */}
            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-colors ${segment.audioBuffer ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted'}`}></div>

            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide ${speaker?.gender === 'male' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-pink-500/10 text-pink-600 dark:text-pink-400'}`}>
                      {speaker?.name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
                       {speaker?.voiceName}
                    </span>
                 </div>
                 <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {segment.startTime.toFixed(1)}s
                    </span>
                    {segment.emotion && (
                      <span className="text-[10px] text-accent/80 italic font-medium px-1.5 rounded bg-accent/5">
                        {segment.emotion}
                      </span>
                    )}
                 </div>
              </div>

              <button
                onClick={() => onGenerateAudio(segment)}
                disabled={segment.isGenerating}
                className={`p-2 rounded-lg transition-all 
                    ${segment.audioBuffer 
                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' 
                        : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground shadow-sm'
                    } disabled:opacity-50`}
                title={translations.actions.generateAll}
              >
                {segment.isGenerating ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MagicIcon />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
               <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground font-serif italic leading-relaxed">
                    "{segment.originalText}"
                  </p>
               </div>
               <div>
                  <textarea 
                    className="w-full bg-background border border-input rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all shadow-sm placeholder:text-muted-foreground/50"
                    value={segment.improvedText}
                    onChange={(e) => onUpdateSegment(segment.id, { improvedText: e.target.value })}
                    rows={2}
                    dir="auto"
                    placeholder={translations.labels.improved}
                  />
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;