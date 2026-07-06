const assert = require("node:assert/strict");
const test = require("node:test");

const { createInterestController } = require("../controllers/interest.controller");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test("getTasteProfile builds a private profile for normal users", async () => {
  const controller = createInterestController({
    TVShowModel: {
      find: async () => {
        throw new Error("normal users should not load catalog taste data");
      },
    },
    UserShowModel: {
      find: (query) => {
        assert.deepEqual(query, {
          user: "user-1",
        });

        return {
          populate: async (field) => {
            assert.equal(field, "tvShow");

            return [
              {
                status: "watched",
                userRating: 9,
                tvShow: {
                  title: "Breaking Bad",
                  genres: ["Drama", "Crime"],
                },
              },
            ];
          },
        };
      },
    },
    UserInterestModel: {
      find: async (query) => {
        assert.deepEqual(query, {
          user: "user-1",
          interestType: "keyword",
          source: "explicit",
        });

        return [
          {
            _id: "keyword-1",
            interestType: "keyword",
            value: "legal drama",
            sentiment: "like",
            weight: 1,
          },
        ];
      },
    },
    UserIgnoredSuggestionModel: {
      find: async (query) => {
        assert.deepEqual(query, {
          user: "user-1",
        });

        return [];
      },
    },
  });
  const res = createResponse();

  await controller.getTasteProfile(
    {
      user: {
        _id: "user-1",
        role: "user",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.dataScope, "private");
  assert.equal(res.body.canEdit, true);
  assert.equal(res.body.profile.summary.watchedCount, 1);
  assert.equal(res.body.profile.keywords.liked[0].value, "legal drama");
});

test("createKeywordInterest upserts a keyword owned by the current user", async () => {
  const updates = [];
  const controller = createInterestController({
    UserInterestModel: {
      findOneAndUpdate: async (query, update, options) => {
        updates.push({
          options,
          query,
          update,
        });

        return {
          _id: "keyword-1",
          ...update,
        };
      },
    },
  });
  const res = createResponse();

  await controller.createKeywordInterest(
    {
      user: {
        _id: "user-1",
      },
      body: {
        value: " Legal Drama ",
        sentiment: "like",
      },
    },
    res,
  );

  assert.equal(res.statusCode, 201);
  assert.deepEqual(updates, [
    {
      query: {
        user: "user-1",
        interestType: "keyword",
        value: "legal drama",
      },
      update: {
        user: "user-1",
        interestType: "keyword",
        value: "legal drama",
        sentiment: "like",
        source: "explicit",
        weight: 1,
      },
      options: {
        returnDocument: "after",
        setDefaultsOnInsert: true,
        upsert: true,
      },
    },
  ]);
  assert.equal(res.body.value, "legal drama");
});

test("deleteKeywordInterest only deletes keywords owned by the current user", async () => {
  const deletes = [];
  const controller = createInterestController({
    UserInterestModel: {
      deleteOne: async (query) => {
        deletes.push(query);

        return {
          deletedCount: 1,
        };
      },
    },
  });
  const res = createResponse();

  await controller.deleteKeywordInterest(
    {
      user: {
        _id: "user-1",
      },
      params: {
        id: "keyword-1",
      },
    },
    res,
  );

  assert.deepEqual(deletes, [
    {
      _id: "keyword-1",
      user: "user-1",
      interestType: "keyword",
    },
  ]);
  assert.deepEqual(res.body, {
    message: "Keyword removed",
  });
});
