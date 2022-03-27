import { isFunction, isObject } from "../../shared";
import { effect } from "./effective";

// source 为 watch 的响应式对象 or 函数
// 函数可以指定该 watch 依赖哪些响应式数据
export function watch(source, cb, options?: any) {
  let getter;
  if (isFunction(source)) {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let oldValue, newValue;

  // 用来存储用户注册的过期回调
  let cleanup;

  function onInvalidate(fn) {
    // 将过期 cb 存储到 cleanup 中
    cleanup = fn;
  }

  const job = () => {
    // 在 scheduler 中重新执行 effect，得到 newValue
    newValue = effectFn();
    // 在调用当前函数之前，先调用上一个 cb 传过来过期函数
    if (cleanup) cleanup();
    cb(newValue, oldValue, onInvalidate);
    // 更新 oldValue
    oldValue = newValue;
  };
  // 懒执行 这样第一次 effectFn() 拿到 oldValue
  const effectFn = effect(getter, {
    lazy: true,
    scheduler: () => {
      // adjust the callback's flush timing
      // 默认值 为 pre，if you attempt to access the DOM inside a watcher callback, the DOM will be in the state before Vue has applied any updates.
      // flush 为 post，access the DOM in a watcher callback after Vue has updated it
      if (options && options.flush === "post") {
        const p = Promise.resolve();
        p.then(job);
      } else {
        // 类似于 sync 的实现机制，pre 的方式暂时没办法模拟
        job();
      }
    },
  });
  // immdiate 立即触发回调函数
  if (options && options.immdiate) {
    job();
  } else {
    oldValue = effectFn();
  }
}

// 对 source 递归的进行调用，即依赖收集，如果 source 有相关变化则会执行 cb
// seen 用来记录 traverse 读取过了，避免循环引用导致的死循环
// 暂时只考虑 object 的情况
function traverse(value, seen = new Set()) {
  if (!isObject(value) || seen.has(value)) return;
  seen.add(value);
  for (const k in value) {
    traverse(value[k], seen);
  }
  return value;
}