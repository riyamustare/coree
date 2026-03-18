import { useState, useCallback, useRef, useEffect } from "react";

// Cache the selected voice so it stays consistent across calls
let cachedVoice: SpeechSynthesisVoice | null = null;

function getPreferredVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Priority order for natural-sounding English voices
  const preferred = [
    "Samantha", "Karen", "Moira", "Tessa", // Apple
    "Google UK English Female", "Google US English",
    "Microsoft Zira", "Microsoft Jenny",
  ];

  for (const name of preferred) {
    const v = voices.find((voice) => voice.name.includes(name));
    if (v) { cachedVoice = v; return v; }
  }

  // Fallback: first English voice
  const english = voices.find((v) => v.lang.startsWith("en"));
  if (english) { cachedVoice = english; return english; }

  cachedVoice = voices[0];
  return cachedVoice;
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string | null) => void) | null>(null);
  const finalTranscriptRef = useRef("");

  // Pre-load voices on mount
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    // Voices may load async
    const loadVoices = () => getPreferredVoice();
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

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

    await new Promise((r) => setTimeout(r, 300));

    const text = finalTranscriptRef.current || liveTranscript || null;
    setLiveTranscript(text || "");
    resolveRef.current?.(text);
  }, [liveTranscript]);

  const speak = useCallback(async (text: string) => {
    if (!("speechSynthesis" in window)) return;
    setIsSpeaking(true);

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95; // Slightly slower for warmth
    utterance.pitch = 1.05; // Slightly higher for friendliness

    // Use the cached voice for consistency
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, liveTranscript, startListening, stopListening, speak, stopSpeaking };
}
