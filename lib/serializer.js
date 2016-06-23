/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize (obj) {
  if (!isObject(obj)) return obj
  var pairs = []
  for (var key in obj) {
    if (obj[key] !== null) {
      pushEncodedKeyValuePair(pairs, key, obj[key])
    }
  }
  return pairs.join('&')
}

/**
 * Helps 'serialize' with serializing arrays.
 * Mutates the pairs array.
 *
 * @param {Array} pairs
 * @param {String} key
 * @param {Mixed} val
 */

function pushEncodedKeyValuePair (pairs, key, val) {
  if (Array.isArray(val)) {
    return val.forEach(function (v) {
      pushEncodedKeyValuePair(pairs, key, v)
    })
  } else if (isObject(val)) {
    for (var subkey in val) {
      pushEncodedKeyValuePair(pairs, key + '[' + subkey + ']', val[subkey])
    }
    return
  }
  pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(val))
}

module.exports = {
  'application/x-www-form-urlencoded': serialize,
  'application/json': JSON.stringify
}
