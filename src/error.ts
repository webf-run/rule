export class RuleError extends Error {
  ruleKey: string;

  constructor(ruleKey: string) {
    super('Invalid rule');
    this.ruleKey = ruleKey;
  }
}
