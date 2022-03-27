import { isObject } from "../../shared";
import { effect } from "./effective";

// source 为 watch 的响应式对象 or 函数
// 函数可以指定该 watch 依赖哪些响应式数据
export function watch(source, cb) {
  let getter, oldValue, newValue;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }
  // 懒执行 这样第一次 effectFn() 拿到 oldValue
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      // 在 scheduler 中重新执行 effect，得到 newValue
      newValue = effectFn();
      cb(newValue, oldValue);
      // 更新 oldValue
      oldValue = newValue;
    },
  });
  oldValue = effectFn();
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