import type { ClockEvent } from "../types/domain.js";

const MAX_PERSISTED_PHOTO_EVENTS = 8;
const MAX_PERSISTED_PHOTO_DATA_URL_CHARS = 180_000;

export function prepareClockEventsForPersist(events: ClockEvent[]) {
  const photoEventIdsToKeep = new Set(
    events
      .filter(event => Boolean(event.photoDataUrl))
      .slice(-MAX_PERSISTED_PHOTO_EVENTS)
      .map(event => event.id),
  );

  return events.map(event => {
    const photoDataUrl = event.photoDataUrl;
    if (!photoDataUrl) return event;

    const shouldDropPhoto =
      !photoEventIdsToKeep.has(event.id) || photoDataUrl.length > MAX_PERSISTED_PHOTO_DATA_URL_CHARS;

    if (!shouldDropPhoto) return event;
    return { ...event, photoDataUrl: undefined };
  });
}
