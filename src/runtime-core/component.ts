import { proxyRefs } from "../reactivity";
import { shallowReadonly } from "../reactivity/src/reactive";
import { isFunction, isObject } from "../shared";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    next: null,
    setupState: {},
    props: {},
    slots: {},
    // 给定当前的组件 provides，默认初始值指向父组件 provides，
    // 将来 inject 的时候可以沿着 provides 指向查找到对应的值
    provides: parent ? parent.provides : {},
    parent,
    isMounted: false,
    subTree: {},
    emit: () => {},
    mounted: [],
  };
  component.emit = emit.bind(null, component) as any;
  return component;
}

export function setupComponent(instance) {
  const { type = {} } = instance;
  const { beforeCreate } = type;
  // 调用 beforeCreate 钩子函数，Called when the instance is initialized.
  beforeCreate && beforeCreate();
  // initProps
  initProps(instance, instance.vnode.props);
  // initSlots
  initSlots(instance, instance.vnode.children);
  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const Component = instance.type;

  // 组件代理对象
  instance.proxy = new Proxy({_: instance}, PublicInstanceProxyHandlers);

  const { setup } = Component;

  if (setup) {
    setCurrentInstance(instance);
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit
    });
    setCurrentInstance(null);
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult) {
  if (isObject(setupResult)) {
    instance.setupState = proxyRefs(setupResult);
  } else if (isFunction(setupResult)) {
    if (instance.type.render) console.warn("steup 函数返回渲染函数， render 选项将被忽略");
    instance.type.render = setupResult;
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;

  instance.render = Component.render;
}

let currentInstance: any = null;
export function getCurrentInstance() {
  return currentInstance;
}

// 封装成函数 方便调试
// 这样 currentInstance 的改变只能通过这个函数，通过在这里打断点就能追踪到 currentInstance 的变化
export function setCurrentInstance(instance) {
  currentInstance = instance;
}

export function onMounted(fn) {
  if (currentInstance) {
    currentInstance.mounted.push(fn);
  } else {
    console.error("onMounted 函数只能在 setup 中调用");
  }
}
