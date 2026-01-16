
export interface SpeechSegment {
  text: string;
  onStart?: () => void;
  onEnd?: () => void;
}

class AudioService {
  private synth = window.speechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private fullQueue: SpeechSegment[] = [];
  private remainingQueue: SpeechSegment[] = [];
  private isPlaying = false;
  private currentRate = 1.0;

  getNaturalVoices(): SpeechSynthesisVoice[] {
    const allVoices = this.synth.getVoices();
    
    // Quality keywords to find "human-like" voices
    const qualityKeywords = [
      'natural', 'google', 'premium', 'enhanced', 'neural',
      'samantha', 'alex', 'daniel', 'serena', 'aria', 'jenny', 'guy'
    ];

    // Filter for English first
    const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));

    const naturalVoices = englishVoices.filter(voice => {
      const name = voice.name.toLowerCase();
      // Exclude low-quality legacy voices
      if (name.includes('compact') || name.includes('classic') || name.includes('legacy')) {
        return false;
      }
      return qualityKeywords.some(kw => name.includes(kw));
    });

    return naturalVoices.length > 0 ? naturalVoices : englishVoices;
  }

  stop() {
    this.synth.cancel();
    this.isPlaying = false;
    this.remainingQueue = [];
    this.currentUtterance = null;
  }

  async playSequence(segments: SpeechSegment[], voiceName?: string, rate: number = 1.0, startIndex: number = 0) {
    this.stop();
    this.fullQueue = [...segments];
    this.remainingQueue = segments.slice(startIndex);
    this.currentRate = rate;
    this.isPlaying = true;
    this.processQueue(voiceName);
  }

  private processQueue(voiceName?: string) {
    if (this.remainingQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    const segment = this.remainingQueue.shift();
    if (!segment) return;

    // Create fresh utterance for every segment to ensure properties are applied
    const utterance = new SpeechSynthesisUtterance(segment.text);
    const voices = this.getNaturalVoices();
    
    let selectedVoice = voices.find(v => v.name === voiceName);
    
    // Default logic: US English, Google/Microsoft preferred
    if (!selectedVoice) {
      const usVoices = voices.filter(v => v.lang === 'en-US');
      selectedVoice = usVoices.find(v => v.name.includes('Google') || v.name.includes('Microsoft')) 
                   || usVoices[0] 
                   || voices.find(v => v.lang.startsWith('en')) 
                   || voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Apply speed rate. 
    // Note: Some browsers cap rate between 0.1 and 10.
    utterance.rate = this.currentRate; 
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => segment.onStart?.();
    utterance.onend = () => {
      segment.onEnd?.();
      if (this.isPlaying) {
        this.processQueue(voiceName);
      }
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      if (this.isPlaying) this.processQueue(voiceName);
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
}

export const audioService = new AudioService();
