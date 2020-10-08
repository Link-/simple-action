const core = require("@actions/core");
const fetch = require("node-fetch");
const marked = require("marked");

const GITHUB_API_URL = "https://api.github.com/graphql"

/**
 * Returns current date/time with the format: '2012-11-04 14:55:45'
 */
function getNow() {
  return new Date().toISOString().
    replace(/T/, ' ').      // replace T with a space
    replace(/\..+/, '')     // delete the dot and everything after
}


/**
 * Executes a GraphQL query to fetch the issues for a given repository
 * and returns the list of issues in a JSON format
 */
function fetchIssue(params) {
  const headers = {
    "Authorization": `Bearer ${params.token}`,
    "Content-Type": "application/json"
  }
  const query = {
    "query": `
query {
  user(login: "${params.user}") {
    repository(name: "${params.repo}") {
      issue(number: ${params.issueNumber}) {
        number
        id
        databaseId
        title
        state
        author {
          login
        }
        body
      }
    }
  }
}`
  };
  return fetch(GITHUB_API_URL, {
    method: "POST",
    body: JSON.stringify(query),
    headers: headers
  })
    .then(res => {
      return res.json();
    })
    .then(res => {
      // core.setOutput(res);
      return res.data.user.repository.issue;
    })
    .catch(error => {
      core.setOutput("FATAL: Could not fetch aggregate issue: ", error.message);
    });
}


/**
 * Will lookup the OPEN issue labled with: gh-issues-ltt
 * If more than 1 issue exists, it will return the first only
 */
function fetchAggregateIssue(params) {
  const headers = {
    "Authorization": `Bearer ${params.token}`,
    "Content-Type": "application/json"
  }
  const query = {
    "query": `
query {
  user(login: "${params.user}") {
    repository(name: "${params.repo}") {
      issues(first: 1, filterBy: {
        labels: ["gh-issues-ltt"],
        states: OPEN
      }) {
        nodes {
          number
          id
          databaseId
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
}`
  };
  return fetch(GITHUB_API_URL, {
    method: "POST",
    body: JSON.stringify(query),
    headers: headers
  })
    .then(res => {
      return res.json();
    })
    .then(res => {
      return res.data.user.repository.issues.nodes[0];
    })
    .catch(error => {
      core.setOutput("FATAL: Could not fetch aggregate issue: ", error.message);
    });
}


/**
 * Gets an issue fetched from a repository and parses the markdown
 * to extract the action items
 * 
 * @param {*} issue Issues returned from fetchIssues()
 */
function extractActionItems(params, issue) {
  return new Promise((resolve, reject) => {
    // We shouldn't handle more than 1 issue at a time
    let tokens = marked.lexer(issue.body);
    let headingPattern = /(?<flag>[A|a]ction [I|i]tems)/;
    let index = 0;
    while (index < tokens.length) {
      // We found the Action Items block
      if (tokens[index].type == 'heading' && headingPattern.test(tokens[index].text)) {
        resolve({
          extractionDate: getNow(),
          title: issue.title,
          number: issue.number,
          // The heading block should immediately be followed by the 
          // action items list. We only need its items for the next
          // step
          items: tokens[index + 1].items
        });
      }
      index++;
    }
    // If no action items were found, return an empty object
    resolve({});
  });
}


/**
 * 
 * @param {*} params 
 * @param {*} aggregateIssue 
 */
function updateAggregateIssue(params, aggregateIssue) {
  const headers = {
    "Authorization": `Bearer ${params.token}`,
    "Content-Type": "application/json"
  }
  const query = {
    "query": `
mutation ($updateIssueInput:UpdateIssueInput!) {
  updateIssue(input:$updateIssueInput) {
    clientMutationId
  }
}`,
    "variables": {
      "updateIssueInput": {
        "id": `"${aggregateIssue.id}"`,
        "body": `${aggregateIssue.body}`
      }
    }
  };
  // core.setOutput(query);
  return fetch(GITHUB_API_URL, {
    method: "POST",
    body: JSON.stringify(query),
    headers: headers
  })
    .then(res => {
      return res.json();
    })
    .then(res => {
      return res;
    })
    .catch(error => {
      core.setOutput("FATAL: Could not update aggregate issue: ", error.message);
    });
}


