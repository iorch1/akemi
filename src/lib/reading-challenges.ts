import type { DifficultyId } from "./difficulty";
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
  aprende: [
    { index: 0, prompt: "Une sílabas: «ca» + «sa»", correct: "casa" },
    { index: 1, prompt: "Une sílabas: «so» + «l»", correct: "sol" },
    { index: 2, prompt: "¿Qué palabra falta? «El ___ brilla»", correct: "sol" },
    { index: 3, prompt: "Ordena: «gato» «mi» «duerme»", correct: "Mi gato duerme" },
    { index: 4, prompt: "Completa: «Me gusta ___»", correct: "leer" },
  ],
  lectura: [
    { index: 0, prompt: "Lee en voz alta", correct: "El pato nada en el lago." },
    { index: 1, prompt: "Lee en voz alta", correct: "Ana tiene un libro azul." },
    { index: 2, prompt: "Lee en voz alta", correct: "Papá prepara una sopa rica." },
    { index: 3, prompt: "Lee en voz alta", correct: "Los pájaros cantan al amanecer." },
    { index: 4, prompt: "Lee en voz alta", correct: "Hoy hace sol y vamos al parque." },
  ],
};

const CHALLENGES_MEDIO: Record<ReadingLevelId, ReadingChallenge[]> = {
  letras: [
    { index: 0, prompt: "La letra de «zorro»", correct: "Z" },
    { index: 1, prompt: "La letra de «jirafa»", correct: "J" },
    { index: 2, prompt: "La letra de «ñandú»", correct: "Ñ" },
    { index: 3, prompt: "La letra de «tren»", correct: "T" },
    { index: 4, prompt: "La letra de «queso»", correct: "Q" },
  ],
  silabas: [
    { index: 0, prompt: "Sílaba «bra»", correct: "bra" },
    { index: 1, prompt: "Sílaba «tri»", correct: "tri" },
    { index: 2, prompt: "Sílaba «gro»", correct: "gro" },
    { index: 3, prompt: "Sílaba «clu»", correct: "clu" },
    { index: 4, prompt: "Sílaba «pre»", correct: "pre" },
  ],
  palabras: [
    { index: 0, prompt: "Felino doméstico", correct: "gato" },
    { index: 1, prompt: "Ave que vuela de noche", correct: "búho" },
    { index: 2, prompt: "Lugar para estudiar", correct: "escuela" },
    { index: 3, prompt: "Fruta amarilla", correct: "plátano" },
    { index: 4, prompt: "Medio de transporte", correct: "tren" },
  ],
  frases: [
    { index: 0, prompt: "Frase con escuela", correct: "Voy a la escuela" },
    { index: 1, prompt: "Frase con mar", correct: "Juego en el mar" },
    { index: 2, prompt: "Frase con libro", correct: "Leo un libro rojo" },
    { index: 3, prompt: "Frase con amigo", correct: "Mi amigo corre" },
    { index: 4, prompt: "Frase con lluvia", correct: "Llueve en abril" },
  ],
  aprende: [
    { index: 0, prompt: "Une: «ban» + «de» + «ra»", correct: "bandera" },
    { index: 1, prompt: "¿Falta «luna» o «sol»? «La ___ está alta»", correct: "luna" },
    { index: 2, prompt: "Construye: «perro» + «el» + «corre»", correct: "El perro corre" },
    { index: 3, prompt: "Rima: palabra con «mar»", correct: "par" },
    { index: 4, prompt: "Completa: «María ___ un cuento»", correct: "lee" },
  ],
  lectura: [
    { index: 0, prompt: "Lee en voz alta", correct: "En verano viajamos a la playa con la familia." },
    { index: 1, prompt: "Lee en voz alta", correct: "El niño construye un castillo con bloques de colores." },
    { index: 2, prompt: "Lee en voz alta", correct: "Por la mañana desayunamos fruta y pan con miel." },
    { index: 3, prompt: "Lee en voz alta", correct: "La maestra escribe una poesía en la pizarra grande." },
    { index: 4, prompt: "Lee en voz alta", correct: "Cuando llueve, leemos cuentos bajo una manta suave." },
  ],
};

