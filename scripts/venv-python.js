"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const venvDir = path.join(root, "backend", ".venv");
const venvPython =
  process.platform === "win32"
    ? path.join(venvDir, "Scripts", "python.exe")
    : path.join(venvDir, "bin", "python");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function pythonVersion(command, args) {
  const result = spawnSync(command, [...args, "-c", "import sys; print('%d.%d' % sys.version_info[:2])"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout.trim();
}

function createVenv() {
  const candidates =
    process.platform === "win32"
      ? [
          ["py", ["-3.13"]],
          ["py", ["-3.12"]],
          ["py", ["-3"]],
          ["python", []],
        ]
      : [
          ["python3.13", []],
          ["python3.12", []],
          ["python3", []],
          ["python", []],
        ];

  const found = [];
  for (const [command, args] of candidates) {
    const version = pythonVersion(command, args);
    if (version) {
      found.push({ command, args, version });
    }
  }

  const python =
    found.find((item) => item.version === "3.13" || item.version === "3.12") || found[0];
  if (!python) {
    console.error("Python not found. Install Python 3.12 or 3.13 and rerun npm run setup:backend.");
    process.exit(1);
  }
  if (python.version !== "3.12" && python.version !== "3.13") {
    console.warn(
      `Warning: Python ${python.version} is outside Django 5.1's tested range (3.12–3.13). Prefer Python 3.12 or 3.13.`,
    );
  }
  console.log(`Creating backend/.venv with Python ${python.version}`);
  run(python.command, [...python.args, "-m", "venv", venvDir]);
}

const args = process.argv.slice(2);

if (args[0] === "setup") {
  if (!fs.existsSync(venvPython)) {
    createVenv();
  } else {
    console.log("backend/.venv already exists; installing requirements into it.");
  }
  run(venvPython, ["-m", "pip", "install", "-r", path.join("backend", "requirements.txt")]);
  console.log("Backend virtualenv is ready. You can run npm run migrate and npm run dev without activating it.");
  process.exit(0);
}

if (!fs.existsSync(venvPython)) {
  console.error("Backend virtualenv not found at backend/.venv.");
  console.error("Create it with: npm run setup:backend");
  process.exit(1);
}

run(venvPython, args);
