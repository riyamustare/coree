import assert from "node:assert/strict";

const supabaseUrl = process.env.STAGING_SUPABASE_URL?.replace(/\/+$/, "");
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY;
const audioFixture = process.env.STAGING_SMOKE_AUDIO_BASE64;
const timeoutMs = Number(process.env.STAGING_SMOKE_TIMEOUT_MS ?? 20000);

assert.ok(supabaseUrl, "STAGING_SUPABASE_URL must be configured");
assert.ok(anonKey, "STAGING_SUPABASE_ANON_KEY must be configured");
assert.ok(
  Number.isFinite(timeoutMs) && timeoutMs > 0,
  "Smoke timeout must be positive",
);

async function invokeFunction(name, body, expectedContentType) {
  const startedAt = performance.now();
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const latencyMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    const errorBody = await response.text();
    assert.fail(`${name} returned HTTP ${response.status}: ${errorBody}`);
  }
  assert.match(
    response.headers.get("content-type") ?? "",
    expectedContentType,
    `${name} returned an unexpected content type`,
  );
  assert.ok(
    latencyMs <= timeoutMs,
    `${name} exceeded the ${timeoutMs}ms timeout`,
  );
  console.log(`PASS ${name} responded in ${latencyMs}ms`);
  return response;
}

let prompt = "I've had a stressful day and could use someone to listen.";
if (audioFixture) {
  const transcriptionResponse = await invokeFunction(
    "speech-to-text",
    { audio: audioFixture, mimeType: "audio/wav" },
    /application\/json/i,
  );
  const transcription = await transcriptionResponse.json();
  assert.equal(
    typeof transcription.text,
    "string",
    "speech-to-text must return text",
  );
  if (transcription.text.trim()) prompt = transcription.text.trim();
  console.log("PASS speech-to-text returned a transcript field");
} else {
  console.log(
    "SKIP speech-to-text; set STAGING_SMOKE_AUDIO_BASE64 to enable the voice round trip",
  );
}

const chatResponse = await invokeFunction(
  "chat",
  { message: prompt, contextMessages: [], genzMode: false },
  /application\/json/i,
);
const chatResult = await chatResponse.json();
assert.equal(typeof chatResult.text, "string", "chat must return a text field");
assert.ok(chatResult.text.trim().length > 0, "chat response must not be empty");
assert.ok(
  chatResult.text.length <= 4000,
  "chat response exceeded the smoke-test length limit",
);
console.log("PASS chat returned a non-empty response within the length limit");

const ttsResponse = await invokeFunction(
  "text-to-speech",
  { text: chatResult.text },
  /audio\/mpeg/i,
);
const audio = Buffer.from(await ttsResponse.arrayBuffer());
assert.ok(
  audio.byteLength > 1024,
  "text-to-speech audio was unexpectedly small",
);
assert.ok(
  audio.subarray(0, 3).toString("ascii") === "ID3" ||
    (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0),
  "text-to-speech response does not look like MP3 audio",
);
console.log(
  `PASS text-to-speech returned ${audio.byteLength} bytes of MP3 audio`,
);
