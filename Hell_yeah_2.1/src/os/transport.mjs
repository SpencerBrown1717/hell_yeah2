import { OSError, requireValue } from "./contracts.mjs";
export async function readLimitedText(request, limit = 65536) {
  const declared = Number(request.headers.get("content-length"));
  requireValue(
    !Number.isFinite(declared) || declared <= limit,
    "PAYLOAD_LIMIT",
    "The request exceeds 64 KB.",
    413,
  );
  if (!request.body) return "";
  const reader = request.body.getReader(),
    decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0,
    text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new OSError("PAYLOAD_LIMIT", "The request exceeds 64 KB.", 413);
      }
      try {
        text += decoder.decode(value, { stream: true });
      } catch {
        throw new OSError("INVALID_JSON", "JSON must use valid UTF-8.");
      }
    }
    try {
      return text + decoder.decode();
    } catch {
      throw new OSError("INVALID_JSON", "JSON must use valid UTF-8.");
    }
  } finally {
    reader.releaseLock();
  }
}
