import { effect } from "./effective";
import { reactive } from "./reactive";

export function scheduler() {
  const jobQueue = new Set();
  const p = Promise.resolve();

  let isFlushing = false;
  function flushJob() {
    if (isFlushing) return;
    isFlushing = true;
    p.then(() => {
      jobQueue.forEach((job: any) => job());
    }).finally(() => {
      isFlushing = false;
    })
  }
  
  const obj = reactive({
    foo: 1
  })
  effect(() => {
    console.log(obj.foo);
  }, {
    scheduler(fn) {
      jobQueue.add(fn);
      flushJob();
    }
  })
  obj.foo++;
  obj.foo++;
  // 最终只会输出 1 3
  // scheduler 帮我们很好的实现不包含过渡状态的操作
  // 这个操作类似于 vue 中连续多次修改响应式数据但只会触发一次更新
}