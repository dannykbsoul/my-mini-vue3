import { render } from "./render";
import { createVnode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先 vnode，后续的逻辑操作都会基于 vnode 做处理
      const vnode = createVnode(rootComponent);

      render(vnode, rootContainer);
    }
  }
}