# Branch cleanup policy

Branches are cheap to create and easy to forget. This repo previously
accumulated 40+ stale remote branches, so the policy below keeps the list
readable.

## Lifecycle

1. **Branch from `master`** using a scoped prefix:
   - `fix/cc-<issue>-<slug>` — bug fixes
   - `test/cc-<issue>-<slug>` — test coverage
   - `feat/cc-<issue>-<slug>` — features
   - `chore/<slug>` — maintenance with no issue
2. **Open one PR per branch** against `master`.
3. **Delete the branch on merge.** Set the repo to do this automatically:

   ```bash
   gh api -X PATCH repos/anubhavaanand/Chronocoder-1 \
     -f delete_branch_on_merge=true
   ```

## Manual sweep

When the list gets noisy, delete everything provably merged and not attached
to an open PR:

```bash
git fetch origin --prune

# Merged into master, with no open PR.
comm -23 \
  <(git branch -r --merged origin/master | sed 's|^ *||;s|^origin/||' | grep -v '^master$' | sort) \
  <(gh pr list --state open --json headRefName -q '.[].headRefName' | sort) \
| while read b; do git push origin --delete "$b"; done
```

**Never delete** a branch with an open PR, and never force-push `master`.
Dependabot manages its own branches — leave `dependabot/**` alone.

## Why this matters

Stale branches are not just clutter: they make `git branch -r --merged`
untrustworthy, hide which work is actually live, and inflate clone/fetch
times for contributors.