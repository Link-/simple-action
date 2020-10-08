# gh-issues-ltt
> Extracts action items from issue and aggregates them into 1 issue

## Usage

```
name: Synchronize Action Items
on:
  issues:
    types: [opened, edited]


jobs:
  Sync-Action-Items:
    runs-on: ubuntu-latest
    steps:
      - uses: link-/gh-issues-ltt@v0.4-alpha
        id: sync_action_items
        with:
          user: "Link-"
          repo: "gh-issues-ltt"
          issueNumber: "${{ github.event.issue.number }}"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```