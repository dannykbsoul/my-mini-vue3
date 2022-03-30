import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  IS_SHALLOW = '__v_isShallow',
}

export function reactive(raw) {
  // 防止影响到内层的 reactive，如果已经是转换过的，直接返回
  if (isProxy(raw)) return raw;
  return createActiveObject(raw, mutableHandlers);
}

export function shallowReactive(raw) {
  return createActiveObject(raw, shallowReactiveHandlers);
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