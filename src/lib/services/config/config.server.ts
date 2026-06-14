import type { Config } from "@/lib/services/config/configTypes";
import fs from "node:fs";
import { parse } from "toml";

const devPath = "./config/config.dev.toml";
const defaultPath = "./src/lib/server/config.toml";
const configFile = fs.readFileSync(fs.existsSync(devPath) ? devPath : defaultPath, "utf8");
const config: Config = parse(configFile);

export function getServerConfig() {
	return config.server;
}

export function getClientConfig() {
	return config.client;
}

export function isAuthRequired() {
	return config.server.auth.enabled && !config.server.auth.optional;
}
