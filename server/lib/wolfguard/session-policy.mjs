// Idle timeout. Only explicitly reported user activity renews this deadline.
export const SESSION_MS = 4 * 60 * 60 * 1000;
// Absolute cap: a session never lasts more than 24 hours after its login.
export const SESSION_MAX_MS = 24 * 60 * 60 * 1000;
