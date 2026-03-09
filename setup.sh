#!/usr/bin/env bash
set -euo pipefail

echo "🌟 NovaPool — Setting up project…"
echo ""

command -v forge >/dev/null 2>&1 || {
  echo "❌  Foundry not found. Install: curl -L https://foundry.paradigm.xyz | bash && foundryup"
  exit 1
}
echo "✅  Foundry found: $(forge --version | head -1)"

echo ""
echo "📦  Installing dependencies…"

if [ ! -d ".git" ]; then
  git init -q
  git add -A
  git commit -qm "initial commit" 2>/dev/null || true
fi

forge install uniswap/v4-core --no-commit 2>/dev/null || echo "  ⚠️  v4-core may already be installed"
forge install uniswap/v4-periphery --no-commit 2>/dev/null || echo "  ⚠️  v4-periphery may already be installed"
forge install foundry-rs/forge-std --no-commit 2>/dev/null || echo "  ⚠️  forge-std may already be installed"
forge install OpenZeppelin/openzeppelin-contracts --no-commit 2>/dev/null || echo "  ⚠️  OpenZeppelin may already be installed"

echo "✅  Dependencies installed"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✅  Created .env from template"
fi

echo ""
echo "🔨  Building…"
forge build

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅  NovaPool setup complete!"
echo ""
echo "  Next steps:"
echo "    1. Run tests:   forge test -vvv"
echo "    2. Deploy:      forge script script/DeployNovaPool.s.sol --broadcast"
echo "═══════════════════════════════════════════════════════════"
