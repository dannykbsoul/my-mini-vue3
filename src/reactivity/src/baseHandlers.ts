import { isObject } from "../../shared";
import { track, trigger } from "./effective";
import { reactive, ReactiveFlags, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

function createGetter(isReadonly = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }
    const res = Reflect.get(target, key);
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    !isReadonly && track(target, key);
    return res;
  }
}

function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    trigger(target, key);
    return res;
  };
}


export const mutableHandlers = {
  get,
  set,
}

export const readonlyHandlers = {
  get: readonlyGet,
  set: function set(target, key, value) {
    console.warn(`key:${key} set 失败，因为 tatget 是 readonly`, target);
    return true;
  },
};