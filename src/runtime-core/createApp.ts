import { createVnode } from "./vnode";

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 先 vnode，后续的逻辑操作都会基于 vnode 做处理
        const vnode = createVnode(rootComponent);

        render(vnode, rootContainer);
      },
    };
  }
}