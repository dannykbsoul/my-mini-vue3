'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const isArray = (val) => Array.isArray(val);
const isString = (val) => typeof val === "string";
const isSymbol = (val) => typeof val === "symbol";
const isIntegerKey = (key) => isString(key) &&
    key !== "NaN" &&
    key[0] !== "-" &&
    "" + parseInt(key, 10) === key;
const hasChanged = (oldVal, newVal) => {
    return !Object.is(oldVal, newVal);
};
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const toRawType = (value) => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
};
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

const createDep = (effects) => {
    const dep = new Set(effects);
    return dep;
};

let activeEffect;
let shouldTrack;
// why use WeakMap？
// 因为 targetMap 都是对象作为键名，但是对键名所引用的对象是弱引用，不会影响垃圾回收机制
// 只要所引用的对象的其他引用都被清除，垃圾回收机制就会释放该对象所占用的内存。
// 也就是说，一旦不再需要，WeakMap 里面的键名对象和所对应的键值对会自动消失，不用手动删除引用。
// 应用场景
// WeakMap 经常用于存储那些只有当 key 所引用的对象存在时才有价值的信息，例如这里的 targetMap 对应的 target，
// 如果 target 对象没有任何的引用了，说明用户侧不再需要它了，此时如果用 Map 的话，即使用户侧的代码对 target 没有任何引用，
// 这个 target 也不会被回收，最后可能导致内存溢出
const targetMap = new WeakMap();
function track(target, key) {
    // 没有 activeEffect，也就没有必要进行依赖收集
    if (!isTracking())
        return;
    // target -> key -> deps(effect)
    // 这样的映射关系可以精确的实现响应式
    // 取出 depsMap，数据类型是 Map: key -> deps(effect)
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    // 根据 key 取出 deps，数据类型是 Set
    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    // activeEffect中去记录dep
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && activeEffect;
}
function pauseTracking() {
    shouldTrack = false;
}
function enableTracking() {
    shouldTrack = true;
}
function trigger(target, key, type, value) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    // const deps = depsMap.get(key) || [];
    let deps = [];
    // 如果新增了 key，需要触发之前 for in 收集到的 effect
    // delete 会影响 for ... in的遍历结果，所以也需要触发它的依赖
    const iterateDeps = (type === "ADD" /* ADD */ || "DEL" /* DEL */ ? depsMap.get(ITERATE_KEY) : []) || [];
    // 数组 set length，会触发 length 的effect，以及修改 length 导致部分数组元素的变更
    // 比如 arr = [1, 2, 3]，此时设置arr.length = 1; 会导致arr[1]、arr[2]这两个元素发生变更，即要触发相应的副作用函数
    // 同样 如果数组情况下是 ADD 的情况，则同样需要触发 length 的副作用函数
    if (isArray(target)) {
        // length 触发会影响到数组元素的变更
        if (key === "length") {
            depsMap.forEach((dep, key) => {
                if (key === "length" || Number(key) >= value) {
                    deps.push(...dep);
                }
            });
        }
        // 新增了元素也需要触发 length 绑定的副作用函数
        if (type === "ADD" /* ADD */) {
            deps.push(...(depsMap.get("length")) || []);
        }
        if (type === "SET" /* SET */) {
            deps.push(...(depsMap.get(key) || []));
        }
    }
    else {
        deps.push(...(depsMap.get(key) || []));
    }
    // deps执行前进行保存，防止陷入死循环
    triggerEffects(createDep([...deps, ...iterateDeps]));
}
function triggerEffects(deps) {
    for (const effect of deps) {
        // 当前执行的 activeEffect 与trigger触发的 effect 相同，则不触发执行
        if (effect === activeEffect)
            return;
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

function isRef(ref) {
    return !!(ref && ref.__v_isRef);
}

// 对于一些内置的 symbol 类型，不希望收集依赖
const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
    .map((key) => Symbol[key]));
const get = createGetter();
const set = createSetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const arrayInstrumentations = createArrayInstrumentations();
function createArrayInstrumentations() {
    const instrumentations = {};
    ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
        const originMethod = Array.prototype[key];
        instrumentations[key] = function (...args) {
            let res = originMethod.apply(this, args);
            if (!res) {
                res = originMethod.apply(this.raw, args);
            }
            return res;
        };
    });
    ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
        const originMethod = Array.prototype[key];
        instrumentations[key] = function (...args) {
            // 暂停 track
            pauseTracking();
            let res = originMethod.apply(this, args);
            // 恢复 track
            enableTracking();
            return res;
        };
    });
    return instrumentations;
}
const ITERATE_KEY = Symbol();
function createGetter(isReadonly = false, isShallow = false) {
    return function get(target, key, receiver) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_isShallow" /* IS_SHALLOW */) {
            return isShallow;
        }
        // 代理对象可以通过 raw 属性访问到原始数据
        if (key === "raw") {
            return target;
        }
        if (Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
            return Reflect.get(arrayInstrumentations, key, receiver);
        }
        // key 是内置 symbol 类型，不希望收集依赖
        if (!isReadonly && !(isSymbol(key) && builtInSymbols.has(key))) {
            // 只读的情况 不需要依赖收集
            track(target, key);
        }
        const res = Reflect.get(target, key);
        if (isShallow)
            return res;
        // 深响应
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value, reveiver) {
        const type = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
                ? "SET" /* SET */
                : "ADD" /* ADD */
            : hasOwn(target, key)
                ? "SET" /* SET */
                : "ADD" /* ADD */;
        const oldValue = Reflect.get(target, key);
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
        }
        const res = Reflect.set(target, key, value);
        // reveiver 就是 target 的代理对象，此时才会去考虑触发
        if (reveiver.raw === target) {
            hasChanged(oldValue, value) && trigger(target, key, type, value);
        }
        return res;
    };
}
function deleteProperty(target, key) {
    // 检查被操作的属性是否是对象自己的属性
    const hadKey = hasOwn(target, key);
    const result = Reflect.deleteProperty(target, key);
    // 只有当被删除的属性是对象自己的属性 并且 删除成功的时候，才会去触发更新
    if (hadKey && result) {
        trigger(target, key, "DEL" /* DEL */);
    }
    return result;
}
// key in obj 类似的操作
function has(target, key) {
    track(target, key);
    return Reflect.has(target, key);
}
// for ... in 类似的操作
// 对象属性新增、删除才需要触发
// for ... in 操作对于数组也是可以遍历，哪些操作会影响到 for ... in的遍历
// 1. 添加新元素 arr[100] = 1;
// 2. 修改数组长度 arr.length = 0;
// 无论是新增还是修改数组长度，本质都是 length 的变化，所以将 length 与副作用函数绑定在一起
// 将来 length 变化的时候去触发相应的副作用函数
function ownKeys(target) {
    track(target, isArray(target) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target);
}
const mutableHandlers = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys,
};
extend({}, mutableHandlers, {
    get: shallowGet,
});
const readonlyHandlers = {
    get: readonlyGet,
    set: function set(target, key, value) {
        console.warn(`Set operation on key "${key}" failed: target is readonly.`);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet,
});

