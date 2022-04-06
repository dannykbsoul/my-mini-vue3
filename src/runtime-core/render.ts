import { isArray, isObject } from "../shared";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  // patch
  patch(vnode, container);
}
 
function patch(vnode, container) {
  // TODO 判断 vnode 是否一个 element
  if (typeof vnode.type === "string") {
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    processComponent(vnode, container);
  }
}

function processComponent(vnode, container) {
  mountComponent(vnode, container);
}

function processElement(vnode, container) {
  mountElement(vnode, container);
}

function mountComponent(vnode, container) {
  const instance = createComponentInstance(vnode);
  setupComponent(instance);
  setupRenderEffect(instance, container);
}

function mountElement(vnode, container) {
  const { type, props, children } = vnode;

  const el = document.createElement(type);

  // string | array
  if (typeof children === "string") {
    el.textContent = children;
  } else if (isArray(children)) {
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

function setupRenderEffect(instance, container) {
  const subTree = instance.render();
  // vnode -> patch
  patch(subTree, container);
  // vnode -> element -> mountElement
}
