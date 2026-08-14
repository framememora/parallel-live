import { resolveApiKey, resolveVisionModel } from '../../state/settingsStore';

/** One comment as returned by the model, before it's turned into a `GeneratedComment`. */
export interface VisionComment {
  author: string;
  text: string;
}

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/**
 * Enough room for the JSON batch plus a little slack. Deliberately tight: the
 * models that think need headroom for it, but at `effort: low` on a task this
 * small the thinking is brief, and a low cap makes a runaway response fail fast
 * rather than billing for tokens we'd discard. `max_tokens` is a ceiling, not a
 * charge, so this costs nothing when the response is well-behaved.
 */
const MAX_TOKENS = 1200;

/**
 * How many comments we ask for per frame. The scheduler drains them one at a
 * time at its own pace, so a batch covers the gap until the next capture
 * without needing a request per comment.
 */
const COMMENTS_PER_FRAME = 5;

const SYSTEM_PROMPT = `You write viewer comments for a livestream simulator app.

You are shown a still frame from the broadcaster's camera. Write short comments that a live audience would plausibly post while watching, reacting to what is actually visible — the setting, what the person appears to be doing, objects in shot, lighting, mood.

Rules:
- Each comment is one line, under 60 characters, lowercase-leaning and casual, the way people actually type in a live chat.
- Vary the tone across the batch: hype, deadpan, curious, a question, an emoji-only reaction.
- Invent a plausible handle for each commenter. Lowercase, may contain _ or digits.
- Never describe the image analytically ("the image shows..."), never mention that this is a simulation, and never use curly braces.
- If the frame is too dark or unclear to react to, write generic live-chat filler instead.
- Do not comment on the person's physical appearance or attractiveness.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    comments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          author: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['author', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['comments'],
  additionalProperties: false,
};

export class MissingApiKeyError extends Error {
  constructor() {
    super('No Anthropic API key configured');
    this.name = 'MissingApiKeyError';
  }
}

/**
 * Calls the Messages API over `fetch` rather than through `@anthropic-ai/sdk`.
 *
 * The SDK is the normal choice, and it was tried first — it imports `node:fs`
 * (`lib/credentials/types.mjs`), which Metro cannot resolve, so the bundle
 * fails outright. React Native has no Node built-ins, so raw HTTP is the only
 * option here. The request shape below is the documented one; if the SDK ever
 * ships a React Native entry point, this is a small file to replace.
 *
 * @param jpegBase64 base64-encoded JPEG, no data: prefix.
 * @param signal aborts the request when the session ends mid-flight.
 */
export async function generateCommentsForFrame(
  jpegBase64: string,
  signal?: AbortSignal
): Promise<VisionComment[]> {
  const apiKey = resolveApiKey();
  if (!apiKey) throw new MissingApiKeyError();

  const model = resolveVisionModel();

  const response = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      // React Native has no Origin header so this generally isn't consulted,
      // but it's the documented opt-in for non-server callers and costs nothing.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model.id,
      max_tokens: MAX_TOKENS,
      output_config: {
        // `effort` is capability-gated, not optional styling: models outside the
        // supported list reject the whole request, so Haiku 4.5 must not receive
        // it. Where it is supported, `low` is right for a short, easy generation
        // — but never pair it with `thinking: {type:'disabled'}`, which on the
        // thinking-capable models can produce malformed output.
        ...(model.supportsEffort ? { effort: 'low' } : {}),
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 },
            },
            { type: 'text', text: `Write ${COMMENTS_PER_FRAME} comments reacting to this frame.` },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    // Surfacing the model matters here: a 400 is most likely an `output_config`
    // field the selected model doesn't accept, and the message alone won't say
    // which model was in play.
    throw new Error(`Claude API ${response.status} (${model.id}): ${await response.text()}`);
  }

  const body = (await response.json()) as {
    stop_reason?: string;
    content?: Array<{ type: string; text?: string }>;
  };

  // Safety classifiers can decline a frame; `content` is then empty or partial,
  // so check the stop reason before reading it.
  if (body.stop_reason === 'refusal') return [];

  const text = body.content?.find((block) => block.type === 'text')?.text;
  if (!text) return [];

  return parseComments(text);
}

/** Tolerates a non-JSON response rather than throwing — a bad batch just yields no comments. */
function parseComments(raw: string): VisionComment[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const comments = (parsed as { comments?: unknown })?.comments;
  if (!Array.isArray(comments)) return [];

  return comments
    .filter((c): c is VisionComment => typeof c?.author === 'string' && typeof c?.text === 'string')
    .map((c) => ({
      // Braces would survive into the feed and read as an unfilled template
      // slot; `fillTemplate` never sees this text, so strip them here.
      author: c.author.replace(/[{}]/g, '').trim().slice(0, 24),
      text: c.text.replace(/[{}]/g, '').trim().slice(0, 120),
    }))
    .filter((c) => c.author.length > 0 && c.text.length > 0);
}