const reactiveMap = new WeakMap();
function targetTypeMap(rawType) {
    switch (rawType) {
        case "Object":
        case "Array":
            return 1 /* COMMON */;
        case "Map":
        case "Set":
        case "WeakMap":
        case "WeakSet":
            return 2 /* COLLECTION */;
        default:
            return 0 /* INVALID */;
    }
}
function getTargetType(value) {
    return targetTypeMap(toRawType(value));
}
function reactive(raw) {
    // 优先通过原始对象寻找之前创建的代理对象
    const existProxy = reactiveMap.get(raw);
    if (existProxy)
        return existProxy;
    // 防止影响到内层的 reactive，如果已经是转换过的，直接返回
    if (isProxy(raw))
        return raw;
    const targetType = getTargetType(raw);
    if (targetType === 0 /* INVALID */) {
        return raw;
    }
    const proxy = createActiveObject(raw, targetType === 2 /* COLLECTION */
        ? null
        : mutableHandlers);
    reactiveMap.set(raw, proxy);
    return proxy;
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandlers);
}
function createActiveObject(raw, baseHandlers) {
    return new Proxy(raw, baseHandlers);
}
// if value not wrapped will return undefined，so we need !! operator
function isReactive(value) {
    return !!value["__v_isReactive" /* IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* IS_READONLY */];
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}

// emit 这里需要将要执行的 event 从 instance 的 props 中找到对应要触发的函数
// 通过 bind 的方式提前传入 instance，用户只需要传入 event 就能正常使用了
function emit(instance, event, ...args) {
    const { props } = instance;
    // TPP
    // 先去写一个特定的行为 -> 重构成通用的行为
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    // attrs
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    // slot children 才会去处理
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: () => { },
    };
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // TODO
    // initProps
    initProps(instance, instance.vnode.props);
    // initSlots
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    // 组件代理对象
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // TODO
    // function
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}

function render(vnode, container) {
    // patch
    patch(vnode, container);
}
function patch(vnode, container) {
    const { shapeFlag } = vnode;
    // TODO 判断 vnode 是否一个 element
    if (shapeFlag & 1 /* ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
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
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    // props
    for (const key in props) {
        const val = props[key];
        // 具体的 click => 通用的事件处理
        // on + Event name
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            el.addEventListener(key.slice(2).toLowerCase(), val);
        }
        else {
            el.setAttribute(key, val);
        }
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

function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapeFlag(type),
        el: null,
    };
    if (typeof children === "string") {
        vnode.shapeFlag = vnode.shapeFlag | 4 /* TEXT_CHILDREN */;
    }
    else if (isArray(children)) {
        vnode.shapeFlag = vnode.shapeFlag | 8 /* ARRAY_CHILDREN */;
    }
    // 组件类型 + children object
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (typeof vnode.children === "object") {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return typeof type === "string"
        ? 1 /* ELEMENT */
        : 2 /* STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先 vnode，后续的逻辑操作都会基于 vnode 做处理
            const vnode = createVnode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVnode("div", {}, slot(props));
        }
    }
}

exports.createApp = createApp;
exports.h = h;
exports.renderSlots = renderSlots;
