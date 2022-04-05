import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject, isSymbol } from "../../shared";
import { enableTracking, pauseTracking, track, trigger } from "./effective";
import { reactive, ReactiveFlags, readonly } from "./reactive";
import { isRef } from "./ref";

// 对于一些内置的 symbol 类型，不希望收集依赖
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map((key) => (Symbol as any)[key])
);

const get = createGetter();
const set = createSetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const arrayInstrumentations = createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations = {};
  ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
    const originMethod = Array.prototype[key];
    instrumentations[key] = function (...args: any) {
      let res = originMethod.apply(this, args);

      if (!res) {
        res = originMethod.apply((this as any).raw, args);
      }
      return res;
    };
  });
  ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
    const originMethod = Array.prototype[key];
    instrumentations[key] = function (...args: any) {
      // 暂停 track
      pauseTracking();
      let res = originMethod.apply(this, args);
      // 恢复 track
      enableTracking();
      return res;
    };
  });
  return instrumentations;
}

export const ITERATE_KEY = Symbol();
export const enum TriggerType {
  SET = "SET",
  ADD = "ADD",
  DEL = "DEL",
}

function createGetter(isReadonly = false, isShallow = false) {
  return function get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
    }
    // 代理对象可以通过 raw 属性访问到原始数据
    if (key === "raw") {
      return target;
    }

    if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    // key 是内置 symbol 类型，不希望收集依赖
    if (!isReadonly && !(isSymbol(key) && builtInSymbols.has(key))) {
      // 只读的情况 不需要依赖收集
      track(target, key);
    }
    const res = Reflect.get(target, key);
    if (isShallow) return res;
    // 深响应
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}

function createSetter() {
  return function set(target, key, value, reveiver) {
    const type = isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
        ? TriggerType.SET
        : TriggerType.ADD
      : hasOwn(target, key)
        ? TriggerType.SET
        : TriggerType.ADD;
    const oldValue = Reflect.get(target, key);
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
    }
    const res = Reflect.set(target, key, value);
    // reveiver 就是 target 的代理对象，此时才会去考虑触发
    if (reveiver.raw === target) {
      hasChanged(oldValue, value) && trigger(target, key, type, value);
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
// 对象属性新增、删除才需要触发
// for ... in 操作对于数组也是可以遍历，哪些操作会影响到 for ... in的遍历
// 1. 添加新元素 arr[100] = 1;
// 2. 修改数组长度 arr.length = 0;
// 无论是新增还是修改数组长度，本质都是 length 的变化，所以将 length 与副作用函数绑定在一起
// 将来 length 变化的时候去触发相应的副作用函数
function ownKeys(target) {
  track(target, isArray(target) ? "length" : ITERATE_KEY);
  return Reflect.ownKeys(target);
}


export const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys,
};

export const shallowReactiveHandlers = extend({}, mutableHandlers, {
  get: shallowGet,
});

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