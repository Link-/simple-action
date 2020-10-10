# gh-issues-ltt
> Extract action items from multiple issues and aggregate them into 1

## Demo

![gh-issues-ltt Demo GIF](./assets/gh-issues-ltt-demo.gif)

## Usage

### Pre-requisites
1. Create an empty **Issue** in the same repository that will be the container for action items.
2. Create a **label** with the name: `gh-issues-ltt`
3. Add the label `gh-issues-ltt` to the **Issue** you just created.

### Workflow setup
In your repository create the folders `.github/workflows` if they don't exist already. Inside `.github/workflows` create a new workflow file and name it whatever you like.

Copy and paste the workflow below to your workflow file.

**Make sure to:**
1. Use the latest version of `link-/gh-issues-ltt`
2. Update `<YOUR_USERNAME>` with your github handle

```
name: Synchronize Action Items
on:
  issues:
    types: [opened, edited]


jobs:
  Sync-Action-Items:
    runs-on: ubuntu-latest
    steps:
      - uses: link-/gh-issues-ltt@v0.1.0-beta
        id: sync_action_items
        with:
          user: "<YOUR_USERNAME>"
          repo: "${{ github.repository.repository_name }}"
          issueNumber: "${{ github.event.issue.number }}"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Limitations
- If the issue title has been modified, it'll be assumed as a new issue and a new block will be created.
- The aggregate issue and the label will not be created automatically for you. If they don't exist the action will fail.
- Using an aggregate issue in another repository is not possible.

## License
- [MIT License](./LICENSE)
