export const getSignalEffectText = (effect) => {
  if (typeof effect === "string") return effect;

  const number = Number(effect || 0);

  if (number > 0) return `+${number}`;
  if (number < 0) return `${number}`;

  return "0";
};

export const getKeywordColumnTitle = (sentiment) => {
  return sentiment === "dislike" ? "Disliked keywords" : "Liked keywords";
};

export const getSignalTone = (value) => {
  const number = Number(value || 0);

  if (number > 0) return "positive";
  if (number < 0) return "negative";

  return "neutral";
};
