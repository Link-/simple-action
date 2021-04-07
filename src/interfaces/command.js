class Command {
  constructor (options) {
    if (this.constructor === Command) {
      throw new Error("Abstract classes can't be instantiated.")
    }
  }
  
  name () {
    throw new Error("Method 'name()' must be implemented first")
  }

  validate () {
    throw new Error("Method 'validate()' must be implemented first")
  }

  async execute () {
    throw new Error("Method 'execute()' must be implemented first")
  }
}

module.exports = Command
