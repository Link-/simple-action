const meta = require('../package.json');
const Invoker = require('./invoker');
const core = require('@actions/core')
const { Command } = require('commander');

const program = new Command();

/**
 * We make use of the default option to fetch the input from our action
 * with core.getInput() only when a value has not been supplied via the CLI.
 * What this means is that, if you provide these parameters the values from
 * the action will be ignored.
 * 
 * This will guarantee that this tool will operate as an action but has an
 * alternative trigger via the CLI.
 */
program
  .version(meta.version)
  .option('-c, --command <command name>', 'Command to execute', core.getInput('command'))
  .option('-t, --token <token>', 'Personal Access Token or GITHUB_TOKEN', core.getInput('token'))
  .option('-i, --issue-number <number>', 'Issue number', core.getInput('issue-number'))
  .option('-o, --org <org_name>', 'Organisation name', core.getInput('org'))
  .option('-r, --repo <repo_name>', 'Repository name', core.getInput('repo'))
  .parse();

/**
 * await won’t work in the top-level code so we have to wrap it with an
 * anonymous async function and invoke it
 *
 * More details: https://javascript.info/async-await
 */
(async () => {
  try {
    const options = program.opts();
    const invoker = new Invoker(options);
    const result = await invoker.executeCommand(options);
    core.setOutput(result);
  } catch (Error) {
    core.setFailed(` ⚠️  ${Error.message}`);
  }
})()