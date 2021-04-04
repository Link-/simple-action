# simple-action

> A very simple GitHub action implementing the command design pattern

## Context post

![](LINK TO BLOG POST)

## Usage

### Workflow setup

In your repository create the folders `.github/workflows` if they don't exist already. Inside `.github/workflows` create a new workflow file and name it whatever you like.

Copy and paste the workflow below to your workflow file.

**Make sure to:**

1. Use the latest version of `link-/gh-issues-ltt`
2. Update the label used to identify issue you want to sync `<SYNC_LABEL>` with a label name of choice
3. Update the **aggregateIssueLabel** `<IDENTIFYING_LABEL>` with the name of the identifying label you created in the pre-requisites
4. If you are using this action for repositories owned by an organization, make sure to specify the organization name in the `owner` input

```yaml
name: Simple Action

on:
  workflow_dispatch:

jobs:
  Do-Something:
    runs-on: ubuntu-latest
    steps:
      - name: "Simple Action"
        id: simple-action
        uses: link-/gh-issues-ltt@v0.1.1-beta
        if: ${{ contains(github.event.issue.labels.*.name, '<SYNC_LABEL>') }}
        with:
          owner: "${{ github.actor }}"
          repo: "${{ github.event.repository.name }}"
          issueNumber: "${{ github.event.issue.number }}"
          aggregateIssueLabel: "<IDENTIFYING_LABEL>"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## License

- [MIT License](./LICENSE)
