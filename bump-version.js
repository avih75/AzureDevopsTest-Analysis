#!/usr/bin/env node
// Bumps the patch version in package.json and vss-extension.json
"use strict";
const fs = require("fs");
const path = require("path");

const root = __dirname;

function bumpPatch(version) {
  const parts = version.split(".").map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join(".");
}

// --- package.json ---
const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const oldVersion = pkg.version;
const newVersion = bumpPatch(oldVersion);
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// --- vss-extension.json ---
const manifestPath = path.join(root, "vss-extension.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`[bump-version] ${oldVersion} → ${newVersion}`);
