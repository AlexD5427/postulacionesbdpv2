'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Thin wrapper around the Web Speech API (SpeechSynthesis) for the "read aloud"
 * accessibility aid. Fully client-side, no network. Gracefully reports lack of
 * support so the UI can hide/disable the control.
 */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setSupported(true);
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string, lang = 'es-ES') => {
      const synth = synthRef.current;
      if (!synth || !text.trim()) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 20_000));
      utterance.lang = lang;
      utterance.rate = 1;
      utterance.pitch = 1;
      const voices = synth.getVoices();
      const match =
        voices.find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2))) ?? undefined;
      if (match) utterance.voice = match;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(utterance);
    },
    [],
  );

  return { supported, speaking, speak, stop };
}

/** Best-effort BCP-47 tag for the SpeechSynthesis voice, per app locale. */
export function speechLangFor(locale: string): string {
  switch (locale) {
    case 'en':
      return 'en-US';
    // Quechua/Aymara rarely have TTS voices; fall back to Spanish phonetics.
    case 'qu':
    case 'ay':
    case 'es':
    default:
      return 'es-ES';
  }
}
