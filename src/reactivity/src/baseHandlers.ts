import { extend, hasChanged, hasOwn, isObject } from "../../shared";
import { track, trigger } from "./effective";
import { reactive, ReactiveFlags, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

export const ITERATE_KEY = Symbol();
export const enum TriggerType {
  SET = "SET",
  ADD = "ADD",
  DEL = "DEL",
}

function createGetter(isReadonly = false, isShallow = false) {
  // 
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }
    // 代理对象可以通过 raw 属性访问到原始数据
    if (key === "raw") {
      return target;
    }

    const res = Reflect.get(target, key);
    if (isShallow) return res;
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    !isReadonly && track(target, key);
    return res;
  }
}

function createSetter() {
  return function set(target, key, value, reveiver) {
    const type = hasOwn(target, key)
      ? TriggerType.SET
      : TriggerType.ADD;
    const oldValue = Reflect.get(target, key);
    const res = Reflect.set(target, key, value);
    // reveiver 就是 target 的代理对象，此时才会去考虑触发
    if (reveiver.raw === target) {
      hasChanged(oldValue, value) && trigger(target, key, type);
    }
    return res;
  };
}

function deleteProperty(target, key) {
  // 检查被操作的属性是否是对象自己的属性
  const hadKey = hasOwn(target, key);
  const result = Reflect.deleteProperty(target, key);
  // 只有当被删除的属性是对象自己的属性 并且 删除成功的时候，才会去触发更新
  if (hadKey && result) {
    trigger(target, key, TriggerType.DEL);
  }
  return result;
}

// key in obj 类似的操作
function has(target, key) {
  track(target, key);
  return Reflect.has(target, key);
}

// for ... in 类似的操作
// 对象属性新增才需要触发
function ownKeys(target) {
  track(target, ITERATE_KEY);
  return Reflect.ownKeys(target);
}


export const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
};

export const readonlyHandlers = {
  get: readonlyGet,
  set: function set(target, key, value) {
    console.warn(`Set operation on key "${key}" failed: target is readonly.`);
    return true;
  },
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet,
});