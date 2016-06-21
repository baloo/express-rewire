var http = require('http')
var util = require('util')
var stream = require('stream')

var express = require('express')

var objectAssign = require('./object-assign')
var WritableStreamBuffer = require('./writeable-stream-buffer')

var ServerResponse = http.ServerResponse

function FakeResponse (options, overrides) {
  var options_ = objectAssign({}, options, overrides)
  var self = this

  ServerResponse.call(self, options_)

  Object.setPrototypeOf(self, express.response)

  if (options_.bufferResponse) {
    self.connection = new WritableStreamBuffer(function (buffer) {
      self.body = buffer
    })
  } else {
    self.connection = new stream.PassThrough()
  }
  self.connection._httpMessage = self
  self.writeHead = function () { self._header = '' }

  self._mocked = true
}

util.inherits(FakeResponse, ServerResponse)

module.exports = FakeResponse
