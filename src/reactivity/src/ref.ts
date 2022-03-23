import { hasChanged, isObject } from "../../shared";
import { isTracking, trackEffects, triggerEffects } from "./effective";
import { reactive } from "./reactive";

class refImpl {
  // ref只有一个值，只会对应一个dep
  public dep: any;
  private _value: any;
  private _rawValue: any;
  constructor(value) {
    this._rawValue = value;
    // 如果 value 是 object，则需要用 reactive 包裹 value
    this._value = convert(value);
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
      triggerEffects(this.dep);
    }
  }
}

function trackRefValue(ref) {
  isTracking() && trackEffects(ref.dep);
}

function convert(value) {
  return isObject(value) ? reactive(value) : value;
}

export function ref(value) {
  return new refImpl(value);
}