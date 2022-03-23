export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
}

export const hasChanged = (oldVal, newVal) => {
  return !Object.is(oldVal, newVal);
}