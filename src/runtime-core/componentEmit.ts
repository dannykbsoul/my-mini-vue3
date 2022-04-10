// emit 这里需要将要执行的 event 从 instance 的 props 中找到对应要触发的函数
// 但是实际应用的时候我们是直接 emit(event) 来触发，如何将 instance 传入呢？

import { camelize, toHandlerKey } from "../shared";

// 通过 bind 的方式提前传入 instance，用户只需要传入 event 就能正常使用了
export function emit(instance, event, ...args) {
  const { props } = instance;

  // TPP
  // 先去写一个特定的行为 -> 重构成通用的行为
  const handlerName = toHandlerKey(camelize(event));
  const handler = props[handlerName];
  handler && handler(...args);
}