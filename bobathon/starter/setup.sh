#!/usr/bin/env bash
# One-time setup for the Bobathon lab: installs and builds the simulated WVU campus MCP server.
set -euo pipefail
cd "$(dirname "$0")/wvu-campus-mcp"
command -v node >/dev/null || { echo "Node.js 18+ is required: https://nodejs.org"; exit 1; }
npm install --no-fund --no-audit
npm run build
echo ""
echo "Done. Open the 'starter' folder as your workspace in Bob."
