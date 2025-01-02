# `@webf/rule` - Simple business validation library.

A simple library to write declarative business-validation rules. For schema validations, use Zod, Joi or other schema validation library.

## Installation

```bash
npm install --save @webf/rule@latest
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
  const pastDate = new Date(new Date().getTime() - (24 * 3600 * 1000));

  try {
    // Throws if the validation fails
    await test(date, DateShouldBeFuture, new AllowThisPastDate(pastDate));
  } catch (e) {
    if (e instanceof AggregateError) {
      // Each error is instance of `RuleError`.
      console.log(e.errors);
    }
  }
}
```
The `test` function takes variadic number of parameters where first parameter is the data to validate and rest of the parameters are either Validator classes or instance of validator classes. Use the instance of validator class if you have additional inputs that need to be made available when `test` calls the validator's `apply` method.

If you need to run multiple validators and catch all the errors at once, you can ues `withCatch` function. The `check` function returned by `withCatch` simply adds the `catch` wrapper and collects all the errors into a single list.

```ts
import { withCatch } from '@webf/rule';

async function validatePayload(payload: Payload) {
  const { date, name } = payload;

  // Some random past date
  const pastDate = new Date(new Date().getTime() - (24 * 3600 * 1000));

  const { check, rejectIfError } = withCatch();

  // Does not throw if any error
  await check(date, DateShouldBeFuture, new AllowThisPastDate(pastDate));
  await check(name, NameShouldNotBeTaken);

  // If previous invocation of `check` function created errors then, throw.
  rejectIfError();
}
```
