# Development checkpoints

Checkpoints mark a known-good state of the project for rollback.

## Checkpoint 1

- **Tag:** `checkpoint-1`
- **Created:** Baseline after full setup and visual verification
- **Includes:** Dashboard, 100 seeded trades, charts (Equity Curve, Trade Outcomes, Trades by Session, Risk vs Reward), filters, New Trade form, backend (Express + Mongoose), frontend (React + Vite + Tailwind)

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
