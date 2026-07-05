const axios = require("axios");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-haiku-4-5";
const CLAUDE_TIMEOUT_MS = 6000;
const MAX_EXPLANATION_LENGTH = 220;
const FALLBACK_EXPLANATION =
  "Added to your recommendations — we don't have enough data yet to explain this one.";

const SCORE_FIELDS = [
  "genreSimilarity",
  "categoryPreference",
  "tmdbRating",
  "popularity",
  "yearSimilarity",
];

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    explanation: {
      type: "string",
    },
    emphasizedFactor: {
      type: "string",
      enum: ["genre", "quality", "similarity", "general"],
    },
  },
  required: ["explanation", "emphasizedFactor"],
  additionalProperties: false,
};

const inFlightExplanations = new Map();

const toScore = (value) => {
  const score = Number(value);

  return Number.isFinite(score) ? score : 0;
};

const hasPositiveScore = (scoreBreakdown, field) =>
  toScore(scoreBreakdown?.[field]) > 0;

const hasSimilarShows = (similarWatchedShows = []) =>
  Array.isArray(similarWatchedShows) && similarWatchedShows.length > 0;

function hasPersonalizationSignal(scoreBreakdown = {}, similarWatchedShows = []) {
  return (
    hasPositiveScore(scoreBreakdown, "genreSimilarity") ||
    hasPositiveScore(scoreBreakdown, "categoryPreference") ||
    hasSimilarShows(similarWatchedShows)
  );
}

function hasAnySignal(scoreBreakdown = {}, similarWatchedShows = []) {
  return (
    hasPersonalizationSignal(scoreBreakdown, similarWatchedShows) ||
    hasPositiveScore(scoreBreakdown, "tmdbRating") ||
    hasPositiveScore(scoreBreakdown, "popularity") ||
    hasPositiveScore(scoreBreakdown, "yearSimilarity")
  );
}

