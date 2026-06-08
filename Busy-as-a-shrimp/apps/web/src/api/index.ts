import { createAnnouncementApi } from "./announcement-api";
import { createAiBriefApi } from "./ai-brief-api";
import { createBountyHallApi } from "./bounty-hall-api";
import { createDoppelgangerApi } from "./doppelganger-api";
import { createSoloSignalApi } from "./solo-signal-api";
import { createSopTemplateApi } from "./sop-template-api";
import { createPublicTranslateApi } from "./public-translate-api";
import { createDictApi } from "./dict-api";
import { createContentApi } from "./content-api";
import { createMatchApi } from "./match-api";
import { createResourceApi } from "./resource-api";
import { createUserApi } from "./user-api";
import { createLobsterApi } from "./lobster-api";
import { createMessageApi } from "./message-api";
import { getWebClient } from "./web-client";

export function getUserApi() {
  return createUserApi(getWebClient());
}

export function getResourceApi() {
  return createResourceApi(getWebClient());
}

export function getMatchApi() {
  return createMatchApi(getWebClient());
}

export function getContentApi() {
  return createContentApi(getWebClient());
}

export function getDictApi() {
  return createDictApi(getWebClient());
}

export function getAnnouncementApi() {
  return createAnnouncementApi(getWebClient());
}

export function getBountyHallApi() {
  return createBountyHallApi(getWebClient());
}

export function getAiBriefApi() {
  return createAiBriefApi(getWebClient());
}

export function getDoppelgangerApi() {
  return createDoppelgangerApi(getWebClient());
}

export function getSoloSignalApi() {
  return createSoloSignalApi(getWebClient());
}

export function getSopTemplateApi() {
  return createSopTemplateApi(getWebClient());
}

export function getPublicTranslateApi() {
  return createPublicTranslateApi(getWebClient());
}

export function getLobsterApi() {
  return createLobsterApi(getWebClient());
}

export async function getCampusOpportunities(params?: {
  page?: number;
  size?: number;
  sourceType?: string;
}) {
  return getLobsterApi().getCampusOpportunities(params);
}

export async function getPublicCampusOpportunities(params?: { limit?: number }) {
  return getLobsterApi().getPublicCampusOpportunities(params?.limit);
}

export function getMessageApi() {
  return createMessageApi(getWebClient());
}

import { createSignInApi } from "./signin-api";
export function getSignInApi() {
  return createSignInApi(getWebClient());
}
