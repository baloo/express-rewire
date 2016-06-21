var util = require('util')
var stream = require('stream')

function ReadableStreamBuffer (buffer) {
  this.streambuffer = buffer
  this.pos = 0

  this.events = {}

  var self = this
  stream.Readable.call(self)
}

util.inherits(ReadableStreamBuffer, stream.Readable)

ReadableStreamBuffer.prototype._read = function _read (len) {
  var sendMore
  var amount = 0
  var start = 0

  if (len === undefined) {
    // Reading more than avaible is okay with a buffer
    len = this.streambuffer.length
  }

  do {
    start = this.pos
    this.pos = this.pos + len
    amount = this.pos - start

    if (amount > 0) {
      var blah = this.streambuffer.slice(start, this.pos)
      sendMore = this.push(blah)
      start = this.pos
    }

    if (start >= this.streambuffer.length) {
      this.push(null)
      this._readableState.reading = false

      sendMore = false
    }
  } while (sendMore)
}

module.exports = ReadableStreamBuffer
