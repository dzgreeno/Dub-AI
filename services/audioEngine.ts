
import { DubSegment } from "../types";

export class AudioEngine {
  private context: AudioContext;
  private backgroundSource: MediaElementAudioSourceNode | null = null;
  
  // Mixing Nodes
  private bgInputNode: GainNode;     // Raw input from video
  private bgProcessedNode: GainNode; // Output after vocal suppression check
  private bgVolumeNode: GainNode;    // User Controlled Volume
  private bgDuckingNode: GainNode;   // Automated Ducking
  
  // Vocal Suppression Chain (DSP)
  private vocalSuppressionGain: GainNode; // Crossfader: 0 = Dry, 1 = Wet (No Vocals)
  private dryPath: GainNode;
  private wetPath: GainNode;

  private dubBus: GainNode;          // Collection point for dub sources
  private dubVolumeNode: GainNode;   // User Controlled Volume
  
  // Reverb / Atmosphere
  private reverbNode: ConvolverNode;
  private reverbGain: GainNode;

  private activeSources: AudioBufferSourceNode[] = [];
  
  // Compressor helps glue the mix together
  private masterCompressor: DynamicsCompressorNode;
  
  // Monitor (Speaker Output)
  private monitorNode: GainNode;

  constructor(options?: any) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Chain
    this.masterCompressor = this.context.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-24, this.context.currentTime);
    this.masterCompressor.knee.setValueAtTime(30, this.context.currentTime);
    this.masterCompressor.ratio.setValueAtTime(12, this.context.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.003, this.context.currentTime);
    this.masterCompressor.release.setValueAtTime(0.25, this.context.currentTime);
    
    // Monitor Setup
    this.monitorNode = this.context.createGain();
    this.masterCompressor.connect(this.monitorNode);
    this.monitorNode.connect(this.context.destination);

    // Reverb Setup
    this.reverbNode = this.context.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(2.0, 2.0);
    this.reverbGain = this.context.createGain();
    this.reverbGain.gain.value = 0;
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterCompressor);

    // --- Background Channel Chain with Vocal Remover ---
    this.bgInputNode = this.context.createGain();
    
    // 1. Dry Path (Original Audio)
    this.dryPath = this.context.createGain();
    this.bgInputNode.connect(this.dryPath);

    // 2. Wet Path (Vocal Suppression)
    // We construct a "Karaoke" filter: (L - R) to remove center vocals + LowPass to keep bass
    this.wetPath = this.context.createGain();
    this.wetPath.gain.value = 0; // Default off
    this.setupVocalRemoverDSP(this.bgInputNode, this.wetPath);

    // 3. Re-combine
    this.bgProcessedNode = this.context.createGain();
    this.dryPath.connect(this.bgProcessedNode);
    this.wetPath.connect(this.bgProcessedNode);

    // 4. Volume & Ducking
    this.bgVolumeNode = this.context.createGain();
    this.bgVolumeNode.gain.value = 0.5;

    this.bgDuckingNode = this.context.createGain();
    this.bgDuckingNode.gain.value = 1.0;

    this.bgProcessedNode.connect(this.bgVolumeNode);
    this.bgVolumeNode.connect(this.bgDuckingNode);
    this.bgDuckingNode.connect(this.masterCompressor);

    // --- Dub Channel Chain ---
    this.dubBus = this.context.createGain();
    this.dubVolumeNode = this.context.createGain();
    this.dubVolumeNode.gain.value = 1.0;

    this.dubBus.connect(this.dubVolumeNode);
    this.dubVolumeNode.connect(this.masterCompressor); 
    this.dubVolumeNode.connect(this.reverbNode);       
  }

  /**
   * Builds the Vocal Suppression DSP Graph
   * Strategy:
   * 1. Extract Bass (LowPass < 200Hz) from original -> Keep this (Bass is usually center but essential)
   * 2. Extract Side information (L - R) -> This removes Center (Vocals) -> HighPass > 200Hz
   * 3. Mix Bass + Side
   */
  private setupVocalRemoverDSP(input: AudioNode, output: AudioNode) {
    const splitter = this.context.createChannelSplitter(2);
    const merger = this.context.createChannelMerger(2);
    
    input.connect(splitter);

    // Branch 1: Bass Retention (Original Mix -> LowPass)
    const bassFilter = this.context.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 200;
    input.connect(bassFilter);
    bassFilter.connect(merger, 0, 0); // Add bass to L
    bassFilter.connect(merger, 0, 1); // Add bass to R

    // Branch 2: Vocal Removal (Phase Inversion)
    // L_out = L_in + (-R_in)
    // R_out = R_in + (-L_in) ... actually simpler is Mono difference
    
    const leftIn = this.context.createGain();
    const rightIn = this.context.createGain();
    
    splitter.connect(leftIn, 0); // L
    splitter.connect(rightIn, 1); // R

    const inverter = this.context.createGain();
    inverter.gain.value = -1;

    // Create L-R signal (Side)
    // To do this simply in WebAudio without heavy worklets:
    // We take L, add inverted R.
    
    const sideSignal = this.context.createGain();
    
    // Connect L to Side
    leftIn.connect(sideSignal);
    
    // Connect R -> Inverter -> Side
    rightIn.connect(inverter);
    inverter.connect(sideSignal);
    
    // Filter Side Signal (HighPass to remove muddy low end cancellation artifacts)
    const sideFilter = this.context.createBiquadFilter();
    sideFilter.type = 'highpass';
    sideFilter.frequency.value = 200;
    
    sideSignal.connect(sideFilter);

    // Distribute Side Signal back to Stereo (It becomes mono-ish but without center vocals)
    sideFilter.connect(merger, 0, 0);
    sideFilter.connect(merger, 0, 1);

    merger.connect(output);
  }

  toggleVocalSuppression(enable: boolean) {
    const now = this.context.currentTime;
    // Crossfade between Dry and Wet paths
    if (enable) {
      this.dryPath.gain.setTargetAtTime(0, now, 0.1);
      this.wetPath.gain.setTargetAtTime(1, now, 0.1);
    } else {
      this.dryPath.gain.setTargetAtTime(1, now, 0.1);
      this.wetPath.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  private createImpulseResponse(duration: number, decay: number) {
    const rate = this.context.sampleRate;
    const length = rate * duration;
    const impulse = this.context.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const n = i;
        const val = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        left[i] = val;
        right[i] = val;
    }
    return impulse;
  }

  get currentTime() {
    return this.context.currentTime;
  }

  resume() {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setMixSettings(bgVol: number, dubVol: number, reverbAmt: number) {
    const now = this.context.currentTime;
    this.bgVolumeNode.gain.setTargetAtTime(bgVol, now, 0.1);
    this.dubVolumeNode.gain.setTargetAtTime(dubVol, now, 0.1);
    this.reverbGain.gain.setTargetAtTime(reverbAmt, now, 0.1);
  }

  setupBackgroundAudio(videoElement: HTMLVideoElement) {
    if (!this.backgroundSource) {
      try {
        this.backgroundSource = this.context.createMediaElementSource(videoElement);
        // Connect to bgInputNode instead of bgVolumeNode directly
        this.backgroundSource.connect(this.bgInputNode);
      } catch (e) {
        console.warn("Media element source already connected or error:", e);
      }
    }
  }

  toggleMonitor(mute: boolean) {
      const now = this.context.currentTime;
      this.monitorNode.gain.setTargetAtTime(mute ? 0 : 1, now, 0.05);
  }

  createStreamDestination(): MediaStreamAudioDestinationNode {
    const dest = this.context.createMediaStreamDestination();
    this.masterCompressor.connect(dest);
    return dest;
  }

  // New: Decode video audio for offline rendering
  async extractAudioFromVideo(videoFile: File): Promise<AudioBuffer> {
    const arrayBuffer = await videoFile.arrayBuffer();
    return await this.context.decodeAudioData(arrayBuffer);
  }

  // New: Render everything (BG + Dubs + Effects) to a single buffer
  async renderFinalMix(
    segments: DubSegment[], 
    backgroundBuffer: AudioBuffer,
    settings: { bgVol: number, dubVol: number, reverbAmt: number, vocalSuppression: boolean }
  ): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const duration = backgroundBuffer.duration;
    const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    // --- Recreate the Graph in Offline Context ---

    // 1. Background Source
    const bgSource = offlineCtx.createBufferSource();
    bgSource.buffer = backgroundBuffer;
    
    // Background Chain
    const bgInput = offlineCtx.createGain();
    const bgProcessed = offlineCtx.createGain();
    const bgVolume = offlineCtx.createGain();
    const bgDucking = offlineCtx.createGain();

    bgSource.connect(bgInput);

    // Vocal Suppression Logic (Offline version)
    if (settings.vocalSuppression) {
        // Simplified Offline Vocal Suppression (L-R)
        // Note: Full DSP is complex offline, here we apply a basic center cancel
        const splitter = offlineCtx.createChannelSplitter(2);
        const merger = offlineCtx.createChannelMerger(2);
        const inverter = offlineCtx.createGain();
        inverter.gain.value = -1;
        
        bgInput.connect(splitter);
        const l = offlineCtx.createGain();
        const r = offlineCtx.createGain();
        splitter.connect(l, 0);
        splitter.connect(r, 1);
        
        l.connect(merger, 0, 0); // L -> L
        l.connect(merger, 0, 1); // L -> R
        r.connect(inverter);
        inverter.connect(merger, 0, 0); // -R -> L
        inverter.connect(merger, 0, 1); // -R -> R
        // This is a simple mono diff.
        
        merger.connect(bgProcessed);
    } else {
        bgInput.connect(bgProcessed);
    }

    bgProcessed.connect(bgVolume);
    bgVolume.connect(bgDucking);
    bgVolume.gain.value = settings.bgVol;
    
    bgDucking.connect(offlineCtx.destination);

    // 2. Dub Segments
    const dubBus = offlineCtx.createGain();
    dubBus.gain.value = settings.dubVol;
    dubBus.connect(offlineCtx.destination);

    // Reverb (Simple)
    const reverbGain = offlineCtx.createGain();
    reverbGain.gain.value = settings.reverbAmt;
    if (settings.reverbAmt > 0) {
        // Note: Creating impulse offline is expensive, skipping conv for speed or reusing buffer if passed
        // For simplicity in this fix, we just mix dry for now or use delay
        dubBus.connect(reverbGain);
        reverbGain.connect(offlineCtx.destination);
    }

    // Schedule Segments and Ducking
    const DUCK_FLOOR = 0.2;
    const FADE_TIME = 0.2;

    segments.forEach(seg => {
        if (seg.audioBuffer) {
            const source = offlineCtx.createBufferSource();
            source.buffer = seg.audioBuffer;
            if (seg.speedFactor) source.playbackRate.value = seg.speedFactor;
            
            source.connect(dubBus);
            source.start(seg.startTime);

            // Calculate duration based on playback rate
            const duration = seg.audioBuffer.duration / (seg.speedFactor || 1);

            // Automate Ducking
            const start = seg.startTime;
            const end = seg.startTime + duration;
            
            // We use setTargetAtTime approach approximation for linear ramp
            bgDucking.gain.setValueAtTime(1.0, start);
            bgDucking.gain.linearRampToValueAtTime(DUCK_FLOOR, start + FADE_TIME);
            bgDucking.gain.setValueAtTime(DUCK_FLOOR, end - FADE_TIME);
            bgDucking.gain.linearRampToValueAtTime(1.0, end);
        }
    });

    bgSource.start(0);

    return await offlineCtx.startRendering();
  }

  async renderMasterDubTrack(segments: DubSegment[], duration: number): Promise<AudioBuffer> {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
    segments.forEach(seg => {
      if (seg.audioBuffer) {
        const source = offlineCtx.createBufferSource();
        source.buffer = seg.audioBuffer;
        if (seg.speedFactor) {
           source.playbackRate.value = seg.speedFactor;
        }
        source.connect(offlineCtx.destination);
        source.start(seg.startTime);
      }
    });
    return await offlineCtx.startRendering();
  }

  playMixedAudio(
    masterDubBuffer: AudioBuffer | null, 
    segments: DubSegment[], 
    startTimeOffset: number = 0
  ) {
    this.stopSegments();
    const now = this.context.currentTime;

    this.bgDuckingNode.gain.cancelScheduledValues(now);
    this.bgDuckingNode.gain.setValueAtTime(1.0, now);

    segments.forEach(seg => {
      const startDelay = seg.startTime - startTimeOffset;
      const endDelay = seg.endTime - startTimeOffset;
      
      if (endDelay > 0) {
        const absStartTime = now + Math.max(0, startDelay);
        const absEndTime = now + endDelay;
        
        if (seg.audioBuffer) {
           const DUCK_FLOOR = 0.2; 
           const FADE_TIME = 0.2;
           this.bgDuckingNode.gain.setTargetAtTime(DUCK_FLOOR, absStartTime, FADE_TIME);
           this.bgDuckingNode.gain.setTargetAtTime(1.0, absEndTime, FADE_TIME);
        }
      }
    });

    if (masterDubBuffer) {
      const source = this.context.createBufferSource();
      source.buffer = masterDubBuffer;
      source.connect(this.dubBus);
      const offset = Math.max(0, startTimeOffset);
      if (offset < masterDubBuffer.duration) {
         source.start(now, offset);
         this.activeSources.push(source);
      }
    } else {
      segments.forEach(seg => {
        if (seg.audioBuffer) {
          let startDelay = seg.startTime - startTimeOffset;
          let offset = 0;
          if (startDelay < 0) {
             offset = Math.abs(startDelay);
             startDelay = 0;
          }
          if (offset < seg.audioBuffer.duration) {
            const absStartTime = now + startDelay;
            const source = this.context.createBufferSource();
            source.buffer = seg.audioBuffer;
            if (seg.speedFactor) {
              source.playbackRate.value = seg.speedFactor;
            }
            source.connect(this.dubBus);
            source.start(absStartTime, offset);
            this.activeSources.push(source);
          }
        }
      });
    }
  }

  stopSegments() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.activeSources = [];
    this.bgDuckingNode.gain.cancelScheduledValues(this.context.currentTime);
    this.bgDuckingNode.gain.setValueAtTime(1.0, this.context.currentTime);
  }
  
  getContext() {
    return this.context;
  }
}