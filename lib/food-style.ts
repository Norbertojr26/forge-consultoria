/**
 * Prompt-padrão das fotos de alimentos FORGE: sempre a mesma composição, luz e fundo,
 * para o banco inteiro parecer uma sessão de fotos só.
 */
export function foodImagePrompt(food: { name: string; category: string }, hasStyleRef: boolean) {
  const raw = /\bcru[as]?\b/i.test(food.name);
  return [
    `Professional food photograph of: "${food.name}" (Brazilian food composition table, category: ${food.category}). Interpret the Portuguese name precisely${raw ? " — it is RAW, show it uncooked" : ""}.`,
    "",
    "STRICT RULES:",
    "1. One single serving, centered, on a round matte black ceramic plate (liquids in a clear glass; powders, oils and sauces in a small black bowl).",
    "2. Camera at 45° above the plate, same distance every time, the plate fills ~70% of the frame.",
    "3. Background: plain dark charcoal (#121212) surface with soft vignette. Nothing else in the scene: no cutlery, no hands, no napkins, no other foods, no garnish that is not part of the food.",
    "4. Lighting: soft studio key light from the top left and a subtle warm orange rim light (#FF5B14) on the plate edge. Realistic, appetizing, high detail, natural colors.",
    "5. Square 1:1 image. No text, letters, logos, labels or watermark.",
    ...(hasStyleRef ? ["", "The STYLE REFERENCE shows the official FORGE food photo. Match its plate, angle, distance, background and lighting exactly — only the food changes."] : []),
  ].join("\n");
}
