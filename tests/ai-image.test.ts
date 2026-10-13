import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { generateImage, ImageGenError } = await import("@/lib/ai-image");

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe("generateImage (OpenRouter)", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    vi.stubEnv("OPENROUTER_BASE_URL", "http://mock/api/v1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia prompt + referências e decodifica a imagem", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${PNG.toString("base64")}` } }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateImage({ prompt: "p", references: [{ bytes: new Uint8Array([1, 2]), mime: "image/jpeg" }] });
    expect(out.mime).toBe("image/png");
    expect(Buffer.from(out.bytes).equals(PNG)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://mock/api/v1/chat/completions");
    const body = JSON.parse(init.body as string);
    expect(body.modalities).toEqual(["image", "text"]);
    expect(body.messages[0].content[1].image_url.url).toBe("data:image/jpeg;base64,AQI=");
  });

  it("traduz erros de crédito e resposta sem imagem", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 402 })));
    await expect(generateImage({ prompt: "p" })).rejects.toThrow("Sem créditos");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ choices: [{ message: { content: "desculpe" } }] })));
    await expect(generateImage({ prompt: "p" })).rejects.toBeInstanceOf(ImageGenError);
  });

  it("sem chave não chama a API", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateImage({ prompt: "p" })).rejects.toThrow("OPENROUTER_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
