import {
  ok,
  deepEqual,
  equal,
  rejects,
  throws,
  doesNotReject,
  doesNotThrow,
} from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { Rule, RuleError, test, testIf, withCatch } from './main.ts';

class AlwaysFails extends Rule {
  apply(_value: number): boolean {
    return false;
  }
}

class AlwaysPasses extends Rule {
  apply(_value: number): boolean {
    return true;
  }
}

class SpyRule extends Rule {
  calls: unknown[] = [];

  apply(value: unknown): boolean {
    this.calls.push(value);
    return true;
  }
}

class MaxValue extends Rule {
  private max: number;

  constructor(max: number) {
    super();
    this.max = max;
  }

  apply(value: number): boolean {
    if (value <= this.max) {
      return true;
    }

    throw new RuleError(this.key, {
      params: { max: this.max, actual: value },
      path: 'value',
    });
  }
}

function ruleKeys(err: unknown): string[] {
  ok(err instanceof AggregateError);

  return err.errors.map((e: unknown) => {
    ok(e instanceof RuleError);

    return e.ruleKey;
  });
}

describe('testIf()', () => {
  it('should run the rules when the condition is true', async () => {
    /// SUT: System Under Test
    const result = testIf(true, 100, AlwaysFails);

    /// Verify result
    await rejects(result, (err: unknown) => {
      deepEqual(ruleKeys(err), ['AlwaysFails']);
      return true;
    });
  });

  it('should skip the rules when the condition is false', async () => {
    /// Setup data
    const spy = new SpyRule();

    /// SUT: System Under Test
    await testIf(false, 100, spy, AlwaysFails);

    /// Verify result - behavior
    equal(spy.calls.length, 0);
  });

  it('should work with a promise condition', async () => {
    /// SUT: System Under Test
    const resultProcess = testIf(Promise.resolve(true), 100, AlwaysFails);
    const resultSkip = testIf(Promise.resolve(false), 100, AlwaysFails);

    /// Verify result
    await rejects(resultProcess);
    await doesNotReject(resultSkip);
  });

  it('should work with predicate function as condition', async () => {
    /// Setup data
    const predicate = mock.fn(() => true);

    /// SUT: System Under Test
    await rejects(testIf(predicate, 100, AlwaysFails));
    await rejects(testIf(predicate, 101, AlwaysFails));

    /// Verify result - behavior
    equal(predicate.mock.callCount(), 2);
  });

  it('should run rules based on the predicate result', async () => {
    /// Setup data
    const predicate = (v: number) => v > 10;

    /// SUT: System Under Test & Verify result
    await rejects(testIf(predicate, 100, AlwaysFails));
    await doesNotReject(testIf(predicate, 5, AlwaysFails));
  });

  it('should work with async predicate', async () => {
    /// Setup data
    const predicate = (v: number) => Promise.resolve(v > 10);

    /// SUT: System Under Test & Verify result
    await rejects(testIf(predicate, 100, AlwaysFails));
    await doesNotReject(testIf(predicate, 5, AlwaysFails));
  });

  it('should resolve when rules pass under a truthy condition', async () => {
    /// SUT: System Under Test & Verify result
    await testIf(true, 100, AlwaysPasses);
  });

  it('should preserve RuleError context from failing rules', async () => {
    await rejects(testIf(true, 100, new MaxValue(10)), (err: unknown) => {
      ok(err instanceof AggregateError);

      const [ruleError] = err.errors;
      ok(ruleError instanceof RuleError);
      equal(ruleError.ruleKey, 'MaxValue');
      deepEqual(ruleError.params, { max: 10, actual: 100 });
      equal(ruleError.path, 'value');

      return true;
    });
  });

  it('should propagate errors thrown by the condition itself', async () => {
    /// Setup data
    const boom = new Error('condition failed');
    const failingPredicate = () => Promise.reject(boom);

    /// SUT: System Under Test & Verify result
    await rejects(
      testIf(failingPredicate, 100, AlwaysFails),
      (err: unknown) => err === boom
    );
  });

  it('should work with rule classes and rule instances, like test', async () => {
    /// SUT: System Under Test
    const result = testIf(true, 100, AlwaysFails, new MaxValue(10));

    /// Verify result
    await rejects(result, (err: unknown) => {
      deepEqual(ruleKeys(err), ['AlwaysFails', 'MaxValue']);
      return true;
    });
  });
});

describe('withCatch checkIf()', () => {
  it('should collect nothing when the condition is false', async () => {
    /// Setup data
    const { checkIf, rejectIfError } = withCatch();

    /// SUT: System Under Test
    await checkIf(false, 100, AlwaysFails);

    /// Verify result
    doesNotThrow(rejectIfError);
  });

  it('should accumulate errors from checkIf and check into one AggregateError', async () => {
    /// Setup data
    const { check, checkIf, rejectIfError } = withCatch();

    /// SUT: System Under Test
    await checkIf(true, 100, AlwaysFails);
    await check(99, new MaxValue(10));

    /// Verify result
    throws(rejectIfError, (err: unknown) => {
      deepEqual(ruleKeys(err), ['AlwaysFails', 'MaxValue']);
      return true;
    });
  });
});

describe('test()', () => {
  it('should aggregate plain failures and thrown RuleErrors', async () => {
    await rejects(
      test(100, AlwaysFails, AlwaysPasses, new MaxValue(10)),
      (err: unknown) => {
        deepEqual(ruleKeys(err), ['AlwaysFails', 'MaxValue']);
        return true;
      }
    );
  });
});
