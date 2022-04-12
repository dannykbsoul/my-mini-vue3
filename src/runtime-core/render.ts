import { effect } from "../reactivity/src/effective";
import { EMPTY_OBJ } from "../shared";
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
    patch(null, vnode, container, null);
  }

  function patch(n1, n2, container, parentComponent) {
    const { type, shapeFlag } = n2;
    // Fragment
    // TODO 判断 vnode 是否一个 element
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent);
        break;
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent);
        }
        break;
    }
  }

  function processFragment(n1, n2, container, parentComponent) {
    mountChildren(n2, container, parentComponent);
  }

  function processText(n1, n2, container) {
    const { children } = n2;
    const textNode = (n2.el = document.createTextNode(children));
    container.append(textNode);
  }

  function processComponent(n1, n2, container, parentComponent) {
    mountComponent(n2, container, parentComponent);
  }

  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }

  function patchElement(n1, n2, container) {
    console.log(n1, n2, container);
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;

    const el = n2.el = n1.el;
    patchProps(el, oldProps, newProps);
  }

  // 1. 属性前后值不一样，需要触发修改操作
  // 2. 属性修改后的值为 null || undefined，需要触发删除 prop 操作
  // 3. 属性在老prop 中有，新prop 中无，需触发删除操作
  function patchProps(el, oldProps, newProps) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];

        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }

      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
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
      hostPatchProp(el, key, null, val);
    }

    hostInsert(el, container);
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function setupRenderEffect(instance, container, initialVNode) {
    // effect 做依赖收集，当内部有变更会重新执行 render
    effect(() => {
      if (!instance.isMounted) {
        const { proxy } = instance;
        const subTree = instance.subTree = instance.render.call(proxy);
        instance.subTree = subTree;
        // vnode -> patch
        patch(null, subTree, container, instance);
        // vnode -> element -> mountElement
        // 此时所有的 subtree 处理完成，然后挂载到组件的 vnode 上
        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance);
      }
    })
  }

  return {
    createApp: createAppAPI(render),
  };
}
