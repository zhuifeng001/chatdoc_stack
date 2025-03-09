// number.js
export function isNumber(value) {
  return typeof value === 'number'
}

// string.js
export function isString(value) {
  return typeof value === 'string'
}

// boolean.js
export function isBoolean(value) {
  return typeof value === 'boolean'
}

// function.js
export function isFunction(value) {
  return typeof value === 'function'
}

// array.js
export function isArray(value) {
  return Array.isArray(value)
}

// object.js
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// null.js
export function isNull(value) {
  return value === null
}

// undefined.js
export function isUndefined(value) {
  return typeof value === 'undefined'
}
