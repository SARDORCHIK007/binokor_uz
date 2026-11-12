"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

const SPEECH: Record<string, string> = { "uz-Latn": "uz", "uz-Cyrl": "uz", ru: "ru", en: "en" };

const BTN =
  "grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-100 text-sm font-extrabold text-navy-900 transition hover:border-primary hover:text-primary";

/** Read-aloud for people who find long pages hard to read. */
export function AccessTools() {
  const t = useTranslations("access");
  const locale = useLocale();
  const [speaking, setSpeaking] = useState(false);
  const [note, setNote] = useState("");
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) {
      setNote(t("unsupported"));
      return;
    }
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const prefix = SPEECH[locale] ?? "uz";
    const voices = synth.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith(prefix));
    if (!voice && voices.length > 0) {
      setNote(t("noVoice"));
      return;
    }
    setNote("");
    const main = document.getElementById("asosiy");
    const text = (main?.innerText ?? "").replace(/\s+/g, " ").trim();
    const chunks = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
    setSpeaking(true);
    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = voice?.lang ?? prefix;
      if (voice) utterance.voice = voice;
      if (index === chunks.length - 1) {
        utterance.onend = () => alive.current && setSpeaking(false);
      }
      utterance.onerror = () => alive.current && setSpeaking(false);
      synth.speak(utterance);
    });
  }

  return (
    <>
      <button type="button" onClick={toggleSpeech} aria-pressed={speaking} aria-label={speaking ? t("stop") : t("listen")} title={speaking ? t("stop") : t("listen")} className={`${BTN} hidden sm:grid ${speaking ? "border-primary text-primary" : ""}`}>
        <span aria-hidden="true">{speaking ? "■" : "🔊"}</span>
      </button>
      {note ? (
        <p role="status" className="fixed top-20 right-4 z-50 max-w-xs rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white shadow-sh3">
          {note}
          <button type="button" className="ml-3 underline" onClick={() => setNote("")}>
            OK
          </button>
        </p>
      ) : null}
    </>
  );
}
