# simple-action

> A very simple GitHub action implementing the command design pattern

## Context post

![](LINK TO BLOG POST)

## Usage

### Workflow setup

```yaml
name: Test Workflow

on:
  workflow_dispatch:

jobs:
  FirstJob:
    
    runs-on: ubuntu-latest
    
    steps:
      - name: "Get Issue Details Command"
        uses: ./
        with:
          commmand: "get_issue_details"
          token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: "1"
          org: "TEST_ORG"
          repo: "${{ github.event.repository.name }}"
      - name: "Get Comments Command"
        uses: ./
        with:
          commmand: "get_comments"
          token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: "1"
```

## License

- [MIT License](./LICENSE)
