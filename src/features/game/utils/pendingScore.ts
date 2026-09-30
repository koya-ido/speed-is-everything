const KEY = "pendingScore";

export const getPendingScore = () => {
  if (typeof sessionStorage === "undefined") return null;
  const data = sessionStorage.getItem(KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse pending score", e);
    return null;
  }
};

export const setPendingScore = (scoreData: unknown) => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(scoreData));
};

export const clearPendingScore = () => {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(KEY);
};

export const hasPendingScore = () => {
  if (typeof sessionStorage === "undefined") return false;
  return !!sessionStorage.getItem(KEY);
};
