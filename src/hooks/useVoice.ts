import { useState, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const resolveRef = useRef<((text: string | null) => void) | null>(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startListening = useCallback(async (): Promise<string | null> => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Try Chrome or Safari for voice mode.",
        variant: "destructive",
      });
      return null;
    }

    // Pre-check mic permission so a denial surfaces a clear message.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (err: any) {
      console.error("Microphone permission denied:", err);
      toast({
        title: "Microphone blocked",
        description:
          "Allow mic access in your browser (click the lock icon in the address bar) and try again.",
        variant: "destructive",
      });
      return null;
    }

    setIsListening(true);
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";

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
      interimTranscriptRef.current = interim;
      setLiveTranscript(final + interim);
    };

    recognition.onerror = (e: any) => {
      console.error("SpeechRecognition error:", e?.error || e);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast({
          title: "Microphone blocked",
          description: "Allow mic access in your browser and try again.",
          variant: "destructive",
        });
      }
    };
    recognition.onend = () => {
      // Recognition ended (either by stop() or naturally). Resolve with whatever we captured.
      const text =
        (finalTranscriptRef.current + " " + interimTranscriptRef.current).trim() || null;
      setLiveTranscript(text || "");
      setIsListening(false);
      resolveRef.current?.(text);
      resolveRef.current = null;
    };
    try {
      recognition.start();
    } catch (err) {
      console.error("SpeechRecognition start error:", err);
      setIsListening(false);
      return null;
    }

    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const stopListening = useCallback(async () => {
    // Just stop - onend will resolve the promise with the final+interim text.
    try {
      recognitionRef.current?.stop();
    } catch (err) {
      console.error("SpeechRecognition stop error:", err);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);

    // Abort any in-flight request
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

      // Start playback as soon as we have enough data using MediaSource
      const reader = response.body?.getReader();
      if (!reader) { setIsSpeaking(false); return; }

      // Collect first chunk quickly, then start playback
      const chunks: Uint8Array[] = [];
      let firstChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) { setIsSpeaking(false); return; }
        chunks.push(value);
        
        // Start playback after first ~4KB to reduce time-to-first-audio
        if (!firstChunkReceived && chunks.reduce((s, c) => s + c.byteLength, 0) > 4096) {
          firstChunkReceived = true;
        }
      }

      const totalLength = chunks.reduce((sum, buf) => sum + buf.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const buf of chunks) {
        combined.set(buf, offset);
        offset += buf.byteLength;
      }

      const blob = new Blob([combined], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(blob);
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
