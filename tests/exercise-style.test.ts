import { describe, expect, it } from "vitest";
import { exerciseFramePrompt } from "@/lib/exercise-style";

const ex = { name: "Rosca direta", muscleGroup: "biceps", equipment: "barra" };

describe("exerciseFramePrompt", () => {
  it("pede um único personagem, câmera da foto e o músculo certo", () => {
    const p = exerciseFramePrompt(ex, { sex: "MALE", frame: 0, hasStyleRef: false });
    expect(p).toContain("Exactly ONE human figure");
    expect(p).toContain("identical to the POSE PHOTO");
    expect(p).toContain("START position");
    expect(p).toContain("biceps");
    expect(p).toContain("MALE build");
    expect(p).not.toContain("STYLE REFERENCE");
  });

  it("versão feminina, posição final e imagem-mestre", () => {
    const p = exerciseFramePrompt(ex, { sex: "FEMALE", frame: 1, hasStyleRef: true });
    expect(p).toContain("END position");
    expect(p).toContain("FEMALE build");
    expect(p).toContain("STYLE REFERENCE");
  });
});
