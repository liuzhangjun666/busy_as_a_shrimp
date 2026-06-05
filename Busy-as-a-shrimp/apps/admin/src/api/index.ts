import { createAdminApi } from "./admin-api";
import { getAdminClient } from "./admin-client";

export function getAdminApi() {
  return createAdminApi(getAdminClient());
}
