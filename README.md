# gh-issues-ltt
> Extracts lists from a GitHub Issue and Transforms them to Tasks

## Usage

```
name: Fetch issues
on:
  schedule:
    - cron:  '*/5 * * * *'


jobs:
  fetchIssues:
    runs-on: ubuntu-latest
    steps:
      - uses: link-/gh-issues-ltt@v0.1-alpha
        id: fetch_issues
        with:
          user: "Link-"
          organization: "Nebuchadnezzar-Corp"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: "echo ${{ steps.fetch_issues.outputs.data }}'"
```