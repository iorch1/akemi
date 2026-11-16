export type SpeakMode = "letter" | "syllable" | "word" | "phrase" | "feedback";

export type SpeakOptions = {
  mode?: SpeakMode;
  rate?: number;
  pitch?: number;
};

const MODE_DEFAULTS: Record<
  SpeakMode,
  { rate: number; pitch: number; lang: string }
> = {
  letter: { rate: 0.72, pitch: 0.94, lang: "es-MX" },
  syllable: { rate: 0.78, pitch: 0.95, lang: "es-MX" },
  word: { rate: 0.83, pitch: 0.96, lang: "es-MX" },
  phrase: { rate: 0.86, pitch: 0.97, lang: "es-MX" },
  feedback: { rate: 0.88, pitch: 0.98, lang: "es-MX" },
};

let cachedVoice: SpeechSynthesisVoice | undefined;

function scoreSpanishVoice(voice: SpeechSynthesisVoice): number {
  let score = 0;
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();

  if (lang === "es-mx" || lang === "es-es") score += 50;
  else if (lang.startsWith("es-mx") || lang.startsWith("es-es")) score += 35;
  else if (lang.startsWith("es")) score += 20;

  if (
    /google|natural|neural|premium|enhanced|online|wavenet/.test(name)
  ) {
    score += 28;
  }
  if (/paulina|helena|mónica|monica|laura|jorge|españa|méxico|mexico/.test(name)) {
    score += 18;
  }
  if (voice.localService) score += 6;
  if (/default|synthetic|espeak|compact|robot/.test(name)) score -= 30;

  return score;
}

function pickSpanishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  const spanish = voices.filter((v) =>
    v.lang.toLowerCase().startsWith("es"),
  );
  if (!spanish.length) return undefined;

  return [...spanish].sort(
    (a, b) => scoreSpanishVoice(b) - scoreSpanishVoice(a),
  )[0];
}

function resolveVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return cachedVoice;

  const best = pickSpanishVoice(voices);
  if (best && best !== cachedVoice) cachedVoice = best;
  return cachedVoice ?? best;
}

/** Letras sueltas: “letra A” para que el motor no las confunda con iniciales de palabra. */
export function readingTextForLetter(letter: string): string {
  return `letra ${letter}`;
}

export function speak(text: string, options?: number | SpeakOptions) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const opts: SpeakOptions =
    typeof options === "number" ? { rate: options } : (options ?? {});
  const mode = opts.mode ?? "feedback";
  const defaults = MODE_DEFAULTS[mode];

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = defaults.lang;
  utter.rate = opts.rate ?? defaults.rate;
  utter.pitch = opts.pitch ?? defaults.pitch;

  const voice = resolveVoice();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang;
  }

  window.speechSynthesis.speak(utter);
}

export function preloadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  resolveVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
    resolveVoice();
  };
}