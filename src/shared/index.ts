export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
}

export const isFunction = (val) => {
  return typeof val === "function";
}

export const hasChanged = (oldVal, newVal) => {
  return !Object.is(oldVal, newVal);
}