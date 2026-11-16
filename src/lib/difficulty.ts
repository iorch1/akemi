/** Dificultad según edad del perfil (UI en español). */

export type DifficultyId = "facil" | "medio" | "dificil";

export function difficultyForAge(age: number): DifficultyId {
  if (age < 7) return "facil";
  if (age <= 8) return "medio";
  return "dificil";
}

export function difficultyLabel(id: DifficultyId): string {
  if (id === "facil") return "Fácil";
  if (id === "medio") return "Medio";
  return "Difícil";
}