function buildFallbackExplanation() {
  return {
    explanation: FALLBACK_EXPLANATION,
    emphasizedFactor: "general",
    fallback: true,
    reason: null,
    cached: false,
  };
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isAllowedTitle = (phrase, allowedTitles) =>
  allowedTitles.some((title) => title.toLowerCase() === phrase.toLowerCase());

const extractPotentialTitles = (text) => {
  const matches =
    text.match(/\b(?:[A-Z][A-Za-z0-9'&:-]*)(?:\s+[A-Z][A-Za-z0-9'&:-]*){1,5}\b/g) ||
    [];

  return matches
    .map((match) => match.trim())
    .filter((match) => !["TV", "TMDB"].includes(match));
};

function isTitleAllowed(text = "", showTitle = "", similarWatchedShows = []) {
  const allowedTitles = [
    showTitle,
    ...similarWatchedShows.map((show) => show.title),
  ].filter(Boolean);

  if (!text || allowedTitles.length === 0) return false;

  for (const title of allowedTitles) {
    const titlePattern = new RegExp(`\\b${escapeRegExp(title)}\\b`, "i");
    text = text.replace(titlePattern, "");
  }

  return extractPotentialTitles(text).every((phrase) =>
    isAllowedTitle(phrase, allowedTitles),
  );
}

function isEmphasizedFactorConsistent(
  emphasizedFactor,
  scoreBreakdown = {},
  similarWatchedShows = [],
) {
  if (emphasizedFactor === "general") return true;

  if (emphasizedFactor === "genre") {
    return (
      hasPositiveScore(scoreBreakdown, "genreSimilarity") ||
      hasPositiveScore(scoreBreakdown, "categoryPreference")
    );
  }

  if (emphasizedFactor === "quality") {
    return (
      hasPositiveScore(scoreBreakdown, "tmdbRating") ||
      hasPositiveScore(scoreBreakdown, "popularity")
    );
  }

  if (emphasizedFactor === "similarity") {
    return hasSimilarShows(similarWatchedShows);
  }

  return false;
}

function buildPrompt({
  showTitle,
  scoreBreakdown = {},
  similarWatchedShows = [],
  hasPersonalizationSignal: personalizationAvailable,
}) {
  const system = `You are writing short, natural explanations for why a TV show was recommended to a
user inside a TV show recommendation app. A content-based recommendation algorithm
has already computed a numeric score breakdown for this show — your only job is to
explain that score in plain language. You never invent a score, and you never invent
facts about the show.

Hard rules:
1. Only reference the specific fields given to you in the user message (show title,
   score breakdown values, similar-watched-show titles). Never invent, assume, or
   reference plot details, characters, actors, setting, streaming availability,
   release dates, or any other fact about the show that is not present in the given
   fields.
2. Never state or imply a score, ranking, or reason that isn't supported by the given
   numbers. You are explaining an existing score, not creating a new one.
3. A value of 0 (or a missing/empty field) means "this factor contributed nothing" —
   not "this factor is bad." Never fabricate a plausible-sounding reason to explain
   a zero, and never build the explanation around a zero-valued factor.
4. If similarWatchedShows is empty, do not claim the show is "similar to what you've
   watched" or reference the user's taste/history at all. Base the explanation only
   on the non-zero scoreBreakdown fields, or use the cold-start framing described in
   the user message.
5. Never mention a show title other than the recommended show itself or a title that
   appears verbatim in similarWatchedShows.
6. Write in a natural, conversational tone — like a quick reason a friend would give,
   not a report. Never use technical terms like "cosine similarity," "vector,"
   "score," "algorithm," or field names such as "genreSimilarity."
7. Keep the explanation to 1-2 sentences and under 40 words total.
8. Respond with JSON only, matching the given schema — no markdown, no preamble, no
   trailing commentary.`;

  const user = `Recommended show: ${showTitle}

Score breakdown (0-100 scale; 0 means that factor had no signal for this show, not
that it was scored poorly):
- genreSimilarity: ${toScore(scoreBreakdown.genreSimilarity)} — how closely this show's genres
  match the genres of shows the user rated highly
- categoryPreference: ${toScore(scoreBreakdown.categoryPreference)} — how well this matches
  patterns across the user's whole watch history
- tmdbRating: ${toScore(scoreBreakdown.tmdbRating)} — general audience rating quality
- popularity: ${toScore(scoreBreakdown.popularity)} — how popular/mainstream the show is
- yearSimilarity: ${toScore(scoreBreakdown.yearSimilarity)} — how close its release year is to
  the years of shows the user watched

Shows from the user's watch history most similar to this recommendation (empty array
means the user has no watch history yet, or nothing similar was found):
${JSON.stringify(similarWatchedShows)}

Personalization available: ${Boolean(personalizationAvailable)}
(true only if genreSimilarity > 0 OR categoryPreference > 0 OR similarWatchedShows is
non-empty; if false, this user has no usable watch history yet — do not reference
their taste, history, or similarity to anything they've watched)

Using ONLY the data above:
- If Personalization available is true: identify the 1-2 highest-value factors and
  center the explanation on those. You may name at most one title from
  similarWatchedShows, exactly as written.
- If Personalization available is false: do not personalize. Give a brief, honest
  reason grounded only in tmdbRating/popularity, or state plainly that this is a
  general pick while we learn the user's taste. Do not say "based on your taste."

Respond with JSON only, matching this schema:
{"explanation": string, "emphasizedFactor": "genre" | "quality" | "similarity" | "general"}`;

  return {
    system,
    user,
  };
}

const parseClaudeContent = (data) => {
  const textBlock = data?.content?.find?.(
    (block) => typeof block?.text === "string",
  );
  const rawText =
    textBlock?.text ||
    (typeof data?.output === "string" ? data.output : "") ||
    "";

  if (!rawText) return null;

  return JSON.parse(rawText);
};

const mapClaudeFailure = (error) => {
  const status = error?.response?.status;

  if (status === 429) return "rate_limited";
  if (error?.name === "AbortError" || error?.code === "ERR_CANCELED") {
    return "timeout";
  }

  return "unavailable";
};

const logClaudeFailure = (error) => {
  const status = error?.response?.status || null;
  const errorData = error?.response?.data?.error || {};

  // Do not log the raw axios error/config because it can include x-api-key.
  console.warn("Claude explanation request failed", {
    status,
    type: errorData.type || error?.code || error?.name || "unknown",
    message: errorData.message || error?.message || "Anthropic unavailable",
  });
};

async function callClaude({ system, user }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const response = await axios.post(
      ANTHROPIC_MESSAGES_URL,
      {
        model: ANTHROPIC_MODEL,
        max_tokens: 200,
        system,
        messages: [
          {
            role: "user",
            content: user,
          },
        ],
        output_config: {
          format: {
            type: "json_schema",
            schema: RESPONSE_SCHEMA,
          },
        },
      },
      {
        headers: {
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
        },
        signal: controller.signal,
      },
    );

    return {
      ok: true,
      data: parseClaudeContent(response.data),
    };
  } catch (error) {
    logClaudeFailure(error);

    return {
      ok: false,
      reason: mapClaudeFailure(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

const buildRequestKey = ({
  showTitle,
  recommendationScore,
  scoreBreakdown,
  similarWatchedShows,
}) =>
  JSON.stringify({
    showTitle,
    recommendationScore,
    scoreBreakdown,
    similarWatchedShows,
  });

const validateModelOutput = (
  output,
  { showTitle, scoreBreakdown, similarWatchedShows },
) => {
  const explanation = String(output?.explanation || "").trim();
  const emphasizedFactor = output?.emphasizedFactor;

  if (!explanation || explanation.length > MAX_EXPLANATION_LENGTH) return null;

  if (!isTitleAllowed(explanation, showTitle, similarWatchedShows)) return null;

  if (
    !isEmphasizedFactorConsistent(
      emphasizedFactor,
      scoreBreakdown,
      similarWatchedShows,
    )
  ) {
    return null;
  }

  return {
    explanation,
    emphasizedFactor,
  };
};

async function getExplanation({
  showTitle,
  recommendationScore,
  scoreBreakdown = {},
  similarWatchedShows = [],
}) {
  if (!hasAnySignal(scoreBreakdown, similarWatchedShows)) {
    return buildFallbackExplanation();
  }

  if (!ANTHROPIC_API_KEY) {
    return {
      explanation: null,
      emphasizedFactor: null,
      fallback: true,
      reason: "disabled",
      cached: false,
    };
  }

  const requestKey = buildRequestKey({
    showTitle,
    recommendationScore,
    scoreBreakdown,
    similarWatchedShows,
  });

  if (inFlightExplanations.has(requestKey)) {
    const duplicateResult = await inFlightExplanations.get(requestKey);

    return {
      ...duplicateResult,
      deduped: true,
    };
  }

  const requestPromise = (async () => {
    const personalizationAvailable = hasPersonalizationSignal(
      scoreBreakdown,
      similarWatchedShows,
    );
    const prompt = buildPrompt({
      showTitle,
      scoreBreakdown,
      similarWatchedShows,
      hasPersonalizationSignal: personalizationAvailable,
    });
    const startTime = Date.now();
    const claudeResult = await callClaude(prompt);
    const latencyMs = Date.now() - startTime;

    if (!claudeResult.ok) {
      return {
        explanation: null,
        emphasizedFactor: null,
        fallback: true,
        reason: claudeResult.reason,
        cached: false,
      };
    }

    const validatedOutput = validateModelOutput(claudeResult.data, {
      showTitle,
      scoreBreakdown,
      similarWatchedShows,
    });

    if (!validatedOutput) return buildFallbackExplanation();

    return {
      ...validatedOutput,
      fallback: false,
      reason: null,
      cached: false,
      model: ANTHROPIC_MODEL,
      latencyMs,
    };
  })();

  inFlightExplanations.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightExplanations.delete(requestKey);
  }
}

module.exports = {
  ANTHROPIC_MODEL,
  FALLBACK_EXPLANATION,
  SCORE_FIELDS,
  buildFallbackExplanation,
  buildPrompt,
  callClaude,
  getExplanation,
  hasAnySignal,
  hasPersonalizationSignal,
  isEmphasizedFactorConsistent,
  isTitleAllowed,
};
