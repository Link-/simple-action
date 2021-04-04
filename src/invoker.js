const { command } = require('commander');
const commands = require('./commands');

class Invoker {
  constructor(options) {
    this.commandsList = {};
    this.options = options || null;
    this.loadCommands();
  }

  /**
   * Create a new instance of each command loaded from ./commands
   * and add it to the commandsList instance variable
   */
  loadCommands() {
    commands.reduce((accumulator, command) => {
      let instance = new command;
      accumulator[instance.name()] = instance;
      return accumulator;
    }, this.commandsList);
  }

  /**
   * Runs a number of checks and attemps to execute a command
   * @param {Object} options 
   * @returns 
   */
  async executeCommand(options) {
    // It's possible to supply an empty string as a command name so we have
    // to guard against this
    if (!options.command) {
      throw new Error("required option '-c, --command <command name>' command name must be supplied");
    }
    // We need to make sure the command name provided matches the name of one of
    // our loaded commands. Remember, loadCommands() uses the command name
    // as the key in the commandsList dictionary
    if (!(options.command in this.commandsList)) {
      throw new Error(`${options.command} not found in the loaded commands`)
    }
    const command = this.commandsList[options.command];
    // If all the checks pass, we're good to execute the command
    return await command.execute(options);
  }
}

module.exports = Invoker