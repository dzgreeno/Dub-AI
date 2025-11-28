
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DubSegment, Speaker, VoiceOption } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to remove leading silence from AudioBuffer
const trimSilence = (buffer: AudioBuffer, context: AudioContext): AudioBuffer => {
  const channelData = buffer.getChannelData(0);
  const threshold = 0.005; // Sensitivity for "silence"
  let startSample = 0;

  // Find the first sample exceeding the threshold
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      startSample = i;
      break;
    }
  }

  // If startSample is 0 or very small (e.g. < 50ms), return original
  if (startSample < 100) return buffer;

  const newLength = buffer.length - startSample;
  if (newLength <= 0) return buffer;

  const newBuffer = context.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
     const oldData = buffer.getChannelData(channel);
     const newData = newBuffer.getChannelData(channel);
     // Efficient copy
     newData.set(oldData.subarray(startSample));
  }
  
  return newBuffer;
};

// Helper to decode raw PCM base64 audio to AudioBuffer
// Gemini TTS returns raw PCM 16-bit 24kHz mono without headers
export const decodeAudioData = async (base64Data: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const sampleRate = 24000;
  const numChannels = 1;

  // Create 16-bit integer view from the bytes
  const validLen = len - (len % 2);
  const dataInt16 = new Int16Array(bytes.buffer, 0, validLen / 2);
  
  const buffer = audioContext.createBuffer(numChannels, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < dataInt16.length; i++) {
    // Normalize Int16 to Float32 [-1.0, 1.0]
    channelData[i] = dataInt16[i] / 32768.0;
  }
  
  // Apply silence trimming
  return trimSilence(buffer, audioContext);
};

// Smart Voice Mapper based on profile
const mapProfileToVoice = (gender: string, age: string, quality: string): string => {
  const g = gender.toLowerCase();
  const q = quality.toLowerCase();
  const a = age.toLowerCase();

  if (g === 'male') {
    if (q.includes('deep') || q.includes('authoritative') || a.includes('senior')) return VoiceOption.Charon;
    if (q.includes('intense') || q.includes('strong')) return VoiceOption.Fenrir;
    return VoiceOption.Puck; // Default/Soft Male
  } else {
    if (q.includes('soft') || q.includes('gentle') || q.includes('whisper')) return VoiceOption.Zephyr;
    return VoiceOption.Kore; // Default/Clear Female
  }
};

export const analyzeVideoScript = async (videoFile: File, targetLanguage: string, userApiKey?: string): Promise<{ segments: DubSegment[], speakers: Speaker[] }> => {
  // Use user key if provided, otherwise fallback to env key
  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  const base64Video = await fileToGenerativePart(videoFile);

  // Phase 3 & 4 Prompt: Analysis + Profiling + Smart Dubbing Adaptation
  // STRICT INSTRUCTIONS FOR LENGTH MATCHING ADDED
  const prompt = `
    You are an expert AI Dubbing Director and Script Adapter.

    Your task is to analyze the video and generate a structured dubbing script in **${targetLanguage}**.

    ### CRITICAL RULES FOR 'improvedText' (DUBBING SCRIPT):
    1. **Isochrony (Time Matching)**: The translated text MUST fit naturally into the original time slot.
    2. **Conciseness Over Literal Accuracy**: Do NOT translate word-for-word. Summarize and rephrase to be short.
    3. **Length Constraint**: The character count of 'improvedText' MUST be approximately equal to 'originalText'. 
       - **Maximum allowed increase**: +6 characters.
       - If the target language usually takes more space, you MUST shorten the meaning.
       - Example: If original is "I am going to the supermarket to buy food" (Long), do NOT translate fully. Adapt to "I'm going to the store" or "Buying food".
    
    ### TASKS:
    1. **ASR (Transcription)**: Transcribe the original dialogue accurately.
    2. **Translation & Adaptation**: Convert to **${targetLanguage}** applying the length constraints above.
    3. **Speaker Profiling**: Identify Gender, Age, and Voice Quality.
    4. **Timing**: Precise timestamps.

    Return JSON matching the schema.
  `;

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      speakers: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            gender: { type: Type.STRING, enum: ['male', 'female'] },
            ageEstimate: { type: Type.STRING, description: "e.g. Young Adult, Senior" },
            voiceQuality: { type: Type.STRING, description: "e.g. Deep, Soft, Raspy, Clear" }
          },
          required: ['id', 'name', 'gender', 'ageEstimate', 'voiceQuality']
        }
      },
      segments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            startTime: { type: Type.NUMBER },
            endTime: { type: Type.NUMBER },
            speakerId: { type: Type.STRING },
            originalText: { type: Type.STRING },
            improvedText: { type: Type.STRING, description: "Short, adapted translation for dubbing. Similar length to original." },
            emotion: { type: Type.STRING }
          },
          required: ['startTime', 'endTime', 'speakerId', 'originalText', 'improvedText', 'emotion']
        }
      }
    },
    required: ['speakers', 'segments']
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { mimeType: videoFile.type, data: base64Video } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: "You are a professional Dubbing Script Writer focused on lip-sync and timing constraints.",
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  const data = JSON.parse(text);

  // Map to our internal types with Smart Voice Assignment
  const speakers: Speaker[] = data.speakers.map((s: any) => ({
    id: s.id,
    name: s.name,
    gender: s.gender,
    ageEstimate: s.ageEstimate,
    voiceQuality: s.voiceQuality,
    // Phase 4: Auto-assign best voice
    voiceName: mapProfileToVoice(s.gender, s.ageEstimate, s.voiceQuality)
  }));

  const segments: DubSegment[] = data.segments.map((s: any, index: number) => ({
    id: `seg-${index}-${Date.now()}`,
    startTime: s.startTime,
    endTime: s.endTime,
    speakerId: s.speakerId,
    originalText: s.originalText,
    improvedText: s.improvedText,
    emotion: s.emotion || 'neutral',
    audioBuffer: null
  }));

  return { speakers, segments };
};


export const generateSpeechForSegment = async (
  text: string, 
  voiceName: string, 
  context: AudioContext,
  userApiKey?: string
): Promise<AudioBuffer> => {
  // Use user key if provided, otherwise fallback to env key
  const apiKey = userApiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  // Phase 4: Generation with Emotion/Tone via Voice Selection
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("Failed to generate audio");
  }

  return await decodeAudioData(base64Audio, context);
};