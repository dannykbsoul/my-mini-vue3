import { createRenderer } from "../runtime-core";

function createElement(type) {
  return document.createElement(type);
}

// HTML attribute vs. DOM property
// https://stackoverflow.com/questions/6003819/what-is-the-difference-between-properties-and-attributes-in-html
// Attributes are defined by HTML. Properties are defined by the DOM (Document Object Model).
// 1. A few HTML attributes have 1:1 mapping to properties. id is one example.
// 2. Some HTML attributes don't have corresponding properties. colspan is one example.
// 3. Some DOM properties don't have corresponding attributes. textContent is one example.
// 4. Many HTML attributes appear to map to properties ... but not in the way you might think!
// 对于第四点，只需要记住一个核心原则：
// HTML attribute 的作用是设置与之对应的 DOM property 的初始值
function patchProp(el, key, preVal, nextVal) {
  // 具体的 click => 通用的事件处理
  // on + Event name
  const isOn = (key) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    el.addEventListener(key.slice(2).toLowerCase(), nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      if (shouldSetAsProps(el, key, nextVal)) {
        const type = typeof el[key];
        // boolean 类型，并且赋值为空字符串，需赋值为 true
        // 比如说设置了 disabled 属性，此时转换为 VNode 的时候，disabled 为 '', el.disabled = ''
        // 赋值会矫正为 boolean 类型，即 el.disabled = false，这与本意违背
        if (type === "boolean" && nextVal === "") {
          el[key] = true;
        } else {
          el[key] = nextVal;
        }
      } else {
        // setAttribute 会将传入的 nextVal 字符串化，当设置 disabled 值为 false
        // el.setAttribute(disabled, 'false')，对于 el 来说，只要设置了 disabled 属性，默认为 true，所以我们需要优先设置 DOM properties
        el.setAttribute(key, nextVal);
      }
    }
  }
}

function shouldSetAsProps(el, key, value) {
  // 特殊处理 el.form 是只读的，只能通过 setAttribute 函数来设置它
  if (key === "form" && el.tagName === "INPUT") return false;
  // 判断 key 是否存在对应的 DOM properties
  return key in el;
}

function insert(child, parent, anchor) {
  // parent.append(child);
  parent.insertBefore(child, anchor || null);
}

function remove(child) {
  const parent = child.parentNode;
  if (parent) {
    parent.removeChild(child);
  }
}

function setElementText(el, text) {
  el.textContent = text;
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText,
});

export function createApp(...args) {
  return renderer.createApp(...args)
}

export * from "../runtime-core";