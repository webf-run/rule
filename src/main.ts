import { RuleError } from './error.js';

export interface IRule<T> {
  key: string;
  apply(value: T): boolean | Promise<boolean>;
}

export type RuleClassFn<T> = new () => IRule<T>;

export type RuleType<T> = IRule<T> | RuleClassFn<T>;

export type Collector = {
  /** Collects the errors against the failed rules and combine them into one while throwing. */
  check: <T>(value: T, ...rules: Array<RuleType<T>>) => Promise<void>;

  /** Throws if there are some errors */
  rejectIfError: () => void;
};

export abstract class Rule {
  key: string;

  abstract apply(value: any): boolean | Promise<boolean>;

  constructor() {
    this.key = this.constructor.name;
  }
}

/**
 * Creates a rule validator function which throws if any of the validators fail.
 */
export async function test<T>(value: T, ...rules: Array<RuleType<T>>): Promise<void> {
  const errors: Set<Error> = new Set();

  for (const item of rules) {
    // If item is constructor, create instance of validator.
    // If item is already an instance, use it as is.
    const rule = typeof item === 'function' ? new item() : item;
    const isPass = await rule.apply(value);

    if (!isPass) {
      errors.add(new RuleError(rule.key));
    }
  }

  if (errors.size > 0) {
    throw new AggregateError(errors);
  }
}


export function withCatch(): Collector {
  const errors: Error[] = [];

  const check = async <T>(value: T, ...rules: Array<RuleType<T>>) => {
    try {
      await test(value, ...rules);
    } catch (err) {
      if (err instanceof AggregateError) {
        errors.push(...err.errors);
        return;
      }

      // If it is not an aggregate error, then re-throw it.
      throw err;
    }
  };

  const rejectIfError = () => {
    if (errors.length > 0) {
      throw new AggregateError(errors);
    }
  };

  return { check, rejectIfError };
}

export { RuleError };