/**
 * 
 * @param {*} params 
 * @param {*} actionItems 
 * @param {*} aggregateIssue 
 */
function syncAggregateIssue(params, actionItems, aggregateIssue) {
  const parsedAggregateIssue = marked.lexer(aggregateIssue.body);
  // core.setOutput(actionItems);
  core.setOutput(actionItems)
  // Identify the heading and the list right below it that require change
  let syncHeading = {};
  let syncList = {};
  let index = 0;

  while (index < parsedAggregateIssue.length) {
    let block = parsedAggregateIssue[index];
    // core.setOutput(block);
    // When we have both the heading and the list. This assumes
    // the list comes after the heading matching.
    // It assumes the list belongs to the heading right above it
    const headingTextPattern = new RegExp(`.*(?<issueNumber>#${actionItems.number}) - (?<date>.*)`);
    let headingMatches = headingTextPattern.exec(block.text);
    if (block.type == "heading" && block.depth == 4 && headingMatches) {
      // Issue found - sync
      syncHeading = block;
      syncHeading["date"] = headingMatches.groups.date;
      syncList = parsedAggregateIssue[index + 1];
      // Extract the date from the heading to see if there are changes
      if (syncHeading.date !== actionItems.extractionDate) {
        const listReducer = (acc, item) => {
          return acc.concat(item.raw, "\r\n");
        };
        const newActionItemsList = actionItems.items.reduce(listReducer, "").replace(/[\n\r]+$/, '');
        const oldActionItemsList = syncList.items.reduce(listReducer, "").replace(/[\n\r]+$/, '');
        const oldHeading = syncHeading.raw.replace(/[\n\r]+/g, '');
        const newHeading = oldHeading.replace(
          new RegExp(` - (?<issueNumber>#${actionItems.number}) - (?<date>.*)`),
          ` - $<issueNumber> - ${actionItems.extractionDate}`
        );
        aggregateIssue.body = aggregateIssue.body.replace(oldHeading, newHeading).replace(oldActionItemsList, newActionItemsList);
        // aggregateIssue.body = aggregateIss"ue.body;
        // core.setOutput(oldActionItemsList, "\r\n", newActionItemsList);
        // core.setOutput("\r\n", aggregateIssue);
        // Push the changes to GitHub
        return updateAggregateIssue(params, aggregateIssue);
      } else {
        // Do nothing
        return;
      }
    }
    // Jumpt to next item
    index++;
  }
  // If the issue was not found - Add it
  const listReducer = (acc, item) => {
    return acc.concat(item.raw, "\r\n");
  };
  const newActionItemsList = actionItems.items.reduce(listReducer, "").replace(/[\n\r]+$/, '');
  // Issue not found - Create it
  const issueBody = `
\r
#### ${actionItems.title} - #${actionItems.number} - ${getNow()}
${newActionItemsList}
`
  aggregateIssue.body = aggregateIssue.body.concat(issueBody);
  // core.setOutput("\r\n", aggregateIssue);
  return updateAggregateIssue(params, aggregateIssue);
}

/**
 * 
 */
function main() {
  try {
    const params = {
      user: core.getInput('user'),
      repo: core.getInput('repo'),
      issueNumber: core.getInput('issueNumber'),
      token: process.env.GITHUB_TOKEN
    }
    core.info(`Syncing all new action items in ${params.repo} from issue #${params.issueNumber}`);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    core.setOutput(`INFO: Fetching details of issue #${params.issueNumber}`);
    // Fetch issue details and sync with aggregate issue
    fetchIssue(params)
      .then((issue) => {
        core.setOutput("INFO: Extracting action items");
        return extractActionItems(params, issue)
      })
      .then((actionItems) => {
        core.setOutput("INFO: Fetching aggregate issue details");
        return Promise.all([fetchAggregateIssue(params), actionItems]);
      })
      .then(([aggregateIssue, actionItems]) => {
        core.setOutput("INFO: Looking for changes and syncing...");
        return syncAggregateIssue(params, actionItems, aggregateIssue);
      })
      .catch(error => {
        core.debug(error);
        core.setFailed(`FATAL: Could not sync aggregate issue: ${error.message}`);
      })
      .finally(() => {
        core.info(`< 200 ${Date.now() - time}ms`);
        core.setOutput(`INFO: Action items syncing completed successfully!`);
      });
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }
}

// Execute
main();
