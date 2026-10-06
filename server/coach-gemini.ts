import type { InvokeParams, InvokeResult } from "./_core/llm";

export async function invokeCoachLLM(params: InvokeParams): Promise<InvokeResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is not configured on the backend");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
        messages: params.messages,
        reasoning_effort: "low",
        max_tokens: 2048,
      }),
    },
  );

  if (!response.ok) {
    console.error("[Coach Gemini] HTTP", response.status);
    if (response.status === 429) {
      throw new Error("Gemini usage limit reached. Please try again later.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gemini key was rejected. Check the Railway key and Google API permissions.");
    }
    throw new Error(`Gemini request failed (HTTP ${response.status}).`);
  }

  const result = await response.json() as InvokeResult;
  const content = result.choices?.[0]?.message?.content;
  if (!content || (typeof content === "string" && !content.trim())) {
    throw new Error("Gemini returned no answer. Please try again.");
  }
  return result;
}