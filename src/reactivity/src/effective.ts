import { extend, isArray } from "../../shared";
import { ITERATE_KEY, TriggerType } from "./baseHandlers";
import { createDep } from "./dep";

let activeEffect;
let shouldTrack;
// 当嵌套 effect 存在时，activeEffect就不够用了，因为当嵌套的 activeEffect 激活的时候就会覆盖上一个 activeEffect
// 此时内层的 activeEffect执行完，需要找到外层的 activeEffect，所以需要一个 stack 来存储
const effectStack: unknown[] = [];
export class ReactiveEffect {
  private _fn: any;
  deps = [];
  active = true;
  onStop?: () => void;
  public scheduler: Function | undefined;
  constructor(fn, scheduler?: Function) {
    this._fn = fn;
    this.scheduler = scheduler;
  }
  run() {
    // 每次都需要清除一次依赖再去收集依赖，用于分支切换
    cleanupEffect(this);
    if (!this.active) {
      return this._fn();
    }
    shouldTrack = true;
    activeEffect && effectStack.push(activeEffect);
    activeEffect = this;
    const result = this._fn();
    // 执行完当前的 effect，需要还原之前的 effect
    activeEffect = effectStack.pop();
    // activeEffect 为空代表没有要执行的 effect，此时 shouldTrack 关闭
    !activeEffect && (shouldTrack = false);
    return result;
  }
  stop() {
    // 确保反复执行 stop 只清空一次
    if (this.active) {
      cleanupEffect(this);
      this.onStop && this.onStop();
      this.active = false;
    }
  }
}

function cleanupEffect(effect) {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
  effect.deps.length = 0;
}

// why use WeakMap？
// 因为 targetMap 都是对象作为键名，但是对键名所引用的对象是弱引用，不会影响垃圾回收机制
// 只要所引用的对象的其他引用都被清除，垃圾回收机制就会释放该对象所占用的内存。
// 也就是说，一旦不再需要，WeakMap 里面的键名对象和所对应的键值对会自动消失，不用手动删除引用。
// 应用场景
// WeakMap 经常用于存储那些只有当 key 所引用的对象存在时才有价值的信息，例如这里的 targetMap 对应的 target，
// 如果 target 对象没有任何的引用了，说明用户侧不再需要它了，此时如果用 Map 的话，即使用户侧的代码对 target 没有任何引用，
// 这个 target 也不会被回收，最后可能导致内存溢出
const targetMap = new WeakMap();
export function track(target, key) {
  // 没有 activeEffect，也就没有必要进行依赖收集
  if (!isTracking()) return;
  // target -> key -> deps(effect)
  // 这样的映射关系可以精确的实现响应式
  // 取出 depsMap，数据类型是 Map: key -> deps(effect)
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  // 根据 key 取出 deps，数据类型是 Set
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  trackEffects(dep);
}

export function trackEffects(dep) {
  if (dep.has(activeEffect)) return;
  dep.add(activeEffect);
  // activeEffect中去记录dep
  activeEffect.deps.push(dep);
}

export function isTracking() {
  return shouldTrack && activeEffect;
}

export function pauseTracking() {
  shouldTrack = false;
}

export function enableTracking() {
  shouldTrack = true;
}

export function trigger(target, key, type, value?) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  // const deps = depsMap.get(key) || [];
  let deps: any = [];
  // 如果新增了 key，需要触发之前 for in 收集到的 effect
  // delete 会影响 for ... in的遍历结果，所以也需要触发它的依赖
  const iterateDeps =
    (type === TriggerType.ADD || TriggerType.DEL ? depsMap.get(ITERATE_KEY) : []) || [];
  // 数组 set length，会触发 length 的effect，以及修改 length 导致部分数组元素的变更
  // 比如 arr = [1, 2, 3]，此时设置arr.length = 1; 会导致arr[1]、arr[2]这两个元素发生变更，即要触发相应的副作用函数
  // 同样 如果数组情况下是 ADD 的情况，则同样需要触发 length 的副作用函数
  if (isArray(target)) {
    // length 触发会影响到数组元素的变更
    if (key === "length") {
      depsMap.forEach((dep, key) => {
        if (key === "length" || Number(key) >= value) {
          deps.push(...dep);
        }
      })
    }
    // 新增了元素也需要触发 length 绑定的副作用函数
    if (type === TriggerType.ADD) {
      deps.push(...(depsMap.get("length")) || []);
    }
    if (type === TriggerType.SET) {
      deps.push(...(depsMap.get(key) || []));
    }
  } else {
    deps.push(...(depsMap.get(key)||[]));
  }
  // deps执行前进行保存，防止陷入死循环
  triggerEffects(createDep([...deps, ...iterateDeps]));
}

export function triggerEffects(deps) {
  for (const effect of deps) {
    // 当前执行的 activeEffect 与trigger触发的 effect 相同，则不触发执行
    if (effect === activeEffect) return;
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

export function stop(runner) {
  runner.effect.stop();
}

export function effect(fn, options: any = {}) {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options);
  !options.lazy && _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}