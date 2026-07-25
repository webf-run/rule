# Simple business validation library.

The `@webf/rule` is a simple dependency free library to write declarative business-validation rules. For schema validations, use Zod, Joi or other schema validation library. Some features:

- Simple to use (Only four core APIs).
- Composable and declarative.
- Pragmatic over theoretical purity.

## Table of Content

- [Installation](#installation)
- [Usage](#usage)
- [Conditional validation](#conditional-validation)
- [Writing Rules](#writing-rules)
- [Attaching error context](#attaching-error-context)

## Installation

```bash
npm install --save @webf/rule
```

## Usage

Create a simple business rule:

```ts
import { Rule } from '@webf/rule';

// Step 1: Create a validator class.
export class DateShouldBeFuture extends Rule {
  /** Provider the `apply` method **/
  apply(date: Date): boolean {
    return compareDate(date, new Date()) >= 0;
  }
}

// Create a higher-order validator class that has depedencies.
export class AllowThisPastDate extends Rule {
  constructor(startDate: Date) {
    this.#startDate = startDate;
  }

  /** Async validator works too. */
  async apply(date: Date): Promise<boolean> {
    date.getTime() === date.getTime();
  }
}
```

Now, you are ready to use it using the `test` function:

```ts
import { test } from '@webf/rule';

// Step 2: Apply the validation rules.
type Payload = {
  date: Date;
  name: string;
};

async function validatePayload(payload: Payload) {
  const { date } = payload;

  // Some random past date
  const pastDate = new Date(new Date().getTime() - 24 * 3600 * 1000);

  try {
    // Throws if the validation fails
    await test(date, DateShouldBeFuture, new AllowThisPastDate(pastDate));
  } catch (e) {
    if (e instanceof AggregateError) {
      // Each error is instance of `RuleError` and exposes `ruleKey`
      // (plus optional `params` and `path`, see "Attaching error context").
      console.log(e.errors);
    }
  }
}
```

The `test` function takes variadic number of parameters where first parameter is the data to validate and rest of the parameters are either Validator classes or instance of validator classes. Use the instance of validator class if you have additional inputs that need to be made available when `test` calls the validator's `apply` method.

If you need to run multiple validators and catch all the errors at once, you can use `withCatch` function. The `check` function returned by `withCatch` simply adds the `catch` wrapper and collects all the errors into a single list.

```ts
import { withCatch } from '@webf/rule';

async function validatePayload(payload: Payload) {
  const { date, name } = payload;

  // Some random past date
  const pastDate = new Date(new Date().getTime() - 24 * 3600 * 1000);

  const { check, rejectIfError } = withCatch();

  // Does not throw if any error
  await check(date, DateShouldBeFuture, new AllowThisPastDate(pastDate));
  await check(name, NameShouldNotBeTaken);

  // If previous invocation of `check` function created errors then, throw.
  rejectIfError();
}
```

## Conditional validation

Validators are often applied conditionally, for example, "validate age only if optional value birthdate is provided". Instead of wrapping `test` in an `if` block, use `testIf` — a conditional alternative to `test` that evaluates a condition first and runs the rules only when it holds. A skipped validation is a pass.

```ts
import { testIf } from '@webf/rule';

// Precomputed boolean (or a Promise<boolean>)
await testIf(!!input.birthdate, input, EnsureAgeAbove25);

// Predicate over the value under test (sync or async)
await testIf((input: User) => input.country === 'USA', input, EnsureAgeAbove25);
```

The condition can be any of:

```ts
type Condition<T> =
  | boolean
  | Promise<boolean>
  | ((value: T) => boolean | Promise<boolean>);
```

When the condition holds, the rules run exactly as `test(value, ...rules)` would: failures throw the same `AggregateError` of `RuleError`s, so error handling does not change. An error thrown by the condition itself propagates unchanged — it is not collected as a rule failure.

The collector returned by `withCatch` has the matching `checkIf` function:

```ts
const { check, checkIf, rejectIfError } = withCatch();

await check(input.email, ValidEmail);
await checkIf(!!input.birthdate, input, EnsureAgeAbove25);

rejectIfError();
```

## Writing rules

A rule is basically an object of two fields `key` and `apply` function:

```ts
type IRule<T> = {
  key: string;
  apply(value: T): boolean | Promise<boolean>;
};
```

The `key` is a error key to identify the rule at runtime and `apply` is a function that should resolve to `boolean` or `Promise<boolean>` value. The rule work on one data type of of data and validates it. You can create a rule using object literal.

```ts
const MyRule = {
  key: 'MyRule',
  apply(value) {
    return value > 0;
  },
};
```

Or, you can use the base `Rule` class that automatically uses the class name as its `key` at runtime. This is the recommended way to write the rules as it also makes it easy to pass additional dependencies that a rule may need via constructor function.

```ts
import { Rule } from '@webf/rule';

export class MyRule extends Rule {
  apply(value) {
    return value >= 0;
  }
}
```

### Dependency injection

If your rule depends on more than one input for validation, e.g. another value to compare or pass DB client (of course, you should try to keep business logic as pure as possible), then you can use constructor function:

```ts
import { Rule } from '@webf/rule';

export class MyRule extends Rule {
  constructor(db) {
    super();
    this.db = db;
  }

  await apply(value) {
    const toCompare = await db.getValue();

    return value >= toCompare;
  }
}
```

## Attaching error context

Returning `false` reports _that_ a rule failed, but not _why_. When you need to
carry dynamic context (the offending value, allowed bounds, or the field that
failed), a rule can **throw a `RuleError`** instead of returning `false`. The
`test` and `withCatch` functions catch it and collect it just like any other
failure.

```ts
import { Rule, RuleError } from '@webf/rule';

export class MaxValue extends Rule {
  constructor(private max: number) {
    super();
  }

  apply(value: number): boolean {
    if (value <= this.max) {
      return true;
    }

    // Throw with structured context instead of returning `false`.
    throw new RuleError(this.key, {
      params: { max: this.max, actual: value },
    });
  }
}
```

The `RuleError` accepts an optional second argument:

```ts
type RuleErrorOptions = {
  /** Dynamic context describing why the rule failed, e.g. `{ min, max, actual }`. */
  params?: Record<string, unknown>;

  /** Field path the failure is associated with, e.g. `items[3].value`. */
  path?: string;

  /** Optional human-readable message. Defaults to `'Invalid rule'`. */
  message?: string;
};
```

When the aggregated error is caught, each `RuleError` exposes this context, so
you can build localized messages or map failures back to form fields:

```ts
try {
  await test(value, new MaxValue(10));
} catch (e) {
  if (e instanceof AggregateError) {
    for (const err of e.errors) {
      // err.ruleKey => 'MaxValue'
      // err.params  => { max: 10, actual: 42 }
      // err.path    => undefined (unless set)
    }
  }
}
```

Rules that don't need context can keep returning `boolean` as before, this is
purely additive.
