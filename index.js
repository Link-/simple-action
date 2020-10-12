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
 * Executes a GraphQL query to fetch the issue we're syncing.
 * Returns the data for the issue in a JSON format.
 *
 * @param {*} params 
 */
function fetchIssue(params) {
  const headers = {
    "Authorization": `Bearer ${params.token}`,
    "Content-Type": "application/json"
  }
  const query = {
    "query": `
query {
  repository(owner: "${params.owner}", name: "${params.repo}") {
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
      return res.data.repository.issue;
    })
    .catch(error => {
      core.info("FATAL: Could not fetch issue: ", error.message);
      core.info(error.stack);
    });
}


/**
 * Will fetch the first OPEN aggregate issue with the label 'gh-issues-ltt'
 *
 * @param {*} params 
 */
function fetchAggregateIssue(params) {
  const headers = {
    "Authorization": `Bearer ${params.token}`,
    "Content-Type": "application/json"
  }
  const query = {
    "query": `
query {
  repository(owner: "${params.owner}", name: "${params.repo}") {
    issues(first: 1, filterBy: {
      labels: ["${params.aggregateIssueLabel}"],
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
      return res.data.repository.issues.nodes[0];
    })
    .catch(error => {
      core.info("FATAL: Could not fetch aggregate issue: ", error.message);
      core.info(error.stack);
    });
}


/**
 * Get an issue fetched from a repository and parse the markdown
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
 * Push a new body of the aggregate issue
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
      core.info("FATAL: Could not update aggregate issue: ", error.message);
      core.info(error.stack);
    });
}


/**
 * Search the aggregate issue for a block matching the issue we're syncing.
 * If it exists, sync it.
 * Otherwise create a new block.
 * 
 * @param {*} params 
 * @param {*} actionItems 
 * @param {*} aggregateIssue 
 */
function syncAggregateIssue(params, actionItems, aggregateIssue) {
  if (Object.entries(aggregateIssue).length === 0)
    throw new Error('FATAL: Aggregate issue does not exist. Create it first and add the appropriate label.')
  const parsedAggregateIssue = marked.lexer(aggregateIssue.body);
  // Identify the heading and the list right below it that require change
  let syncHeading = {};
  let syncList = {};
  let index = 0;
  while (index < parsedAggregateIssue.length) {
    let block = parsedAggregateIssue[index];
    // For each of the blocks in the aggregate issue we extract the heading 
    // to check if a block belong to the issue we're syncing exists.
    // If we find it, we sync the action items and the date
    // otherwise we create a new block for the new issue
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
        // Push the new content to the aggregate issue
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
  return updateAggregateIssue(params, aggregateIssue);
}

/**
 * Main
 */
function main() {
  try {
    const params = {
      owner: core.getInput('owner'),
      repo: core.getInput('repo'),
      issueNumber: core.getInput('issueNumber'),
      aggregateIssueLabel: core.getInput('aggregateIssueLabel'),
      token: process.env.GITHUB_TOKEN
    }
    core.info(`Syncing all new action items in ${params.repo} from issue #${params.issueNumber}`);
    core.info(`INFO: Fetching details of issue #${params.issueNumber}`);
    // Fetch issue details and sync with aggregate issue
    fetchIssue(params)
      .then((issue) => {
        core.info("INFO: Extracting action items");
        return extractActionItems(params, issue)
      })
      .then((actionItems) => {
        core.info("INFO: Fetching aggregate issue details");
        return Promise.all([fetchAggregateIssue(params), actionItems]);
      })
      .then(([aggregateIssue, actionItems]) => {
        core.info("INFO: Looking for changes and syncing...");
        return syncAggregateIssue(params, actionItems, aggregateIssue);
      })
      .then(() => {
        core.info('< 200');
        core.setOutput(`INFO: Action items syncing completed successfully!`);
      })
      .catch(error => {
        core.debug(error);
        core.info(error.stack);
        core.setFailed(`FATAL: Could not sync aggregate issue: ${error.message}`);
      });
  } catch (error) {
    core.debug(error);
    core.info(error.stack);
    core.setFailed(error.message);
  }
}

// Execute
main();
