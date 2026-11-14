/**
 * Pluggable player photo source. The UI only ever calls `photoUrl(player)`;
 * a null (or an image that fails to load) shows the fallback avatar.
 *
 * To plug in a licensed provider (SportsDataIO, Sportradar Images, ...):
 *   1. Add a PhotoProvider below that turns a player into an https URL
 *      (usually via an id map delivered with the provider's player feed,
 *      proxied through our own CDN so keys never ship in the app).
 *   2. Point ACTIVE at it. Nothing else changes.
 * Details, cost and terms: docs/data-sources.md.
 */
import type { Player } from '../engine/types';
import { PHOTO_IDS } from './photoIds';

export interface PhotoProvider {
  name: string;
  /** False means prototype-only: must not ship. */
  licensed: boolean;
  url(player: Player): string | null;
}

/** No photos: fallback avatars everywhere. */
export const noPhotos: PhotoProvider = { name: 'none', licensed: true, url: () => null };

/** PROTOTYPE ONLY. Public fantasy CDN keyed by src/data/photoIds.ts. Not licensed for commercial use. */
export const prototypeCdn: PhotoProvider = {
  name: 'prototype-cdn',
  licensed: false,
  url: (p) => {
    const id = PHOTO_IDS[p.id];
    return id ? `https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg` : null;
  },
};

/** Shape of a licensed provider: our CDN path keyed by the provider's player id. */
export function licensedCdn(baseUrl: string, ids: Record<string, string>): PhotoProvider {
  return {
    name: 'licensed-cdn',
    licensed: true,
    url: (p) => (ids[p.id] ? `${baseUrl.replace(/\/$/, '')}/${ids[p.id]}.png` : null),
  };
}

let ACTIVE: PhotoProvider = prototypeCdn;

export function setPhotoProvider(p: PhotoProvider) {
  ACTIVE = p;
}

export function photoProvider(): PhotoProvider {
  return ACTIVE;
}

export function photoUrl(player: Player): string | null {
  return ACTIVE.url(player);
}
