export interface SpeechRecognitionAlternative {
  transcript: string;
}

export interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}

export interface SpeechRecognitionEvent {
  readonly results: ArrayLike<SpeechRecognitionResult>;
}

export interface SpeechRecognitionErrorEvent {
  readonly error?: string;
}

export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}
