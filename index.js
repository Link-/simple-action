const fakeCore = require("@actions/core");
const fetch = require("node-fetch");
const marked = require("marked")
const match = require("@menadevs/objectron");

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
function fetchIssues(params) {
  const headers = {
    "Authorization": `Bearer ${params.token}`,
    "Content-Type": "application/json"
  }
  const query = {
    "query": `
query {
  user(login: "${params.user}") {
    repository(name: "${params.repo}") {
      issues(first: 10, filterBy: {
        createdBy: "${params.user}",
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
      return res.data.user.repository.issues.nodes;
    })
    .catch(error => {
      console.log("FATAL: Could not fetch aggregate issue: ", error.message);
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
      console.log("FATAL: Could not fetch aggregate issue: ", error.message);
    });
}

/**
 * Gets a list of issues fetched from a repository and parses the markdown
 * to extract the action items
 * 
 * @param {*} issues Issues returned from fetchIssues()
 */
function extractActionItems(params, issues) {
  return new Promise((resolve, reject) => {
    const expected = []
    // Make sure the argument matches the expected format
    if (!match(issues, expected).match)
      throw new Error("FATAL: Fetched issues do not match expected format.")

    issues.forEach((issue) => {
      let tokens = marked.lexer(issue.body);
      const structure = [
        {
          type: 'heading',
          depth: 3,
          text: /(?<flag>[A|a]ction [I|i]tems)/,
        },
        {
          type: 'list',
          ordered: false,
          loose: false,
          items: (val) => val
        }
      ]
      // If we have a match of the expected structure
      // Extract the items from the list
      let result = match(tokens, structure);
      if (result.match) {
        // result.matches should contain 2 objects: 
        // - The first is the heading with the "Action Items" flag
        // - The second is the list of items
        // We will return the second object item in this case. An array
        // of list items
        // console.log(result.matches[1].items)
        resolve({
          extractionDate: getNow(),
          number: issue.number,
          items: result.matches[1].items
        })
      }
    });
    // If no action items were found, return an empty object
    reject({});
  });
}


function syncAggregateIssue(params, actionItems, aggregateIssue) {
  const parsedAggregateIssue = marked.lexer(aggregateIssue.body);
  console.log(parsedAggregateIssue);
  parsedAggregateIssue.forEach((block) => {
    const syncSection = match(
      block,
        {
          type: 'heading',
          depth: 4,
          text: /.*(?<issueNumber>#[0-9]*) - (?<date>.*)/
        }
    )
    console.log(syncSection);
  });
}

function main() {
  try {
    const variables = {
      user: core.getInput('user'),
      repo: core.getInput('repo'),
      token: process.env.GITHUB_TOKEN
    }
    core.info(`Fetching all tasks from ${variables.repo} of ${variables.user}`)

    const time = (new Date()).toTimeString();
    core.setOutput("time", time);

    // const data = await fetchIssues(variables.token, variables.user, variables.repo);

    core.info(`< 200 ${Date.now() - time}ms`);
    core.setOutput("data", JSON.stringify(data, null, 2));
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }
}

const params = {
  token: process.env.GITHUB_TOKEN,
  user: "Link-",
  repo: "gh-issues-ltt"
}

fetchIssues(params)
  .then((issues) => {
    // console.dir(issues, { depth: null });
    return extractActionItems(params, issues)
  })
  .then((actionItems) => {
    // console.dir(actionItems, { depth: null });
    return Promise.all([fetchAggregateIssue(params), actionItems]);
  })
  .then(([aggregateIssue, actionItems]) => {
    return syncAggregateIssue(params, actionItems, aggregateIssue);
  })
  // .catch(error => {
  //   console.log("FATAL: Could not sync aggregate issue: ", error.message);
  // });