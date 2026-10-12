import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Check-in envia até 2 fotos (comprimidas no cliente, máx. 4 MB cada).
    // Fica abaixo do limite de 10 MB que o middleware aplica ao corpo da requisição.
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;
