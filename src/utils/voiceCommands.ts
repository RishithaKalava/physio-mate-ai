/**
 * Voice Command Recognition and Speech Synthesis
 */

// Web Speech API Type Definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export type VoiceStatus = 'idle' | 'listening' | 'error' | 'unsupported';

export interface VoiceEvents {
  onCommand: (command: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onStatus?: (status: VoiceStatus, detail?: string) => void;
}

export class VoiceCommandHandler {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private onCommand: ((command: string) => void) | null = null;
  private onTranscript: ((text: string, isFinal: boolean) => void) | null = null;
  private onStatus: ((status: VoiceStatus, detail?: string) => void) | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private starting: boolean = false;

  constructor() {
    this.synthesis = window.speechSynthesis;

    // Initialize speech recognition
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.onStatus?.('listening');
      };

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const command = result[0].transcript.toLowerCase().trim();
          if (!command) continue;
          this.onTranscript?.(command, result.isFinal);
          if (!result.isFinal) continue;
          console.log('Voice command detected:', command);
          this.onCommand?.(command);
        }
      };

      this.recognition.onerror = (event) => {
        // "no-speech" / "aborted" are normal in continuous mode
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isListening = false;
        }
        console.warn('Speech recognition error:', event.error);
        this.onStatus?.('error', event.error);
      };

      this.recognition.onend = () => {
        this.starting = false;
        if (!this.isListening) {
          this.onStatus?.('idle');
          return;
        }
        if (this.restartTimer) clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => this.safeStart(), 300);
      };
    }
  }

  private safeStart(): void {
    if (!this.recognition || !this.isListening || this.starting) return;
    try {
      this.starting = true;
      this.recognition.start();
    } catch {
      this.starting = false;
    }
  }

  startListening(handler: ((command: string) => void) | VoiceEvents): void {
    const events: VoiceEvents =
      typeof handler === 'function' ? { onCommand: handler } : handler;

    if (!this.recognition) {
      console.warn('Speech recognition not supported');
      events.onStatus?.('unsupported');
      return;
    }

    this.onCommand = events.onCommand;
    this.onTranscript = events.onTranscript ?? null;
    this.onStatus = events.onStatus ?? null;
    this.isListening = true;
    this.safeStart();
  }

  stopListening(): void {
    if (!this.recognition) return;

    this.isListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    try {
      this.recognition.abort();
    } catch {
      // ignore
    }

    this.onCommand = null;
    this.onTranscript = null;
    this.onStatus?.('idle');
    this.onStatus = null;
  }

  speak(text: string, options?: { rate?: number; pitch?: number }): Promise<void> {
    return new Promise((resolve) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      this.synthesis.speak(utterance);
    });
  }

  isSupported(): boolean {
    return this.recognition !== null && 'speechSynthesis' in window;
  }
}

export const voiceHandler = new VoiceCommandHandler();
