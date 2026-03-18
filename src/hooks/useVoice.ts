import { useState, useCallback, useRef } from "react";

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string | null) => void) | null>(null);
  const finalTranscriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

    // Small delay to capture final results
    await new Promise((r) => setTimeout(r, 200));

    const text = finalTranscriptRef.current || liveTranscript || null;
    setLiveTranscript(text || "");
    resolveRef.current?.(text);
  }, [liveTranscript]);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);

    // Abort any in-flight TTS request
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        console.error("TTS failed:", response.status);
        setIsSpeaking(false);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("TTS error:", err);
      }
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, liveTranscript, startListening, stopListening, speak, stopSpeaking };
}
