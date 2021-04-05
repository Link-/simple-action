# simple-action

> A very simple GitHub action implementing the command design pattern

## Context post

This repository is an example action adopting the design pattern discussed in this blog post: [Adopting the command design pattern for GitHub Actions](https://blog.bassemdy.com/2021/04/05/github/actions/design-patterns/command/best-practices/adopt-command-pattern-for-actions.html)

## Usage

### Workflow setup

If you introduce changes to the action, **don't forget to build**! The action's entry point is `dist/index.js` not `src/cli.js`. You can trigger a build by running: `npm run build`.

```yaml
name: Test Workflow

on:
  workflow_dispatch:

jobs:
  FirstJob:
    
    runs-on: ubuntu-latest
    
    steps:
      # Because the action is hosted in this same repository and it has not
      # been published to the marketplace, we have to checkout the repo
      # so that we can call the local action in the next steps
      - name: Checkout repository
        uses: actions/checkout@v2

      # Using the location action we pass the needed parameters and provide
      # the name of the command to call
      - name: "Get Issue Details Command"
        id: get_issue_details
        uses: ./
        with:
          command: get_issue_details
          token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: 1
          org: TEST_ORG
          repo: ${{ github.event.repository.name }}

      # Same as the previous step with different parameters supplied
      - name: "Get Comments Command"
        id: get_comments
        uses: ./
        with:
          command: get_comments
          token: ${{ secrets.GITHUB_TOKEN }}
          issue-number: 5

      # Print output from both steps
      - name: "Print results"
        run: |
          echo ${{ steps.get_issue_details.outputs.result }}
          echo ${{ steps.get_comments.outputs.result }}
```

## License

- [MIT License](./LICENSE)
