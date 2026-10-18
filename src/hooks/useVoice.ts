import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import {
  getSpeechRecognitionConstructor,
  type SpeechRecognitionInstance,
} from "@/lib/speechRecognition";
import { trackTtsPlayed, trackVoiceListenStart, trackVoiceListenStop, trackVoiceStageLatency } from "@/lib/analytics";

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finishListeningRef = useRef<
    ((text?: string | null) => void) | null
  >(null);
  const listeningAttemptRef = useRef(0);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const asrStartRef = useRef<number | null>(null);

  const startListening = useCallback((sessionId?: string): Promise<string | null> => {
    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Try Chrome or Safari for voice mode.",
        variant: "destructive",
      });
      return Promise.resolve(null);
    }

    if (finishListeningRef.current) {
      const previousRecognition = recognitionRef.current;
      finishListeningRef.current(null);
      try {
        previousRecognition?.stop();
      } catch (error) {
        console.error("Could not stop the previous speech recognition:", error);
      }
    }

    const attempt = ++listeningAttemptRef.current;
    sessionIdRef.current = sessionId ?? null;
    asrStartRef.current = performance.now();
    setIsListening(true);
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";

    return new Promise((resolve) => {
      let recognition: SpeechRecognitionInstance | null = null;
      let settled = false;
      const finish = (text?: string | null) => {
        if (settled) return;
        settled = true;
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        if (finishListeningRef.current === finish) {
          finishListeningRef.current = null;
        }
        if (listeningAttemptRef.current === attempt) {
          const transcript =
            text === undefined
              ? (
                  finalTranscriptRef.current +
                  " " +
                  interimTranscriptRef.current
                ).trim() || null
              : text;
          setLiveTranscript(transcript || "");
          setIsListening(false);
          const asrLatencyMs = asrStartRef.current
            ? Math.round(performance.now() - asrStartRef.current)
            : 0;
          trackVoiceStageLatency(
            "asr",
            asrLatencyMs,
            sessionIdRef.current,
            "voice",
          );
          resolve(transcript);
        } else {
          resolve(null);
        }
      };
      finishListeningRef.current = finish;

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;
      recognition.onresult = (event) => {
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
      recognition.onerror = (event) => {
        if (event?.error === "no-speech") {
          toast({
            title: "I didn't catch that",
            description:
              "Try speaking again, or switch to text and type your message.",
          });
          return;
        }
        if (event?.error === "aborted") return;

        console.error("SpeechRecognition error:", event?.error || event);
        if (
          event?.error === "not-allowed" ||
          event?.error === "service-not-allowed"
        ) {
          toast({
            title: "Microphone blocked",
            description: "Allow mic access in your browser and try again.",
            variant: "destructive",
          });
        } else if (event?.error === "audio-capture") {
          toast({
            title: "Microphone unavailable",
            description:
              "No usable microphone is available. Check your input device and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Voice input stopped",
            description:
              "Please check your microphone and try starting voice input again.",
            variant: "destructive",
          });
        }
        finish(null);
        try {
          recognition?.stop();
        } catch (error) {
          console.error("Could not stop failed speech recognition:", error);
        }
      };
      recognition.onend = () => finish();
      try {
        trackVoiceListenStart(sessionId);
        recognition.start();
      } catch (err) {
        console.error("SpeechRecognition start error:", err);
        toast({
          title: "Voice input unavailable",
          description: "Please check your microphone and try again.",
          variant: "destructive",
        });
        finish(null);
      }
    });
  }, []);

  const stopListening = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      listeningAttemptRef.current += 1;
      finishListeningRef.current?.(null);
      setIsListening(false);
      return;
    }

    try {
      trackVoiceListenStop(sessionIdRef.current ?? undefined);
      setIsListening(false);
      recognition.stop();
    } catch (err) {
      console.error("SpeechRecognition stop error:", err);
      finishListeningRef.current?.(null);
    }
  }, []);

  useEffect(
    () => () => {
      listeningAttemptRef.current += 1;
      try {
        recognitionRef.current?.stop();
      } catch (error) {
        console.error("SpeechRecognition cleanup failed:", error);
      }
      finishListeningRef.current?.(null);
    },
    [],
  );

  const speak = useCallback(async (text: string, sessionId?: string) => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrentRequest = () => abortRef.current === controller;
    const ttsStart = performance.now();
    setIsSpeaking(true);

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

      const ttsLatencyMs = Math.round(performance.now() - ttsStart);
      trackVoiceStageLatency("tts", ttsLatencyMs, sessionId ?? null, "voice");

      if (!response.ok) {
        console.error("TTS failed:", response.status);
        if (isCurrentRequest()) setIsSpeaking(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("TTS response did not include an audio stream");

      const createAudio = (url: string) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audioUrlRef.current = url;
        const releaseAudio = () => {
          if (audioRef.current !== audio) return;
          audioRef.current = null;
          if (audioUrlRef.current === url) audioUrlRef.current = null;
          URL.revokeObjectURL(url);
          if (isCurrentRequest()) setIsSpeaking(false);
        };
        audio.onended = releaseAudio;
        audio.onerror = releaseAudio;
        return audio;
      };

      if (
        typeof MediaSource !== "undefined" &&
        MediaSource.isTypeSupported("audio/mpeg")
      ) {
        const mediaSource = new MediaSource();
        const sourceOpen = new Promise<void>((resolve, reject) => {
          mediaSource.addEventListener("sourceopen", () => resolve(), {
            once: true,
          });
          mediaSource.addEventListener(
            "error",
            () => reject(new Error("Could not open the audio stream")),
            { once: true },
          );
        });
        const audioUrl = URL.createObjectURL(mediaSource);
        const audio = createAudio(audioUrl);
        await sourceOpen;
        if (!isCurrentRequest()) return;

        const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
        const appendChunk = (chunk: Uint8Array) =>
          new Promise<void>((resolve, reject) => {
            sourceBuffer.addEventListener("updateend", () => resolve(), {
              once: true,
            });
            sourceBuffer.addEventListener(
              "error",
              () => reject(new Error("Could not append an audio chunk")),
              { once: true },
            );
            try {
              sourceBuffer.appendBuffer(chunk);
            } catch (error) {
              reject(error);
            }
          });

        let playbackStarted = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!isCurrentRequest()) return;
          await appendChunk(value);
          if (!playbackStarted) {
            playbackStarted = true;
            trackTtsPlayed(sessionId ?? undefined, ttsLatencyMs);
            await audio.play();
          }
        }
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
      } else {
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!isCurrentRequest()) return;
          chunks.push(value);
        }
        const totalLength = chunks.reduce(
          (sum, chunk) => sum + chunk.byteLength,
          0,
        );
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const audio = createAudio(
          URL.createObjectURL(new Blob([combined], { type: "audio/mpeg" })),
        );
        trackTtsPlayed(sessionId ?? undefined, ttsLatencyMs);
        await audio.play();
      }
    } catch (err: unknown) {
      if (
        (!(err instanceof Error) || err.name !== "AbortError") &&
        isCurrentRequest()
      ) {
        console.error("TTS error:", err);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        setIsSpeaking(false);
      }
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, liveTranscript, startListening, stopListening, speak, stopSpeaking };
}
