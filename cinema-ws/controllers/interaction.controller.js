const {
  recordInteractionEvent,
  recordInteractionEvents,
} = require("../services/interactionEvent.service");
const {
  recordRecommendationFeedback,
  recordRecommendationLog,
} = require("../services/recommendationData.service");
const {
  shouldRecordTasteSignals,
  withRecommendationSignalContext,
} = require("../services/recommendationSignalContext.service");

const shouldSkipTracking = (user) => {
  return !shouldRecordTasteSignals(user);
};

const withUser = (req, payload) => ({
  ...payload,
  userId: req.user._id,
  metadata: withRecommendationSignalContext(req.user, payload.metadata),
});

const recordInteraction = async (req, res) => {
  try {
    if (shouldSkipTracking(req.user)) {
      return res.json({ recorded: false });
    }

    const event = await recordInteractionEvent(withUser(req, req.body));

    res.status(201).json({
      id: event._id,
      recorded: true,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const recordInteractionBatch = async (req, res) => {
  try {
    if (shouldSkipTracking(req.user)) {
      return res.json({ recorded: 0 });
    }

    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    const recordedEvents = await recordInteractionEvents(
      events.map((event) => withUser(req, event)),
    );

    res.status(201).json({
      recorded: recordedEvents.length,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const recordLog = async (req, res) => {
  try {
    if (shouldSkipTracking(req.user)) {
      return res.json({ recorded: false });
    }

    const log = await recordRecommendationLog(withUser(req, req.body));

    res.status(201).json({
      id: log._id,
      recorded: true,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const recordFeedback = async (req, res) => {
  try {
    if (shouldSkipTracking(req.user)) {
      return res.json({ recorded: false });
    }

    const feedback = await recordRecommendationFeedback(withUser(req, req.body));

    res.status(201).json({
      id: feedback._id,
      recorded: true,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  recordFeedback,
  recordInteraction,
  recordInteractionBatch,
  recordLog,
};
