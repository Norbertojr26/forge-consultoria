export const MUSCLE_GROUPS = [
  { value: "peito", label: "Peito" },
  { value: "costas", label: "Costas" },
  { value: "ombros", label: "Ombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "antebraco", label: "Antebraço" },
  { value: "quadriceps", label: "Quadríceps" },
  { value: "posterior", label: "Posterior de coxa" },
  { value: "gluteos", label: "Glúteos" },
  { value: "panturrilha", label: "Panturrilha" },
  { value: "abdomen", label: "Abdômen" },
  { value: "cardio", label: "Cardio" },
] as const;

export const muscleLabel = (value: string) =>
  MUSCLE_GROUPS.find((m) => m.value === value)?.label ?? value;
