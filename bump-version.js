#!/usr/bin/env node
// Run before deploying: node bump-version.js
// Replaces all ?v=<token> in HTML files with a fresh base-36 timestamp,
// so browsers always fetch updated JS/CSS after a deploy.

const fs = require("fs");
const path = require("path");

const HTML_FILES = ["index.html", "login.html", "main.html"];
const v = Date.now().toString(36);

HTML_FILES.forEach(file => {
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) return;
  const original = fs.readFileSync(fp, "utf8");
  const updated = original.replace(/(\?v=)[a-z0-9]+/g, `$1${v}`);
  if (updated === original) { console.log(`${file} — no version tokens found`); return; }
  fs.writeFileSync(fp, updated, "utf8");
  console.log(`${file} — bumped to ?v=${v}`);
});
