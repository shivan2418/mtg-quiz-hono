import { hc } from "hono/client";
import type { AppType } from "api/app-type";

export const client = hc<AppType>("/api");
