var http = require('http')
var util = require('util')

var express = require('express')

var objectAssign = require('./object-assign')

var IncomingMessage = http.IncomingMessage

function FakeRequest (options, overrides) {
  var options_ = objectAssign({}, options, overrides)
  var self = this

  IncomingMessage.call(self)
  Object.setPrototypeOf(self, express.request)

  self.method = options_.method || 'GET'
  self.url = options_.path
  self.headers = {}
  for (var key in options_.headers) {
    self.headers[key.toLowerCase()] = options_.headers[key]
  }

  if (options_.requestBody) {
    self.socket = options_.requestBody
    self._read = function _read (n) {
      return self.socket._read(n)
    }
    self.read = function read (n) {
      return self.socket.read(n)
    }
  }
}

util.inherits(FakeRequest, IncomingMessage)

module.exports = FakeRequest
