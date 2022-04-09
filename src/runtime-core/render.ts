import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // patch
  patch(vnode, container);
}
 
function patch(vnode, container) {
  const { shapeFlag } = vnode;
  // TODO 判断 vnode 是否一个 element
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container);
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container);
  }
}

function processComponent(vnode, container) {
  mountComponent(vnode, container);
}

function processElement(vnode, container) {
  mountElement(vnode, container);
}

function mountComponent(initialVNode, container) {
  const instance = createComponentInstance(initialVNode);
  setupComponent(instance);
  setupRenderEffect(instance, container, initialVNode);
}

function mountElement(vnode, container) {
  const { type, props, children, shapeFlag } = vnode;

  // 这里 el 是挂载到当前 element 类型的 vnode 上的
  const el = vnode.el = document.createElement(type);

  // string | array
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children;
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el);
  }

  // props
  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val);
  }

  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}

function setupRenderEffect(instance, container, initialVNode) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);
  // vnode -> patch
  patch(subTree, container);
  // vnode -> element -> mountElement
  // 此时所有的 subtree 处理完成，然后挂载到组件的 vnode 上
  initialVNode.el = subTree.el;
}
