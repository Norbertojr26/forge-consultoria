import { muscleLabel } from "@/lib/exercises";

const MUSCLE_EN: Record<string, string> = {
  peito: "chest (pectorals)",
  costas: "back (lats and mid-back)",
  ombros: "shoulders (deltoids)",
  biceps: "biceps",
  triceps: "triceps",
  antebraco: "forearms",
  quadriceps: "quadriceps",
  posterior: "hamstrings",
  gluteos: "glutes",
  panturrilha: "calves",
  abdomen: "abdominals",
  cardio: "legs and cardiovascular system",
};

/**
 * Prompt-padrão das imagens de exercício FORGE. As fotos reais (posição inicial e final)
 * vão como referência: a IA copia a pose e troca só o estilo, para manter a anatomia correta.
 */
export function exerciseImagePrompt(ex: { name: string; muscleGroup: string; equipment: string | null }) {
  const muscle = MUSCLE_EN[ex.muscleGroup] ?? muscleLabel(ex.muscleGroup);
  return [
    `Create one fitness instruction image for the exercise "${ex.name}"${ex.equipment ? ` (equipment: ${ex.equipment})` : ""}.`,
    "The attached photos show the real start and end positions. Copy EXACTLY the body pose, grip, joint angles, stance, bench/equipment position and range of motion from them — anatomical accuracy matters more than anything else.",
    "Style: high-end 3D render. A smooth matte light-gray anatomical mannequin figure (athletic build, no facial features, no clothing details except plain dark shorts), on a dark charcoal studio background with a soft vignette and subtle floor reflection. Equipment rendered in dark brushed metal and black rubber.",
    `Highlight the primary working muscles — ${muscle} — in glowing orange (#FF5B14) with a soft emissive glow, like an anatomy overlay; the rest of the body stays gray.`,
    "Composition: show both phases side by side in a single landscape 4:3 image — start position on the left, end position on the right, same camera angle, figure centered in each half, generous margins.",
    "No text, no letters, no numbers, no logos, no watermark, no UI elements.",
  ].join("\n");
}
