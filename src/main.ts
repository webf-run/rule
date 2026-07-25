import { RuleError, type RuleErrorOptions } from './error.ts';
import { Rule, type IRule, type RuleType } from './rule.ts';

export type Condition<T> =
  | boolean
  | Promise<boolean>
  | ((value: T) => boolean)
  | ((value: T) => Promise<boolean>);

export type Collector = {
  /** Collects the errors against the failed rules and combine them into one while throwing. */
  check: <T>(value: T, ...rules: Array<RuleType<T>>) => Promise<void>;

  /** Same as `check`, but runs the rules only when the condition resolves truthy. */
  checkIf: <T>(
    condition: Condition<T>,
    value: T,
    ...rules: Array<RuleType<T>>
  ) => Promise<void>;

  /** Throws if there are some errors */
  rejectIfError: () => void;
};

/**
 * Creates a rule validator function which throws if any of the validators fail.
 */
export async function test<T>(
  value: T,
  ...rules: Array<RuleType<T>>
): Promise<void> {
  const errors: Set<Error> = new Set();

  for (const item of rules) {
    // If item is constructor, create instance of validator.
    // If item is already an instance, use it as is.
    const rule = typeof item === 'function' ? new item() : item;

    try {
      const isPass = await rule.apply(value);

      if (!isPass) {
        errors.add(new RuleError(rule.key));
      }
    } catch (err) {
      // A rule may throw a `RuleError` to signal a failure carrying dynamic
      // context (params, path, message). Any other error is unexpected and
      // propagates as-is.
      if (err instanceof RuleError) {
        errors.add(err);
      } else {
        throw err;
      }
    }
  }

  if (errors.size > 0) {
    throw new AggregateError(errors);
  }
}

/**
 * Conditional variant of `test`. Resolves the condition first; when it is
 * falsy the rules are skipped (a skip is a pass), otherwise the rules run
 * exactly as `test(value, ...rules)` would.
 */
export async function testIf<T>(
  condition: Condition<T>,
  value: T,
  ...rules: Array<RuleType<T>>
): Promise<void> {
  const shouldRun = await resolveCondition(condition, value);

  if (shouldRun) {
    await test(value, ...rules);
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

  const checkIf = async <T>(
    condition: Condition<T>,
    value: T,
    ...rules: Array<RuleType<T>>
  ) => {
    const shouldRun = await resolveCondition(condition, value);

    if (shouldRun) {
      await check(value, ...rules);
    }
  };

  const rejectIfError = () => {
    if (errors.length > 0) {
      throw new AggregateError(errors);
    }
  };

  return { check, checkIf, rejectIfError };
}

function resolveCondition<T>(
  condition: Condition<T>,
  value: T
): boolean | Promise<boolean> {
  return typeof condition === 'function' ? condition(value) : condition;
}

export { Rule, RuleError, type IRule, type RuleType, type RuleErrorOptions };
