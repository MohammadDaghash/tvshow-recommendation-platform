import { useEffect, useState } from "react";

import { apiUrl } from "../api";
import { authHeaders, parseJSONResponse } from "../httpClient";
import {
  canEditTasteProfile,
  getKeywordColumnTitle,
  getSignalEffectText,
  getSignalTone,
  getTasteProfileScopeLabel,
} from "../tasteProfile";

const fetchTasteProfile = async (token) => {
  const response = await fetch(apiUrl("/api/interests/profile"), {
    headers: authHeaders(token),
  });

  return parseJSONResponse(response);
};

const emptyProfile = {
  featureWeights: [],
  keywords: {
    disliked: [],
    liked: [],
  },
  negativeSignals: [],
  positiveSignals: [],
  summary: {},
};

function KeywordColumn({
  canEdit,
  inputValue,
  isSaving,
  keywords,
  onAdd,
  onInputChange,
  onRemove,
  onRequireSignIn,
  sentiment,
}) {
  return (
    <article className="taste-profile-card keyword-card">
      <div className="taste-profile-card-header">
        <h3>{getKeywordColumnTitle(sentiment)}</h3>
        <span>{keywords.length}</span>
      </div>

      <div className="keyword-chip-list">
        {keywords.length === 0 ? (
          <p className="taste-profile-muted">No keywords yet.</p>
        ) : (
          keywords.map((keyword) => (
            <span className="keyword-chip" key={keyword.id || keyword.value}>
              {keyword.value}
              {canEdit && (
                <button
                  aria-label={`Remove ${keyword.value}`}
                  onClick={() => onRemove(keyword.id)}
                  type="button"
                >
                  x
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {canEdit ? (
        <form className="keyword-form" onSubmit={(event) => onAdd(event, sentiment)}>
          <input
            aria-label={`Add ${sentiment} keyword`}
            onChange={(event) => onInputChange(sentiment, event.target.value)}
            placeholder={sentiment === "like" ? "legal drama" : "zombies"}
            value={inputValue}
          />
          <button className="secondary-button" disabled={isSaving} type="submit">
            Add
          </button>
        </form>
      ) : (
        <button className="secondary-button" onClick={onRequireSignIn} type="button">
          Sign in to edit
        </button>
      )}
    </article>
  );
}

function SignalList({ emptyText, signals, title }) {
  return (
    <article className="taste-profile-card">
      <h3>{title}</h3>
      <div className="signal-list">
        {signals.length === 0 ? (
          <p className="taste-profile-muted">{emptyText}</p>
        ) : (
          signals.map((signal) => (
            <div className="signal-row" key={`${title}-${signal.name}`}>
              <span>{signal.name}</span>
              <strong className={`signal-${getSignalTone(signal.value)}`}>
                {getSignalEffectText(signal.value)}
              </strong>
              <small>{signal.source}</small>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export function TasteProfilePanel({
  authToken = "",
  currentUser,
  onPreferencesChanged,
  openAuthModal,
}) {
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [keywordInputs, setKeywordInputs] = useState({
    dislike: "",
    like: "",
  });

  const loadProfile = async () => {
    setIsLoading(true);
    setError("");

    try {
      setProfileData(await fetchTasteProfile(authToken));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCurrent = true;

    fetchTasteProfile(authToken)
      .then((data) => {
        if (!isCurrent) return;
        setProfileData(data);
        setError("");
      })
      .catch((loadError) => {
        if (isCurrent) setError(loadError.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [authToken, currentUser]);

  const mutateKeyword = async (request) => {
    if (!currentUser || !authToken) {
      openAuthModal("login", "Sign in to edit your taste profile.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await request(authToken);
      await loadProfile();
      await onPreferencesChanged?.();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeywordInput = (sentiment, value) => {
    setKeywordInputs((currentInputs) => ({
      ...currentInputs,
      [sentiment]: value,
    }));
  };

  const handleAddKeyword = async (event, sentiment) => {
    event.preventDefault();

    const value = keywordInputs[sentiment].trim();

    if (!value) return;

    await mutateKeyword(async (token) => {
      const response = await fetch(apiUrl("/api/interests/keywords"), {
        body: JSON.stringify({
          sentiment,
          value,
        }),
        headers: authHeaders(token, {
          "Content-Type": "application/json",
        }),
        method: "POST",
      });

      await parseJSONResponse(response);
      setKeywordInputs((currentInputs) => ({
        ...currentInputs,
        [sentiment]: "",
      }));
    });
  };

  const handleRemoveKeyword = async (keywordId) => {
    await mutateKeyword(async (token) => {
      const response = await fetch(apiUrl(`/api/interests/keywords/${keywordId}`), {
        headers: authHeaders(token),
        method: "DELETE",
      });

      await parseJSONResponse(response);
    });
  };

  const handleRequireSignIn = () => {
    openAuthModal("login", "Sign in to edit your taste profile.");
  };

  if (isLoading) {
    return (
      <section className="taste-profile-panel">
        <p className="lead-carousel-kicker">Taste Model</p>
        <h2>Loading taste profile...</h2>
      </section>
    );
  }

  const profile = profileData?.profile || emptyProfile;
  const canEdit = canEditTasteProfile({
    currentUser,
    profileCanEdit: profileData?.canEdit,
  });
  const summary = profile.summary || {};
  const scopeLabel = getTasteProfileScopeLabel({
    currentUser,
    dataScope: profileData?.dataScope,
  });

  return (
    <section className="taste-profile-panel">
      <div className="taste-profile-header">
        <div>
          <p className="lead-carousel-kicker">Taste Model</p>
          <h2>Your recommendation profile</h2>
          <p className="taste-profile-muted">
            Ratings, watch-list moves, Not Interested actions, and explicit
            keywords are combined into a soft scoring profile.
          </p>
        </div>
        <span className="taste-profile-scope">{scopeLabel}</span>
      </div>

      {error && (
        <div className="taste-profile-error">
          <span>{error}</span>
          <button className="secondary-button" onClick={loadProfile} type="button">
            Retry
          </button>
        </div>
      )}

      <div className="taste-profile-grid">
        <article className="taste-profile-card">
          <span>Rated Shows</span>
          <strong>{summary.ratedCount || 0}</strong>
        </article>
        <article className="taste-profile-card">
          <span>Watchlist Signals</span>
          <strong>{(summary.wantCount || 0) + (summary.watchingCount || 0)}</strong>
        </article>
        <article className="taste-profile-card">
          <span>Not Interested</span>
          <strong>{summary.ignoredCount || 0}</strong>
        </article>
        <article className="taste-profile-card">
          <span>Manual Keywords</span>
          <strong>{summary.explicitKeywordCount || 0}</strong>
        </article>
      </div>

      <div className="taste-profile-columns">
        <SignalList
          emptyText="Rate or save shows to create positive taste signals."
          signals={profile.positiveSignals || []}
          title="What the model thinks you like"
        />
        <SignalList
          emptyText="Low ratings and Not Interested actions will appear here."
          signals={profile.negativeSignals || []}
          title="What the model avoids"
        />
      </div>

      <div className="taste-profile-columns">
        <KeywordColumn
          canEdit={canEdit}
          inputValue={keywordInputs.like}
          isSaving={isSaving}
          keywords={profile.keywords?.liked || []}
          onAdd={handleAddKeyword}
          onInputChange={handleKeywordInput}
          onRemove={handleRemoveKeyword}
          onRequireSignIn={handleRequireSignIn}
          sentiment="like"
        />
        <KeywordColumn
          canEdit={canEdit}
          inputValue={keywordInputs.dislike}
          isSaving={isSaving}
          keywords={profile.keywords?.disliked || []}
          onAdd={handleAddKeyword}
          onInputChange={handleKeywordInput}
          onRemove={handleRemoveKeyword}
          onRequireSignIn={handleRequireSignIn}
          sentiment="dislike"
        />
      </div>

      <article className="taste-profile-card">
        <h3>Dynamic Feature Weights</h3>
        <div className="feature-weight-table">
          {(profile.featureWeights || []).map((row) => (
            <div className="feature-weight-row" key={row.signal}>
              <span>{row.signal}</span>
              <strong>{getSignalEffectText(row.effect)}</strong>
              <small>{row.direction}</small>
              <small>{row.source}</small>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
