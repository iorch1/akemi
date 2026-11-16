import type { ReadingLevelId } from "./progress";

export type ReadingChallenge = {
  index: number;
  prompt: string;
  correct: string;
};

const LETTERS = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ".split("");

const CHALLENGES: Record<ReadingLevelId, ReadingChallenge[]> = {
  letras: [
    { index: 0, prompt: "La letra del sol", correct: "S" },
    { index: 1, prompt: "La letra de mamá", correct: "M" },
    { index: 2, prompt: "La letra del gato", correct: "G" },
    { index: 3, prompt: "La letra de luna", correct: "L" },
    { index: 4, prompt: "La letra de agua", correct: "A" },
  ],
  silabas: [
    { index: 0, prompt: "Sílaba «ma»", correct: "ma" },
    { index: 1, prompt: "Sílaba «mi»", correct: "mi" },
    { index: 2, prompt: "Sílaba «pa»", correct: "pa" },
    { index: 3, prompt: "Sílaba «lu»", correct: "lu" },
    { index: 4, prompt: "Sílaba «so»", correct: "so" },
  ],
  palabras: [
    { index: 0, prompt: "Palabra: astro", correct: "sol" },
    { index: 1, prompt: "Palabra: mascota que maúlla", correct: "gato" },
    { index: 2, prompt: "Palabra: donde vivimos", correct: "casa" },
    { index: 3, prompt: "Palabra: color del cielo", correct: "azul" },
    { index: 4, prompt: "Palabra: bebemos", correct: "agua" },
  ],
  frases: [
    { index: 0, prompt: "Frase corta", correct: "El sol brilla" },
    { index: 1, prompt: "Frase con gato", correct: "Mi gato duerme" },
    { index: 2, prompt: "Frase de afición", correct: "Me gusta leer" },
    { index: 3, prompt: "Frase de regreso", correct: "Voy a casa" },
    { index: 4, prompt: "Frase de noche", correct: "La luna sale" },
  ],
};

export function challengesFor(level: ReadingLevelId): ReadingChallenge[] {
  return CHALLENGES[level];
}

export function distractorsFor(level: ReadingLevelId, correct: string): string[] {
  const pool =
    level === "letras"
      ? LETTERS
      : level === "silabas"
        ? ["ma", "me", "mi", "mo", "mu", "pa", "pe", "pi", "lo", "la", "sa", "so", "lu"]
        : level === "palabras"
          ? ["sol", "luna", "casa", "gato", "agua", "flor", "rojo", "azul", "pan", "nube"]
          : [
              "El sol brilla",
              "Mi gato duerme",
              "Me gusta leer",
              "Voy a casa",
              "La luna sale",
              "Un pez nada",
              "Tengo un amigo",
            ];
  const opts = new Set<string>([correct]);
  while (opts.size < 4 && opts.size < pool.length) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick !== correct) opts.add(pick);
  }
  return Array.from(opts).sort(() => Math.random() - 0.5);
}