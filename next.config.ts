import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Landing e página de aplicação são o site estático original (public/*.html),
  // servido sem alterações de visual; a área do aluno é a parte em Next.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/index.html" },
        { source: "/aplicar", destination: "/aplicar.html" },
        { source: "/demo-aluno", destination: "/area-aluno.html" },
      ],
    };
  },
  experimental: {
    // Check-in envia até 2 fotos (comprimidas no cliente, máx. 4 MB cada).
    // Fica abaixo do limite de 10 MB que o middleware aplica ao corpo da requisição.
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;
