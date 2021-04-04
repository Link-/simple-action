const meta = require('../package.json');
const { Command } = require('commander');
const Invoker = require('./invoker');

const program = new Command();

program
  .version(meta.version)
  .option('-d, --debug', 'Output debugging information')
  .requiredOption('-c, --command <command name>', 'Command to execute')
  .option('-t, --token <token>', 'Personal Access Token or GITHUB_TOKEN')
  .option('-i, --issue-number <number>', 'Issue number')
  .option('-o, --org <org_name>', 'Organisation name')
  .option('-r, --repo <repo_name>', 'Repository name')
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
    console.log(`✨ OUTPUT: ${result}`);
  } catch (Error) {
    console.error(`⚠️  ERROR: ${Error.message}`);
  }
})()