const CHALLENGES_DIFICIL: Record<ReadingLevelId, ReadingChallenge[]> = {
  letras: [
    { index: 0, prompt: "Primera de «xilófono»", correct: "X" },
    { index: 1, prompt: "Primera de «hierba»", correct: "H" },
    { index: 2, prompt: "Primera de «waffle»", correct: "W" },
    { index: 3, prompt: "Primera de «yogur»", correct: "Y" },
    { index: 4, prompt: "Primera de «zapato»", correct: "Z" },
  ],
  silabas: [
    { index: 0, prompt: "Sílaba «cris»", correct: "cris" },
    { index: 1, prompt: "Sílaba «plu»", correct: "plu" },
    { index: 2, prompt: "Sílaba «tro»", correct: "tro" },
    { index: 3, prompt: "Sílaba «fre»", correct: "fre" },
    { index: 4, prompt: "Sílaba «gri»", correct: "gri" },
  ],
  palabras: [
    { index: 0, prompt: "Animal acuático grande", correct: "ballena" },
    { index: 1, prompt: "Instrumento de cuerda", correct: "guitarra" },
    { index: 2, prompt: "Planeta rojo", correct: "marte" },
    { index: 3, prompt: "Profesional de salud", correct: "médico" },
    { index: 4, prompt: "Edificio con libros", correct: "biblioteca" },
  ],
  frases: [
    { index: 0, prompt: "Frase más larga", correct: "El tren llega muy tarde" },
    { index: 1, prompt: "Frase con dos verbos", correct: "Leo y escribo cartas" },
    { index: 2, prompt: "Frase con lugar", correct: "Nadamos en la piscina" },
    { index: 3, prompt: "Frase con clima", correct: "Hace frío en invierno" },
    { index: 4, prompt: "Frase con familia", correct: "Mi hermana canta bien" },
  ],
  aprende: [
    { index: 0, prompt: "Sinónimo sencillo de «rápido»", correct: "veloz" },
    { index: 1, prompt: "Antónimo de «grande»", correct: "pequeño" },
    { index: 2, prompt: "Ordena: «noche» «buenas» «hijas» «mis»", correct: "Buenas noches hijas" },
    { index: 3, prompt: "Palabra compuesta: «arco» + «iris»", correct: "arcoíris" },
    { index: 4, prompt: "Completa: «El océano es muy ___»", correct: "profundo" },
  ],
  lectura: [
    { index: 0, prompt: "Lee en voz alta", correct: "Los científicos observan las estrellas con un telescopio especial." },
    { index: 1, prompt: "Lee en voz alta", correct: "Durante el invierno, algunos animales hibernan en madrigueras." },
    { index: 2, prompt: "Lee en voz alta", correct: "Mi abuela cocina empanadas y nos cuenta historias antiguas." },
    { index: 3, prompt: "Lee en voz alta", correct: "Reciclamos papel y plástico para cuidar nuestro planeta." },
    { index: 4, prompt: "Lee en voz alta", correct: "El equipo ganó el partido después de mucho entrenamiento." },
  ],
};

export function challengesFor(level: ReadingLevelId, difficulty: DifficultyId = "facil"): ReadingChallenge[] {
  const bank =
    difficulty === "dificil" ? CHALLENGES_DIFICIL : difficulty === "medio" ? CHALLENGES_MEDIO : CHALLENGES;
  return bank[level] ?? CHALLENGES[level] ?? [];
}

export function distractorsFor(level: ReadingLevelId, correct: string): string[] {
  const pool =
    level === "letras"
      ? LETTERS
      : level === "silabas"
        ? ["ma", "me", "mi", "mo", "mu", "pa", "pe", "pi", "lo", "la", "sa", "so", "lu"]
        : level === "palabras"
          ? ["sol", "luna", "casa", "gato", "agua", "flor", "rojo", "azul", "pan", "nube"]
          : level === "aprende"
            ? ["casa", "sol", "leer", "luna", "gato", "veloz", "pequeño", "par", "lee"]
            : level === "lectura"
              ? [correct]
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