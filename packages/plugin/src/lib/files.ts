import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Deployment } from "@callbook/core";

export function readDeployment(chainId: number): Deployment {
  const explicit = process.env.CALLBOOK_DEPLOYMENT;
  if (explicit) return JSON.parse(readFileSync(explicit, "utf8")) as Deployment;
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    const candidate = join(dir, "deployments", `${chainId}.json`);
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate, "utf8")) as Deployment;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Missing deployments/${chainId}.json. Deploy Callbook, or set CALLBOOK_DEPLOYMENT.`);
}
