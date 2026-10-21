/**
 * Base Abstract Execution Adapter
 * Defines the contract that all isolated sandbox providers (Judge0, Piston, etc.) must implement.
 */

export class ExecutionAdapter {
  constructor(name) {
    this.name = name;
  }

  /**
   * Executes code in an isolated remote container.
   *
   * @param {Object} params
   * @param {string} params.executionId
   * @param {string} params.code
   * @param {string} params.language
   * @param {string} params.stdin
   * @param {string|null} params.expectedOutput
   * @param {Object} params.resourceLimits
   * @returns {Promise<Object>} Formatted execution response contract
   */
  async execute(params) {
    throw new Error(`execute() must be implemented by concrete adapter [${this.name}].`);
  }

  /**
   * Returns provider operational status and configuration metadata.
   *
   * @returns {Object} Safe provider status metadata
   */
  getStatus() {
    return {
      provider: this.name,
      configured: false,
      ready: false,
    };
  }
}
