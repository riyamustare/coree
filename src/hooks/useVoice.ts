import { useState, useCallback, useRef } from "react";

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string | null) => void) | null>(null);
  const finalTranscriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startListening = useCallback(async (): Promise<string | null> => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Web Speech API not supported");
      return null;
    }

    setIsListening(true);
    setLiveTranscript("");
    finalTranscriptRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      finalTranscriptRef.current = final;
      setLiveTranscript(final + interim);
    };

    recognition.onerror = () => {};
    recognition.start();

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const stopListening = useCallback(async () => {
    recognitionRef.current?.stop();
    setIsListening(false);

    // Give a small delay for final results to arrive
    await new Promise((r) => setTimeout(r, 300));

    const text = finalTranscriptRef.current || liveTranscript || null;
    setLiveTranscript(text || "");
    resolveRef.current?.(text);
  }, [liveTranscript]);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    try {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = "en-US";
        
        // Try to pick a nice voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes("Samantha") || v.name.includes("Google") || v.name.includes("Female"));
        if (preferred) utterance.voice = preferred;

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, liveTranscript, startListening, stopListening, speak, stopSpeaking };
}
