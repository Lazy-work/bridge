import { useSyncExternalStore } from "react";
import { isRef, isProxy, type Ref } from "@vue-internals/reactivity/index";
import { SUBSCRIBE_KEY } from "./constants";

export function useVueRef<T>(initialValue: Ref<T>) {
  if (!isRef(initialValue)) {
    throw new Error("useRef only accepts Ref as initial value");
  }
  const value = useSyncExternalStore(
    (listener) => initialValue.subscribe(listener),
    () => initialValue.value
  );
  const setter = (newValue: T) =>
    typeof newValue === "function"
      ? (initialValue.value = newValue(initialValue.value))
      : (initialValue.value = newValue);

  return [value, setter];
}

export function useReactive<T extends object>(initialValue: T, keys: (keyof T)[]) {
  if (!isProxy(initialValue)) {
    throw new Error(
      "useReactive only accepts reactive object as initial value"
    );
  }

  let entries = [];
  let result;

  for (const key of keys) {
    entries.push([
      key,
      useSyncExternalStore(
        (listener) => initialValue[SUBSCRIBE_KEY](key, listener),
        () => initialValue[key]
      ),
    ]);
  }

  if (Array.isArray(initialValue)) {
    result = entries.map(([_, value]) => value);
  }

  if (initialValue instanceof Set) {
    result = new Set(entries.map(([_, value]) => value));
  }

  if (initialValue instanceof Map) {
    result = new Map(entries);
  }

  if (initialValue instanceof WeakMap) {
    result = new WeakMap(entries);
  }

  function set(key, value) {
    if (!keys.includes(key)) {
      throw new Error("key not found");
    }
    if (typeof value === "function") {
      initialValue[key] = value(initialValue[key]);
    } else {
      initialValue[key] = value;
    }
  }
  return [result, set];
}
