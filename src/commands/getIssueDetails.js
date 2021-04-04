const Command = require('../interfaces/command')

class GetIssueDetails extends Command {
  constructor() {
    super()
  }

  name() {
    return 'get_issue_details';
  }

  /**
   * Run all the validations necessary before you attempt to execute
   * the command. Here we are doing a simple test just to illustrate the
   * purpose of this method.
   *
   * @param {Object} options 
   * @returns validation result
   */
  validate(options) {
    if (Object.keys(options).length <= 2) {
      throw new Error(`Command options must be provided`);
    }
    return 'validate()';
  }

  /**
   * Attempts to execute the work
   *
   * @param {Object} options
   * @returns Result of the execution
   */
  async execute(options) {
    this.validate(options);
    return JSON.stringify({
      'status': 'OK',
      'output': `${this.name()} executed successfully 🙌`
    });
  }
}

module.exports = GetIssueDetails