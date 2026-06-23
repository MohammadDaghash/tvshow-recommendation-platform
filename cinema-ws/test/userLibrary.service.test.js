const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildUserShowUpdate,
  decorateShowsWithUserState,
} = require("../services/userLibrary.service");

test("buildUserShowUpdate requires a rating when marking watched", () => {
  assert.throws(
    () => buildUserShowUpdate("watched", {}),
    /Rating is required/,
  );
});

test("buildUserShowUpdate clears rating for non-watched statuses", () => {
  assert.deepEqual(buildUserShowUpdate("watching", { userRating: 9 }), {
    status: "watching",
    userRating: null,
  });
});

test("decorateShowsWithUserState applies private user state over catalog state", () => {
  const shows = [
    {
      _id: "show-1",
      title: "Global Watched",
      watched: true,
      userRating: 10,
      toObject() {
        return {
          _id: this._id,
          title: this.title,
          watched: this.watched,
          userRating: this.userRating,
        };
      },
    },
    {
      _id: "show-2",
      title: "Private Want",
      watched: true,
      userRating: 8,
      toObject() {
        return {
          _id: this._id,
          title: this.title,
          watched: this.watched,
          userRating: this.userRating,
        };
      },
    },
  ];

  const states = [
    {
      tvShow: "show-2",
      status: "want",
      userRating: null,
    },
  ];

  assert.deepEqual(decorateShowsWithUserState(shows, states), [
    {
      _id: "show-1",
      title: "Global Watched",
      watched: false,
      userRating: null,
      status: "none",
    },
    {
      _id: "show-2",
      title: "Private Want",
      watched: false,
      userRating: null,
      status: "want",
    },
  ]);
});
