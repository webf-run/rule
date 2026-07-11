export interface RuleErrorOptions {
  /** Dynamic context describing why the rule failed (e.g. `{ min, max, actual }`). */
  params?: Record<string, unknown>;

  /** Field path the failure is associated with (e.g. `labParameters[3].value`). */
  path?: string;

  /** Optional human-readable message. Defaults to `'Invalid rule'`. */
  message?: string;
}

export class RuleError extends Error {
  ruleKey: string;
  params?: Record<string, unknown>;
  path?: string;

  constructor(ruleKey: string, options?: RuleErrorOptions) {
    super(options?.message ?? 'Invalid rule');
    this.ruleKey = ruleKey;
    this.params = options?.params;
    this.path = options?.path;
  }
}
