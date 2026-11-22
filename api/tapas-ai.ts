type AgentAction = { type: "list_directory" | "create_folder" | "create_file" | "open_folder"; path?: string };
type AgentReply = { message: string; actions: AgentAction[] };

type RequestLike = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } };
type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

const allowedTypes = new Set(["list_directory", "create_folder", "create_file", "open_folder"]);
const requestBuckets = new Map<string, { startedAt: number; count: number }>();
function isRateLimited(req: RequestLike) {
  const forwarded = req.headers?.["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim()
    || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  if (requestBuckets.size > 1000) {
    for (const [key, bucket] of requestBuckets) {
      if (now - bucket.startedAt >= 60_000) requestBuckets.delete(key);
    }
  }
  const current = requestBuckets.get(ip);
  if (!current || now - current.startedAt >= 60_000) {
    requestBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > 12;
}
function validRelativePath(value: unknown, allowEmpty: boolean): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  if (value === "") return allowEmpty;
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0")) return false;
  return value.split("/").every((part) => part !== "." && part !== ".." && part.trim().length > 0);
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (isRateLimited(req)) return res.status(429).json({ error: "Too many TAPAS AI requests. Please wait a minute and try again." });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "TAPAS AI is not configured. Add GROQ_API_KEY to the Vercel environment variables." });

  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const context = typeof body.context === "string" ? body.context.slice(0, 2000) : "";
  if (!prompt || prompt.length > 6000) return res.status(400).json({ error: "Enter a message under 6,000 characters." });

  const system = `You are TAPAS AI for the TAPAS OS WEB DEMO. Return ONLY JSON: {"message":"...","actions":[]}. Allowed actions: {"type":"list_directory","path":"relative path inside TAPAS Workspace; empty means workspace root"}, {"type":"create_folder","path":"relative path inside TAPAS Workspace"}, {"type":"create_file","path":"relative path inside TAPAS Workspace"}, {"type":"open_folder","path":"relative path inside TAPAS Workspace"}. Never suggest shell commands, arbitrary code, deleting, moving, reading file contents, network downloads, payments, passwords, opening native apps, or actions outside this allowlist. Never claim an action completed before the app executes it. File creation requires user approval. Do not claim access to the user's computer filesystem. If unsupported, return actions:[].`;

  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Request: ${prompt}\nContext: ${context}` },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 300);
      return res.status(502).json({ error: `Groq returned ${upstream.status}: ${detail}` });
    }
    const data = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ error: "Groq returned an empty response." });
    const parsed = JSON.parse(content) as Partial<AgentReply>;
    if (typeof parsed.message !== "string" || !Array.isArray(parsed.actions)) {
      return res.status(502).json({ error: "TAPAS AI returned an invalid plan." });
    }
    const actions: AgentAction[] = [];
    for (const raw of parsed.actions) {
      if (!raw || typeof raw !== "object" || !allowedTypes.has(String((raw as AgentAction).type))) {
        return res.status(502).json({ error: "TAPAS AI returned an unsupported action; it was blocked." });
      }
      const action = raw as AgentAction;
      const emptyAllowed = action.type === "list_directory" || action.type === "open_folder";
      if (!validRelativePath(action.path ?? (emptyAllowed ? "" : undefined), emptyAllowed)) {
        return res.status(502).json({ error: "TAPAS AI returned an invalid workspace path; it was blocked." });
      }
      actions.push({ type: action.type, path: action.path ?? "" });
    }
    return res.status(200).json({ message: parsed.message.slice(0, 4000), actions });
  } catch (error) {
    return res.status(502).json({ error: error instanceof Error ? error.message : "TAPAS AI request failed." });
  }
}
