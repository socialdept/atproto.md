import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.jsonc" },
				// Test-only secret so the /stats/reset endpoint can be exercised (prod sets it via
				// `wrangler secret put STATS_RESET_TOKEN`; it is never committed).
				miniflare: { bindings: { STATS_RESET_TOKEN: "test-reset-token" } },
			},
		},
	},
});
