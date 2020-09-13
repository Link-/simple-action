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
      - uses: octokit/graphql-action@v2.x
        id: fetch_issues
        with:
          user: "Link-"
          organization: "Nebuchadnezzar-Corp"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - run: "echo ${{ steps.fetch_issues.outputs.data }}'"
```