# Branch cleanup

Stale or unmerged remote branches accumulate over time. Please consider cleaning up in GitHub or locally to keep the repository tidy.

```bash
# Fetch all refs
git fetch --all
# List verbose refs
git branch -avv | grep -i "gone"
# Delete remote branches that are already merged or no longer needed
git push origin --delete <branch>
```

Refer to the CONTRIBUTING guide for detailed instructions.
