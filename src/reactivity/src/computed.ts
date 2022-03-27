import { createDep } from "./dep";
import { ReactiveEffect, triggerEffects } from "./effective";
import { trackRefValue } from "./ref";

class ComputedRefImpl {
  public dep: any;
  private _getter: any;
  private _dirty = true;
  private _value: any;
  private _effect: any;
  constructor(getter) {
    this._getter = getter;
    this.dep = new Set();
    // 巧妙的运用了 effect 的 scheduler，当 getter 依赖的响应式对象发生 set 的时候
    // 此时会调用 scheduler，将 _dirty 置为 true，当下次调用 .value 的时候，会去执行 this._effect.run();
    // 此时 _dirty 为 false，当接下来没有响应式对象发生 set，调用 .value，直接返回 this._value，实现缓存
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerEffects(createDep(this.dep));
      }
    });
  }
  get value() {
    trackRefValue(this);
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run();
    }
    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter);
}