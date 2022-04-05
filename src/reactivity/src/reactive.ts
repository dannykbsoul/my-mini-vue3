import { toRawType } from "../../shared";
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  IS_SHALLOW = '__v_isShallow',
}

export const reactiveMap = new WeakMap();
export const shallowReactiveMap = new WeakMap();

const enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

function getTargetType(value) {
  return targetTypeMap(toRawType(value));
}

export function reactive(raw) {
  // 优先通过原始对象寻找之前创建的代理对象
  const existProxy = reactiveMap.get(raw);
  if (existProxy) return existProxy;
  // 防止影响到内层的 reactive，如果已经是转换过的，直接返回
  if (isProxy(raw)) return raw;
  const targetType = getTargetType(raw);
  if (targetType === TargetType.INVALID) {
    return raw;
  }
  const proxy = createActiveObject(
    raw,
    targetType === TargetType.COLLECTION
      ? null
      : mutableHandlers
  );
  reactiveMap.set(raw, proxy);
  return proxy;
}

export function shallowReactive(raw) {
  const existProxy = shallowReactiveMap.get(raw);
  if (existProxy) return existProxy;
  const proxy = createActiveObject(raw, shallowReactiveHandlers);
  shallowReactiveMap.set(raw, proxy);
  return proxy;
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandlers);
}

export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandlers);
}

function createActiveObject(raw, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}

// if value not wrapped will return undefined，so we need !! operator
export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isShallow(value) {
  return !!value[ReactiveFlags.IS_SHALLOW];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}