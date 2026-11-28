import { AsyncLocalStorage } from 'node:async_hooks';

// The request a piece of code runs for, so code far from the handler, such as a label lookup, can record its own stats.
export const scope = new AsyncLocalStorage<{ env: Env; ctx: ExecutionContext }>();
