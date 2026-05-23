"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Loader2, ArrowLeft, Star, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakingPractice, type SpeakingResponse } from "@/features/learn/api";
import { PaywallModal } from "@/components/billing/paywall-modal";
import type { PaywallInfo } from "@/lib/billing/paywall";
import Link from "next/link";

type Message = {
  role: "user" | "ai" | "feedback";
  text: string;
  feedback?: SpeakingResponse;
};

const TOPICS = [
  { id: "part1-intro", label: "Part 1: Introduction", emoji: "👋", desc: "Personal questions about yourself" },
  { id: "part1-work", label: "Part 1: Work & Study", emoji: "💼", desc: "Questions about your job or studies" },
  { id: "part1-hobbies", label: "Part 1: Hobbies", emoji: "🎨", desc: "Talk about things you enjoy" },
  { id: "part2-describe", label: "Part 2: Cue Card", emoji: "🎯", desc: "Describe a topic for 2 minutes" },
  { id: "part3-discuss", label: "Part 3: Discussion", emoji: "🧠", desc: "In-depth discussion on abstract topics" },
  { id: "free", label: "Free Conversation", emoji: "💬", desc: "Practice natural English conversation" },
];

export function SpeakClient() {
  const [topic, setTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [context, setContext] = useState("");
  const [paywall, setPaywall] = useState<PaywallInfo | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start conversation when topic selected
  async function startConversation(topicId: string) {
    setTopic(topicId);
    setIsProcessing(true);
    try {
      const res = await speakingPractice({ transcript: "", topic: topicId, context: "" });
      if ("paywall" in res) {
        setPaywall(res.paywall);
        return;
      }
      const aiMsg = res.followUp || "Hello! Let's practice your English. Tell me about yourself.";
      setMessages([{ role: "ai", text: aiMsg }]);
      setContext(res.followUpContext || "");
      speak(aiMsg);
    } catch {
      setMessages([{ role: "ai", text: "Hello! Let's start our speaking practice. Tell me about yourself." }]);
    } finally {
      setIsProcessing(false);
    }
  }

  // Text-to-Speech — AI talks back
  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const english = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ||
                    voices.find(v => v.lang.startsWith("en-US")) ||
                    voices.find(v => v.lang.startsWith("en"));
    if (english) utterance.voice = english;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  // Speech Recognition — user talks
  function startRecording() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setTranscript("");
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }

  // Send transcript to AI for feedback
  async function sendTranscript() {
    const text = transcript.trim();
    if (!text) return;

    setMessages(prev => [...prev, { role: "user", text }]);
    setTranscript("");
    setIsProcessing(true);

    try {
      const res = await speakingPractice({
        transcript: text,
        topic: topic || "free",
        context,
      });

      if ("paywall" in res) {
        setPaywall(res.paywall);
        return;
      }

      // Add feedback
      setMessages(prev => [...prev, {
        role: "feedback",
        text: res.feedback,
        feedback: res,
      }]);

      // Add AI follow-up
      if (res.followUp) {
        setMessages(prev => [...prev, { role: "ai", text: res.followUp }]);
        speak(res.followUp);
      }

      setContext(res.followUpContext || context);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  }

  // ── Topic Selection ──
  if (!topic) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/learn/map" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Back to map
        </Link>
        <div className="text-center mb-8">
          <span className="text-5xl">🗣️</span>
          <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)]">Speaking Practice</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Practice IELTS Speaking with AI — speak naturally, get instant feedback on grammar, vocabulary, and fluency.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map(t => (
            <button
              key={t.id}
              onClick={() => startConversation(t.id)}
              className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-left transition-all hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)]"
            >
              <span className="text-2xl">{t.emoji}</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{t.label}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Conversation ──
  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col px-3 py-3 sm:h-[calc(100vh-8rem)] sm:px-4 sm:py-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => { setTopic(null); setMessages([]); window.speechSynthesis?.cancel(); }} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-4 w-4" /> Change topic
        </button>
        <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
          🗣️ Speaking Practice
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "ai" && (
              <div className="flex gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm">🤖</div>
                <div className="max-w-[85%] rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm text-[var(--text-primary)]">
                  {msg.text}
                  <button onClick={() => speak(msg.text)} className="ml-2 inline-flex text-[var(--text-muted)] hover:text-[var(--primary)]" title="Listen">
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="flex justify-end gap-2">
                <div className="max-w-[85%] rounded-2xl bg-[var(--primary)] px-4 py-2.5 text-sm text-white">
                  {msg.text}
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-sm">👤</div>
              </div>
            )}
            {msg.role === "feedback" && msg.feedback && (
              <div className="mx-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-600">📝 AI Feedback</span>
                  <span className="flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-xs font-bold text-[var(--primary)]">
                    <Star className="h-3 w-3 fill-current" /> {msg.feedback.score}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{msg.feedback.feedback}</p>
                {msg.feedback.corrected && (
                  <div className="mt-2 rounded-lg bg-emerald-500/10 p-2">
                    <p className="text-xs font-semibold text-emerald-600">✅ Corrected version:</p>
                    <p className="mt-0.5 text-sm text-emerald-700">{msg.feedback.corrected}</p>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.feedback.strengths?.map((s, j) => (
                    <span key={j} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                      <CheckCircle className="h-2.5 w-2.5" /> {s}
                    </span>
                  ))}
                  {msg.feedback.improvements?.map((s, j) => (
                    <span key={j} className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-600">
                      <TrendingUp className="h-2.5 w-2.5" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)]">🤖</div>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
              <span className="text-xs text-[var(--text-muted)]">Analyzing your response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live transcript */}
      {transcript && (
        <div className="mb-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-3 text-sm text-[var(--text-secondary)]">
          <span className="text-xs font-medium text-[var(--text-muted)]">🎤 Listening:</span> {transcript}
        </div>
      )}

      {/* Controls — safe area for mobile */}
      <div className="flex items-center gap-3 border-t border-[var(--border)] pt-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={isProcessing || isSpeaking}
            size="lg"
            className="flex-1 gap-2 rounded-xl min-h-[52px] text-base"
          >
            <Mic className="h-6 w-6" />
            {isSpeaking ? "AI is speaking..." : "Tap to Speak"}
          </Button>
        ) : (
          <div className="flex flex-1 gap-2">
            <Button
              onClick={stopRecording}
              variant="outline"
              size="lg"
              className="flex-1 gap-2 rounded-xl border-red-500 text-red-500"
            >
              <MicOff className="h-5 w-5" />
              Stop Recording
            </Button>
            <Button
              onClick={() => { stopRecording(); setTimeout(sendTranscript, 300); }}
              size="lg"
              className="gap-2 rounded-xl"
              disabled={!transcript.trim()}
            >
              Send ✓
            </Button>
          </div>
        )}
      </div>
      <PaywallModal paywall={paywall} onClose={() => setPaywall(null)} />
    </div>
  );
}
