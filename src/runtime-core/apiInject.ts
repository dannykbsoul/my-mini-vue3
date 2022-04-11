import { getCurrentInstance } from "./component";

export function provide(key, value) {
  // 存
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    let { provides } = currentInstance;
    const parentProvides = currentInstance.parent.provides;
    // init
    // 如果当前组件 provides和父组件 provides 相同，则说明当前组件没有初始化 provides
    // 此时需要初始化 provides，我们需要将当前 provides 的原型指向父组件的 provides，
    // 这样在当前 provides 中设置属性，不会影响到父组件的同名属性
    // 这样的操作类似于 get 操作， set 的时候是在当前对象 set，get 的时候是顺着原型链查到的
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }

    provides[key] = value;
  }
}

// 当在原型链上查找不到 key 的时候，会拿到默认值 defaultValue
export function inject(key, defaultValue) {
  // 取
  const currentInstance: any = getCurrentInstance();

  if (currentInstance) {
    const { parent } = currentInstance;
    const parentProvides = parent.provides;
    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}