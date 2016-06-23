/*
 * (The MIT License)
 *
 * Copyright (c) 2016 Arthur Gautier <baloo@superbaloo.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var path = require('path')

var ReadableStreamBuffer = require('./lib/readable-stream-buffer')
var FakeRequest = require('./lib/fake-request')
var FakeResponse = require('./lib/fake-response')

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

function Rewire (baseUrl) {
  this.baseUrl = baseUrl
}

function expressRewireMiddleware (url) {
  var baseUrl = this.baseUrl

  if (url !== undefined) {
    baseUrl = path.join(baseUrl, url)
  }

  return function expressRewireMiddleware_ (req, res, next) {
    var app = req.app

    req.url = path.join(baseUrl, req.url)
    app.handle(req, res)
  }
}

Rewire.prototype.middleware = expressRewireMiddleware

Rewire.prototype.get = function (req, url) {
  return new RewireCall(this, req, 'GET', url)
}

Rewire.prototype.post = function (req, url) {
  return new RewireCall(this, req, 'POST', url)
}

Rewire.prototype.delete = function (req, url) {
  return new RewireCall(this, req, 'DELETE', url)
}

Rewire.prototype.put = function (req, url) {
  return new RewireCall(this, req, 'PUT', url)
}

Rewire.prototype.patch = function (req, url) {
  return new RewireCall(this, req, 'PATCH', url)
}

Rewire.prototype.method = function (req, method, url) {
  return new RewireCall(this, req, method, url)
}

function RewireCall (rewire, req, method, url) {
  if (url === undefined) {
    url = '/'
  }

  this.req = req
  this.method = method
  this.header = {}
  this.body(new Buffer(0))

  // TODO: remove / when joining and req.url is only /?
  this.url = path.join(rewire.baseUrl, url)
}

/**
 * Set header `field` to `val`, or multiple fields with one object.
 * Case-insensitive.
 *
 * Examples:
 * ``` js
 * req.get('/')
 *   .set('Accept', 'application/json')
 *   .set('X-API-Key', 'foobar')
 *   .end(callback)
 *
 * req.get('/')
 *   .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *   .end(callback)
 * ```
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */
RewireCall.prototype.set = function (field, val) {
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key])
    }
    return this
  }
  this.header[field] = val
  return this
}

/**
 * Remove header `field`.
 * Case-insensitive.
 *
 * Example:
 * ``` js
 * rewire('/somewhere/else')
 *   .unset('Host')
 *   .then(callback)
 * ```
 *
 * @param {String} field
 */
RewireCall.prototype.unset = function (field) {
  delete this._header[field.toLowerCase()]
  delete this.header[field]
  return this
}

/**
 * Allow for extension
 */
RewireCall.prototype.use = function use (fn) {
  fn(this)
  return this
}

/**
 * Attach a body
 *
 * ``` js
 * rewire('/somewhere/else')
 *   .post(req, '/upload')
 *   .body(new Buffer('foo'))
 *   .then(callback)
 * ```
 *
 * @param {Buffer|ReadableStream} val
 * @return {Request} for chaining
 * @api public
 */
RewireCall.prototype.body = function body (val) {
  if (Buffer.isBuffer(val)) {
    this.set('Content-Length', val.length.toString())
    val = new ReadableStreamBuffer(val)
  }

  this._body = val
  return this
}

/**
 * Attach a json as body
 *
 * ``` js
 * rewire('/somewhere/else')
 *   .post(req, '/upload')
 *   .json({foo: 'bar'})
 *   .then(callback)
 * ```
 *
 * @param {Object|Array} val
 * @return {Request} for chaining
 * @api public
 */
RewireCall.prototype.json = function body (val) {
  var json = new Buffer(JSON.stringify(val))
  this.set('Content-Type', 'application/json')

  this.body(json)
  return this
}

/**
 * Send request to handler
 * Returns promise from builder
 *
 * @return {Promise} for chaining
 * @api private
 */
RewireCall.prototype._promise = function _promise () {
  var app = this.req.app

  var options_ = {
    path: this.url,
    method: this.method,
    requestBody: this._body,
    headers: this.header,

    bufferResponse: true
  }

  var backendRequest = new FakeRequest(options_)
  var backendResponse = new FakeResponse(options_)
  backendResponse.req = backendRequest
  backendRequest.res = backendResponse
  backendRequest.connection = this.req

  return new Promise(function (resolve, reject) {
    backendResponse.on('finish', function () {
      backendResponse.headers = backendResponse._headers
      resolve(backendResponse)
    })

    backendResponse.on('err', function (err) {
      reject(err)
    })

    app.handle(backendRequest, backendResponse)
  })
}

/**
 * Chain promise on success
 *
 * ``` js
 * rewire('/somewhere/else')
 *   .post(req, '/upload')
 *   .then(callback)
 * ```
*/
RewireCall.prototype.then = function (cb) {
  return this._promise().then(cb)
}

/**
 * Chain promise on failure
 *
 * ``` js
 * rewire('/somewhere/else')
 *   .post(req, '/upload')
 *   .catch(callback)
 * ```
 */
RewireCall.prototype.catch = function (cb) {
  return this._promise().catch(cb)
}

function rewire (baseUrl) {
  return new Rewire(baseUrl)
}

module.exports = rewire
