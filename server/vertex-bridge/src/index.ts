import express from "express";
import cors from "cors";
import { VertexAI } from "@google-cloud/vertexai";

const PORT = process.env.PORT || 8080;
const PROJECT = process.env.GCP_PROJECT;
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const MODEL = process.env.VERTEX_MODEL || "gemini-1.5-flash-001";

if (!PROJECT) {
  throw new Error("Missing env GCP_PROJECT (set in Cloud Run or local ADC env)");
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "25mb" }));

const vertex = new VertexAI({ project: PROJECT, location: LOCATION });

app.get("/healthz", (req, res) => {
  res.json({ ok: true, project: PROJECT, location: LOCATION, model: MODEL });
});

app.post("/generate", async (req, res) => {
  try {
    const { contents, config } = req.body || {};
    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ ok: false, error: "contents[] is required" });
    }
    const modelName = (config?.model || MODEL) as string;
    const model = vertex.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({
      contents,
      generationConfig: config?.generationConfig,
    });
    const resp = await result.response;
    res.json({ ok: true, candidates: resp.candidates ?? [], usageMetadata: resp.usageMetadata ?? null });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`vertex-bridge listening on :${PORT}`);
});
