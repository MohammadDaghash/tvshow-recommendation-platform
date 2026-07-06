const LIKED_KEYWORD_BOOST_CAP = 8;
const DISLIKED_KEYWORD_PENALTY_CAP = 12;
const KEYWORD_MATCH_WEIGHT = 4;
const MIN_KEYWORD_LENGTH = 2;
const MAX_KEYWORD_LENGTH = 60;

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeKeyword = normalizeText;

const toWeight = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return 1;

  return Math.min(10, Math.max(0, number));
};

const assertKeyword = (keyword) => {
  if (
    keyword.length < MIN_KEYWORD_LENGTH ||
    keyword.length > MAX_KEYWORD_LENGTH
  ) {
    throw new Error("Keyword must be between 2 and 60 characters");
  }
};

const assertSentiment = (sentiment) => {
  if (!["like", "dislike"].includes(sentiment)) {
    throw new Error("Keyword sentiment must be like or dislike");
  }
};

function buildKeywordInterestPayload({
  userId,
  value,
  sentiment = "like",
  weight = 1,
}) {
  const keyword = normalizeKeyword(value);

  if (!userId) {
    throw new Error("User is required for keyword preferences");
  }

  assertKeyword(keyword);
  assertSentiment(sentiment);

  return {
    user: userId,
    interestType: "keyword",
    value: keyword,
    sentiment,
    source: "explicit",
    weight: toWeight(weight),
  };
}

const getShowKeywordText = (show = {}) => {
  return normalizeText(
    [
      show.title,
      show.overview,
      Array.isArray(show.genres) ? show.genres.join(" ") : "",
      show.originalLanguage,
      show.original_language,
    ]
      .filter(Boolean)
      .join(" "),
  );
};

const getKeywordPreferences = (interests = []) => {
  return interests
    .filter((interest) => interest?.interestType === "keyword" || interest?.value)
    .map((interest) => ({
      value: normalizeKeyword(interest.value),
      sentiment: interest.sentiment === "dislike" ? "dislike" : "like",
      weight: toWeight(interest.weight),
    }))
    .filter((interest) => {
      try {
        assertKeyword(interest.value);

        return true;
      } catch {
        return false;
      }
    });
};

function getKeywordPreferenceScore(show = {}, interests = []) {
  const searchableText = getShowKeywordText(show);
  const keywordPreferences = getKeywordPreferences(interests);
  let likedScore = 0;
  let dislikedScore = 0;
  const likedMatches = [];
  const dislikedMatches = [];

  for (const interest of keywordPreferences) {
    if (!searchableText.includes(interest.value)) continue;

    const contribution = KEYWORD_MATCH_WEIGHT * interest.weight;

    if (interest.sentiment === "dislike") {
      dislikedScore -= contribution;
      dislikedMatches.push(interest.value);
    } else {
      likedScore += contribution;
      likedMatches.push(interest.value);
    }
  }

  const cappedLikedScore = Math.min(LIKED_KEYWORD_BOOST_CAP, likedScore);
  const cappedDislikedScore = Math.max(
    -DISLIKED_KEYWORD_PENALTY_CAP,
    dislikedScore,
  );

  return {
    value: cappedLikedScore + cappedDislikedScore,
    likedMatches,
    dislikedMatches,
  };
}

module.exports = {
  DISLIKED_KEYWORD_PENALTY_CAP,
  LIKED_KEYWORD_BOOST_CAP,
  buildKeywordInterestPayload,
  getKeywordPreferenceScore,
  getKeywordPreferences,
  normalizeKeyword,
};
