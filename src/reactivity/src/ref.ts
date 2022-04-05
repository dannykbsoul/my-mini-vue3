import { hasChanged, isArray, isObject } from "../../shared";
import { createDep } from "./dep";
import { isTracking, trackEffects, triggerEffects } from "./effective";
import { isProxy, reactive } from "./reactive";

class RefImpl {
  // ref只有一个值，只会对应一个dep
  public dep: any;
  public __v_isRef = true;
  private _value: any;
  private _rawValue: any;
  constructor(value, isShallow = false) {
    this._rawValue = value;
    // 如果 value 是 object，则需要用 reactive 包裹 value
    this._value = isShallow ? value : convert(value);
    this.dep = new Set();
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    // 新旧值对比的时候需要考虑到value是对象的时候，其实我们用reactive去包装了
    // 所以对比需要用包装前的值和现有的值做比较
    if (hasChanged(this._rawValue, newValue)) {
      // 先修改值 再执行trigger
      this._rawValue = newValue;
      this._value = convert(newValue);
      triggerRefValue(this);
    }
  }
}

class ObjectRefImpl {
  public readonly __v_isRef = true;

  constructor(
    private readonly _object,
    private readonly _key,
    private readonly _defaultValue
  ) {}

  get value() {
    const val = this._object[this._key];
    return val === undefined ? this._defaultValue : val;
  }

  set value(newVal) {
    this._object[this._key] = newVal;
  }
}

export function trackRefValue(ref) {
  isTracking() && trackEffects(ref.dep || (ref.dep = createDep()));
}

export function triggerRefValue(ref) {
  triggerEffects(createDep(ref.dep));
}

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

export function ref(value?: unknown) {
  return new RefImpl(value);
}

export function shallowRef(value?: unknown) {
  return new RefImpl(value, true);
}

export function toRef(target, key, defaultValue?) {
  const val = target[key];
  return isRef(val)
    ? val
    : new ObjectRefImpl(target, key, defaultValue);
}

export function toRefs(target) {
  if (!isProxy(target)) {
    console.warn(
      `toRefs() expects a reactive object but received a plain one.`
    );
  }
  const ret: any = isArray(target) ? new Array(target.length) : {};
  for (const key in target) {
    ret[key] = toRef(target, key);
  }
  return ret;
}

class CustomRef {
  // ref只有一个值，只会对应一个dep
  public dep: any;
  public __v_isRef = true;
  private _get: any;
  private _set: any;
  constructor(func) {
    const { get, set } = func(
      () => trackRefValue(this),
      () => triggerRefValue(this)
    );
    this._get = get;
    this._set = set;
  }
  get value() {
    return this._get();
  }
  set value(newVal) {
    this._set(newVal);
  }
}

export function customRef(func) {
  return new CustomRef(func);
}

export function isRef(ref) {
  return !!(ref && ref.__v_isRef);
}

export function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unref(Reflect.get(target, key));
    },
    set(target, key, newVal) {
      // 传过来的新值如果不是 ref 则需要.value替换
      // 如果是 ref 则需要整体替换
      if (isRef(Reflect.get(target, key)) && !isRef(newVal)) {
        return Reflect.get(target, key).value = newVal;
      } 
      return Reflect.set(target, key, newVal);
    },
  });
}