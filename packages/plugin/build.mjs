// Bundles the plugin so it installs without the monorepo.
// @callbook/core (not on npm) and the bundled deployments are inlined.
// @metamask/agent-wallet stays external: it must be the host CLI's own copy, or the
// host's capability grants would land in a second module instance the plugin never sees.
import { readdirSync, rmSync } from "node:fs";
import { build } from "esbuild";

rmSync("dist", { recursive: true, force: true });
const commands = readdirSync("src/commands/callbook")
  .filter((f) => f.endsWith(".ts"))
  .map((f) => `src/commands/callbook/${f}`);

await build({
  entryPoints: commands,
  outdir: "dist",
  outbase: "src",
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "node",
  target: "node22",
  sourcemap: false,
  legalComments: "none",
  external: ["@metamask/agent-wallet", "@metamask/agent-wallet/*", "viem", "viem/*"],
  logLevel: "info",
});
