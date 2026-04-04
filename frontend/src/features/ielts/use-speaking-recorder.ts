"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseSpeakingRecorderOptions = {
  language?: string;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function getPreferredMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}

export function useSpeakingRecorder({
  language = "en-US",
}: UseSpeakingRecorderOptions = {}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [detectedTranscript, setDetectedTranscript] = useState("");

  const supportsRecording = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    []
  );

  const supportsSpeechRecognition = useMemo(
    () => Boolean(getSpeechRecognitionConstructor()),
    []
  );

  const cleanupStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setDetectedTranscript("");
    transcriptRef.current = "";
    setError(null);
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    cleanupRecognition();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupStream();
      setIsRecording(false);
      setIsStarting(false);
    }
  }, [cleanupRecognition, cleanupStream]);

  const startRecording = useCallback(async () => {
    if (!supportsRecording || isRecording || isStarting) {
      return;
    }

    setError(null);
    setIsStarting(true);
    transcriptRef.current = "";
    setDetectedTranscript("");

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getPreferredMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        cleanupStream();
        setIsRecording(false);
        setIsStarting(false);

        if (blob.size > 0) {
          const nextUrl = URL.createObjectURL(blob);
          setAudioUrl(nextUrl);
        }
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        cleanupStream();
        setIsRecording(false);
        setIsStarting(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsStarting(false);

      const RecognitionCtor = getSpeechRecognitionConstructor();
      if (!RecognitionCtor) {
        return;
      }

      const recognition = new RecognitionCtor();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript?.trim();
          if (!transcript) {
            continue;
          }

          if (event.results[index].isFinal) {
            finalTranscript += `${transcript} `;
          } else {
            interimTranscript += `${transcript} `;
          }
        }

        if (finalTranscript.trim()) {
          transcriptRef.current = `${transcriptRef.current} ${finalTranscript}`.trim();
        }

        const nextTranscript = `${transcriptRef.current} ${interimTranscript}`.trim();
        setDetectedTranscript(nextTranscript);
      };
      recognition.onerror = (event) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        setError("Audio was recorded, but live transcript is unavailable in this browser.");
      };
      recognition.onend = () => {
        recognitionRef.current = null;
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      cleanupStream();
      setIsRecording(false);
      setIsStarting(false);
      setError("Microphone access was blocked. Allow microphone access and try again.");
    }
  }, [audioUrl, cleanupStream, isRecording, isStarting, language, supportsRecording]);

  useEffect(() => {
    return () => {
      cleanupRecognition();
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      cleanupStream();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl, cleanupRecognition, cleanupStream]);

  return {
    audioUrl,
    clearRecording,
    detectedTranscript,
    error,
    isRecording,
    isStarting,
    startRecording,
    stopRecording,
    supportsRecording,
    supportsSpeechRecognition,
  };
}
