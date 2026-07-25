export interface IRule<T> {
  key: string;
  apply(value: T): boolean | Promise<boolean>;
}

export type RuleClassFn<T> = new () => IRule<T>;

export type RuleType<T> = IRule<T> | RuleClassFn<T>;

export abstract class Rule {
  key: string;

  abstract apply(value: any): boolean | Promise<boolean>;

  constructor() {
    this.key = this.constructor.name;
  }
}
