import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Address, Deployment } from "@callbook/core";

export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, "foundry.toml"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("Run this command from the Callbook repository.");
}

export function readDeployment(chainId: number): Deployment {
  const path = process.env.CALLBOOK_DEPLOYMENT ?? join(repoRoot(), "deployments", `${chainId}.json`);
  if (!existsSync(path)) throw new Error(`Missing ${path}. Deploy Callbook first.`);
  return JSON.parse(readFileSync(path, "utf8")) as Deployment;
}

export function asAddress(value: string): Address {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`Bad address ${value}`);
  return value as Address;
}
