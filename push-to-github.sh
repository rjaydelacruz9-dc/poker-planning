#!/usr/bin/env bash
# One-shot: push this folder to your GitHub repo.
# Run:  bash push-to-github.sh
set -e
git init
git branch -M main
git remote add origin https://github.com/rjaydelacruz9-dc/poker-planning.git 2>/dev/null || \
  git remote set-url origin https://github.com/rjaydelacruz9-dc/poker-planning.git
git add planning-poker.html README.md .gitignore
git commit -m "Add ServiceNow planning poker board (prototype)"
git push -u origin main
echo "Done. View at https://github.com/rjaydelacruz9-dc/poker-planning"
