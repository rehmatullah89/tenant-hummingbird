'use strict'
/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */

const NEW_RELIC_LICENSE_KEY = process.env.NEW_RELIC_LICENSE_KEY
const NEW_RELIC_APP_NAME = process.env.NEW_RELIC_SERVICE_NAME

/**
 * Initialize NEW_RELIC_SLOW_SQL_ENABLED to true if the environment variable is not set or not equal to 'false'
 * @type {boolean}
 */
const NEW_RELIC_SLOW_SQL_ENABLED = process.env.NEW_RELIC_SLOW_SQL_ENABLED !== 'false';

/**
 * Initialize NEW_RELIC_MAX_SQL_SAMPLES with the value of the environment variable,
 * or default to 50 if the environment variable is not set or not a valid number
 * @type {number|number}
 */
const NEW_RELIC_MAX_SQL_SAMPLES = parseInt(process.env.NEW_RELIC_MAX_SQL_SAMPLES) || 100;

/**
 * Initialize NEW_RELIC_TRACER_ENABLED to true if the environment variable is not set or not equal to 'false'
 * @type {boolean}
 */
const NEW_RELIC_TRACER_ENABLED = process.env.NEW_RELIC_TRACER_ENABLED !== 'false';

/**
 * Initialize NEW_RELIC_EXPLAIN_THRESHOLD with the value of the environment variable,
 * or default to 500 milliseconds if the environment variable is not set or not a valid number
 * @type {number|number}
 */
const NEW_RELIC_EXPLAIN_THRESHOLD = parseInt(process.env.NEW_RELIC_EXPLAIN_THRESHOLD) || 500;

/**
 * Initialize NEW_RELIC_RECORD_SQL with the value of the environment variable,
 * or default to 'raw' if the environment variable is not set
 * @type {*|string}
 */
const NEW_RELIC_RECORD_SQL = process.env.NEW_RELIC_RECORD_SQL || 'raw';

exports.config = {
  /**
   * Array of application names.
   */
  app_name: [NEW_RELIC_APP_NAME],
  /**
   * Your New Relic license key.
   */
  license_key: NEW_RELIC_LICENSE_KEY,
  /**
   * This setting controls distributed tracing.
   * Distributed tracing lets you see the path that a request takes through your
   * distributed system. Enabling distributed tracing changes the behavior of some
   * New Relic features, so carefully consult the transition guide before you enable
   * this feature: https://docs.newrelic.com/docs/transition-guide-distributed-tracing
   * Default is true.
   */
  distributed_tracing: {
    /**
     * Enables/disables distributed tracing.
     *
     * @env NEW_RELIC_DISTRIBUTED_TRACING_ENABLED
     */
    enabled: true
  },
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'info'
  },
  /**
   * When true, all request headers except for those listed in attributes.exclude
   * will be captured for all traces, unless otherwise specified in a destination's
   * attributes include/exclude lists.
   */
  allow_all_headers: true,
  attributes: {
    /**
     * Prefix of attributes to exclude from all destinations. Allows * as wildcard
     * at end.
     *
     * NOTE: If excluding headers, they must be in camelCase form to be filtered.
     *
     * @env NEW_RELIC_ATTRIBUTES_EXCLUDE
     */
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  },
  /**
   * Slow queries variables
   * This section defines the Node.js agent variables in the order they typically appear
   * in the slow_sql: { section of your app's newrelic.js configuration file.
   * These options control behavior for slow queries, but do not affect SQL nodes in transaction traces.
   */
  slow_sql: {
    /**
     * When enabled, the agent collects slow query details.
     */
    enabled: NEW_RELIC_SLOW_SQL_ENABLED,
    /**
     * Defines the maximum number of slow queries the agent collects per minute. The agent discards additional queries after the limit is reached.
     */
    max_samples: NEW_RELIC_MAX_SQL_SAMPLES
  },
  transaction_tracer: {
    /**
     * When enabled, the agent collects slow transaction traces.
     */
    enabled: NEW_RELIC_TRACER_ENABLED,
    /**
     * Minimum query duration (in milliseconds) for a transaction to be eligible for slow queries in transaction traces.
     */
    explain_threshold: NEW_RELIC_EXPLAIN_THRESHOLD,
    /**
     * This option affects both slow queries and record_sql for transaction traces. It can have one of three values: off, obfuscated, or raw.
     * When set to off no slow queries will be captured, and backtraces and SQL will not be included in transaction traces. If set to raw or obfuscated, the agent sends raw or obfuscated SQL and a slow query sample to the collector. The agent may also send SQL when other criteria are met, such as when slow_sql.enabled is set.
     */
    record_sql: NEW_RELIC_RECORD_SQL
  }
}
