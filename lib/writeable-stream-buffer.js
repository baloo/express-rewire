var util = require('util')
var Buffer = require('buffer').Buffer
var stream = require('stream')

function WritableStreamBuffer (callback) {
  this.buffer = new Buffer(0)
  this.callback = callback

  var self = this
  stream.Writable.call(self)
}

util.inherits(WritableStreamBuffer, stream.Writable)

function _write (chunk, encoding, callback) {
  if (typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding)
  }

  this.buffer = Buffer.concat([this.buffer, chunk])

  if (callback) callback()
  this.callback(this.buffer)
}

WritableStreamBuffer.prototype._write = _write

function _writev (chunks, callback) {
  var chunks_ = chunks.map(function (c) {
    if (typeof c.chunk === 'string') {
      return new Buffer(c.chunk, c.encoding)
    } else {
      return c.chunk
    }
  })

  this.buffer = Buffer.concat([this.buffer].concat(chunks_))

  if (callback) callback()
  this.callback(this.buffer)
}
WritableStreamBuffer.prototype._writev = _writev

module.exports = WritableStreamBuffer
