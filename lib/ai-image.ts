import "server-only";

/**
 * Geração de imagem via OpenRouter (API compatível com chat completions, saída em imagem).
 * Variáveis: OPENROUTER_API_KEY (obrigatória), OPENROUTER_IMAGE_MODEL (opcional),
 * OPENROUTER_BASE_URL (opcional, usada em testes).
 */
const DEFAULT_MODEL = "google/gemini-3.1-flash-image"; // Nano Banana 2

export class ImageGenError extends Error {}

export function imageGenConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export type ImagePart = { text: string } | { image: { bytes: Uint8Array; mime: string } };

/** Gera uma imagem a partir de partes intercaladas (texto e imagens de referência, na ordem). */
export async function generateImage({ parts, aspectRatio }: { parts: ImagePart[]; aspectRatio?: string }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new ImageGenError("Geração de imagem não configurada (defina OPENROUTER_API_KEY no Railway)");
  const base = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  const content = parts.map((p) =>
    "text" in p
      ? { type: "text", text: p.text }
      : { type: "image_url", image_url: { url: `data:${p.image.mime};base64,${Buffer.from(p.image.bytes).toString("base64")}` } },
  );

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "X-Title": "FORGE Consultoria",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_MODEL,
      modalities: ["image", "text"],
      messages: [{ role: "user", content }],
      ...(aspectRatio && { image_config: { aspect_ratio: aspectRatio } }),
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("OpenRouter erro", res.status, detail.slice(0, 500));
    throw new ImageGenError(
      res.status === 401 ? "Chave do OpenRouter inválida" : res.status === 402 ? "Sem créditos no OpenRouter" : `OpenRouter respondeu ${res.status}`,
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const match = url?.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
  if (!match) throw new ImageGenError("O modelo não retornou uma imagem. Tente de novo ou troque OPENROUTER_IMAGE_MODEL.");
  return { mime: match[1], bytes: new Uint8Array(Buffer.from(match[2], "base64")) };
}
