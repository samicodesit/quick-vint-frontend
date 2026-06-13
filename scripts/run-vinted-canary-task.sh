#!/usr/bin/env bash
set -euo pipefail

cd /home/mests/projects/quick-vint
./scripts/open-vinted-canary.sh >> /tmp/autolister-vinted-canary.log 2>&1
