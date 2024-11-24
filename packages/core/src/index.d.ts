import type Context from './context';

export { $bridge, createHook, usePlugin } from './management';
export type { BridgePlugin, BridgePluginClass } from './plugins'
export * from './plugins/hook-manager'

export {
  ReactiveEffect,
  activeSub,
  resetTracking,
  pauseTracking,
  enableTracking,
  shouldTrack,
  startBatch,
  endBatch,
  stop,
  onEffectCleanup,
  refreshComputed,
  EffectFlags
} from '@vue-internals/reactivity/effect';

export type {
  DebuggerEvent,
  DebuggerEventExtraInfo,
  DebuggerOptions,
  EffectScheduler,
  ReactiveEffectOptions,
  ReactiveEffectRunner,
  Subscriber
} from '@vue-internals/reactivity/effect';


export {
  Dep,
  Link,
  track,
  trigger,
  getDepFromReactive,
  globalVersion,
  ARRAY_ITERATE_KEY,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY
} from '@vue-internals/reactivity/dep';

import type Context from './context';
export type ComponentInternalInstance = Context;
export declare function getCurrentInstance(): ComponentInternalInstance;
export declare function setCurrentInstance(instance: ComponentInternalInstance): () => void;

export {
  queueJob,
  queuePostFlushCb,
  flushJobsUntil,
  flushPostJobsUntil,
  flushPreFlushCbs,
  flushPostFlushCbs,
  switchToAuto,
  switchToManual,
  toggleMode,
  getJobAt,
  nextTick,
  endFlush,
  SchedulerJobFlags,
} from '@vue-internals/runtime-core/scheduler';

export type {
  SchedulerJob,
  SchedulerJobs,
} from '@vue-internals/runtime-core/scheduler';

export * from './lifecycle';
export * from './conditional';
