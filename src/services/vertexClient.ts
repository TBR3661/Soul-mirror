export interface VertexBridgeConfig {
  baseUrl: string; // e.g., https://vertex-bridge-xxxx-uc.a.run.app
  model?: string;
}

export interface VertexPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  fileUri?: string;
}

export async function vertexGenerate(opts: {
  cfg: VertexBridgeConfig;
  parts: VertexPart[];
  generationConfig?: Record<string, any>;
}) {
  const contents = [
    { role: "user", parts: opts.parts }
  ];
  const res = await fetch(`${opts.cfg.baseUrl}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, config: { model: opts.cfg.model, generationConfig: opts.generationConfig } })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`Vertex bridge error ${res.status}: ${text}`);
  }
  return res.json();
}
