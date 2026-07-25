# Library Design

This document explains how `@webf/rule` is designed, and why. It shall help to decide if you want to use this library. In nutshell, the library takes its **inspiration** from functional validation (check everything, report every failure) but its **mechanics** from idiomatic TypeScript (exceptions, `try/catch`, promises). Every choice below is a pragmatic trade-off in that direction.

## The core model

A rule is the smallest possible unit: a named predicate.

```ts
type IRule<T> = {
  key: string;
  apply(value: T): boolean | Promise<boolean>;
};
```

There are three runners or evaluators. They all run rules over a single input value:

- `test(value, ...rules)`: runs every rule, throws one `AggregateError` containing a `RuleError` per failed rule.
- `testIf(condition, value, ...rules)`: conditional variant of `test`; a falsy condition skips the rules, and a skip is a pass.
- `withCatch()` — returns a collector (`check`, `checkIf`, `rejectIfError`) that accumulates failures across several runner calls and throws them as a single `AggregateError` at the end.

The `withCatch()` is closest to what Functional programming would refer to as **applicative**.

That is the whole library. Everything else is a consequence of the choices below.

TBD: Coming soon!
