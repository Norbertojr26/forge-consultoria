import type { Sex } from "@prisma/client";
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
  cardio: "legs (quadriceps, hamstrings and calves)",
};

const BODY: Record<Sex, string> = {
  MALE: "an athletic MALE build (broad shoulders, defined muscles), wearing only plain dark charcoal shorts",
  FEMALE: "an athletic FEMALE build (feminine proportions, defined muscles), wearing plain dark charcoal shorts and a plain dark charcoal sports top",
};

export const SEX_LABEL: Record<Sex, string> = { MALE: "Masculino", FEMALE: "Feminino" };

/**
 * Prompt-padrão das imagens FORGE. Uma imagem por posição (inicial ou final): a foto real
 * daquela posição define pose e câmera; a imagem-mestre (se houver) define só o estilo.
 */
export function exerciseFramePrompt(
  ex: { name: string; muscleGroup: string; equipment: string | null },
  opts: { sex: Sex; frame: 0 | 1; hasStyleRef: boolean },
) {
  const muscle = MUSCLE_EN[ex.muscleGroup] ?? muscleLabel(ex.muscleGroup);
  const phase = opts.frame === 0 ? "START" : "END";
  return [
    `Redraw the POSE PHOTO as a FORGE fitness illustration of the ${phase} position of the exercise "${ex.name}"${ex.equipment ? ` (equipment: ${ex.equipment})` : ""}.`,
    "",
    "STRICT RULES — follow every one:",
    "1. Exactly ONE human figure in the image. Never duplicate, mirror, repeat or add people. Do not show the other phase of the movement. If the photo shows more than one person, keep only the one doing the exercise.",
    "2. Camera: identical to the POSE PHOTO — same viewpoint, same angle, same distance, same framing and crop. Do not rotate, turn the body, change perspective or re-compose the scene.",
    "3. Pose: identical to the POSE PHOTO — same body position, joint angles, grip, hand and foot placement, stance, head position and equipment position. Anatomical accuracy is the top priority.",
    `4. Replace the real person COMPLETELY with the FORGE mannequin: a smooth matte light-gray 3D figure with a featureless head (no face, no eyes, no mouth, no hair, no ears detail), ${BODY[opts.sex]}. No skin tones, no realistic human skin, no tattoos, no shoes detail beyond simple dark sneakers. Nothing of the original person may remain.`,
    "5. Replace the background COMPLETELY: remove the gym, walls, windows, mirrors, floor mats that are not needed, other machines and any other people. Use a plain dark charcoal (#121212) studio backdrop with a soft vignette and a subtle floor reflection. Keep ONLY the equipment used in the exercise (bench, bar, dumbbells, cable, handle, machine), restyled in dark brushed metal and black rubber.",
    `6. Muscles: the primary working muscles — ${muscle} — glow in orange (#FF5B14) on the mannequin's surface, with visible anatomical muscle-fiber definition and a soft emissive glow. Every other part of the body stays uniform matte gray.`,
    "7. No text, letters, numbers, logos, watermark, arrows or UI.",
    "8. Landscape 3:2 image, high-end 3D render, soft studio key light from the top left.",
    ...(opts.hasStyleRef
      ? [
          "",
          "The STYLE REFERENCE image shows the official FORGE mannequin. Match its material, gray tone, proportions, featureless head, lighting, background and orange glow exactly. Take NOTHING else from it: pose, camera angle and equipment come ONLY from the POSE PHOTO.",
        ]
      : []),
  ].join("\n");
}
