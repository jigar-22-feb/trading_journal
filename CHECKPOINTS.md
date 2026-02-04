# Development checkpoints

Checkpoints mark a known-good state of the project for rollback.

## Checkpoint 1

- **Tag:** `checkpoint-1`
- **Created:** Baseline after full setup and visual verification
- **Includes:** Dashboard, 100 seeded trades, charts (Equity Curve, Trade Outcomes, Trades by Session, Risk vs Reward), filters, New Trade form, backend (Express + Mongoose), frontend (React + Vite + Tailwind)

## Checkpoint 2

- **Tag:** `checkpoint-2`
- **Created:** After implementing user icon, Settings page, and navigation improvements
- **Includes:** 
  - User icon in Trading Journal header (right side)
  - Settings page with left sidebar navigation (Themes, Settings)
  - Theme selector moved to Settings page
  - "Home" button with back arrow for navigation (replaces "Back to Dashboard")
  - Analytics cards default to maximized view with minimize/maximize toggle functionality
  - "Today" date filter option added
  - Enhanced chart tooltips showing profit information

## How to rollback to a checkpoint

To restore the codebase to checkpoint 1:

```powershell
# Discard all local changes and switch to checkpoint-1 state
git checkout checkpoint-1 -- .

# Or create a new branch from checkpoint-1 and work from there
git checkout -b recovery-from-checkpoint-1 checkpoint-1
```

To only view what was in the project at checkpoint 1 (without changing current files):

```powershell
git show checkpoint-1:README.md
```

To list all checkpoints:

```powershell
git tag -l -n1
```
