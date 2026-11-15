const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
// The monorepo's portable SDK/Gradle caches and generated native projects are not JS sources.
// Crawling these during APK builds can stall both development Metro servers.
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const generated = [
  path.resolve(__dirname, "../../.local"),
  path.join(__dirname, "android"),
  path.join(__dirname, "modules/alipay-sandbox/android/build"),
];
const previous = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(previous) ? previous : previous ? [previous] : []),
  ...generated.map((directory) => new RegExp(`^${escape(directory)}[/\\\\]`)),
];
module.exports = config;
