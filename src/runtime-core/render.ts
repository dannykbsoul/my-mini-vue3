import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";

export function createRenderer(options) {

  const { 
    createElement: hostCreateElement,
    patchProp: hostPatchProp, 
    insert: hostInsert, 
  } = options;

  function render(vnode, container) {
    // patch
    patch(vnode, container, null);
  }

  function patch(vnode, container, parentComponent) {
    const { type, shapeFlag } = vnode;
    // Fragment
    // TODO 判断 vnode 是否一个 element
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent);
        break;
      case Text:
        processText(vnode, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parentComponent);
        }
        break;
    }
  }

  function processFragment(vnode, container, parentComponent) {
    mountChildren(vnode, container, parentComponent);
  }

  function processText(vnode, container) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processComponent(vnode, container, parentComponent) {
    mountComponent(vnode, container, parentComponent);
  }

  function processElement(vnode, container, parentComponent) {
    mountElement(vnode, container, parentComponent);
  }

  function mountComponent(initialVNode, container, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, container, initialVNode);
  }

  // 依赖于稳定的接口，而不是具体的实现，这就是自定义render
  function mountElement(vnode, container, parentComponent) {
    const { type, props, children, shapeFlag } = vnode;

    // 这里 el 是挂载到当前 element 类型的 vnode 上的
    const el = (vnode.el = hostCreateElement(type));

    // string | array
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent);
    }

    // props
    for (const key in props) {
      const val = props[key];
      hostPatchProp(el, key, val);
    }

    hostInsert(el, container);
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent);
    });
  }

  function setupRenderEffect(instance, container, initialVNode) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode -> patch
    patch(subTree, container, instance);
    // vnode -> element -> mountElement
    // 此时所有的 subtree 处理完成，然后挂载到组件的 vnode 上
    initialVNode.el = subTree.el;
  }

  return {
    createApp: createAppAPI(render),
  };
}
