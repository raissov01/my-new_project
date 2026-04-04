declare global {
  interface BrowserSpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface BrowserSpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }

  interface BrowserSpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend:
      | ((this: BrowserSpeechRecognition, ev: Event) => unknown)
      | null;
    onerror:
      | ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionErrorEvent) => unknown)
      | null;
    onresult:
      | ((this: BrowserSpeechRecognition, ev: BrowserSpeechRecognitionEvent) => unknown)
      | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface BrowserSpeechRecognitionConstructor {
    new (): BrowserSpeechRecognition;
  }

  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

export {};
