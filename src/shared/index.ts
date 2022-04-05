export const extend = Object.assign;

export const isObject = (val) => {
  return val !== null && typeof val === "object";
}

export const isFunction = (val) => {
  return typeof val === "function";
}

export const isArray = (val) => Array.isArray(val);

export const isString = (val) => typeof val === "string";

export const isSymbol = (val) => typeof val === "symbol";

export const isIntegerKey = (key) =>
  isString(key) &&
  key !== "NaN" &&
  key[0] !== "-" &&
  "" + parseInt(key, 10) === key;

export const hasChanged = (oldVal, newVal) => {
  return !Object.is(oldVal, newVal);
}

export const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string =>
  objectToString.call(value);

export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1);
};