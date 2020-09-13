const core = require("@actions/core");
const { Octokit } = require("@octokit/action");

try {
  const octokit = new Octokit();
  const variables = {
    user: core.getInput('user'),
    organization: core.getInput('organization')
  }
  core.info(`Fetching all tasks from ${variables.organization} of ${variables.user}`)

  const time = (new Date()).toTimeString();
  core.setOutput("time", time);

  const query = `
query {
  user(login: ${variables.user}) {
    organization(login: ${variables.organization}) {
      repositories(first: 10) {
        nodes {
          nameWithOwner
          issues(first: 10, filterBy: {
            createdBy: ${variables.user},
            states: OPEN,
          }) {
            nodes {
              title
              state
              author {
                login
              }
              body
            }
          }
        }
      }
    }
  }
}
`;

  const data = await octokit.graphql(query, variables);

  core.info(`< 200 ${Date.now() - time}ms`);
  core.setOutput("data", JSON.stringify(data, null, 2));
} catch (error) {
    core.debug(inspect(error));
    core.setFailed(error.message);
}