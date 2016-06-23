var mocha = require('mocha')
var express = require('express')
var bodyParser = require('body-parser')
var request = require('supertest')

var describe = mocha.describe
var beforeEach = mocha.beforeEach
var it = mocha.it

var rewire = require('../index.js')

var WritableStreamBuffer = require('../lib/writeable-stream-buffer')

describe('Express-rewire', function () {
  var app

  beforeEach(function () {
    app = express()

    app.get('/test', function (req, res) {
      res.json({query: req.query})
    })

    app.get('/test/:foo', function (req, res) {
      res.json({params: req.params, query: req.query})
    })

    app.get('/test/:first/:second', function (req, res) {
      res.json({params: req.params, query: req.query})
    })

    app.post('/test', function (req, res) {
      req.pipe(new WritableStreamBuffer(function (body) {
        res.json({body: JSON.parse(body.toString())})
      }))
    })

    app.post('/body-parsers', bodyParser.json())
    app.post('/body-parsers', function (req, res) {
      res.json({body: req.body})
    })

    app.get('/streamed', function (req, res) {
      res.write('1\n')
      res.flush()
      res.write('2\n')
      res.flush()
      res.end()
    })
  })

  it('should transmit query strings', function (done) {
    app.use('/rewire', rewire('/test').middleware())

    request(app)
      .get('/rewire?foo=bar')
      .expect('Content-Type', /json/)
      .expect('Content-Length', '23')
      .expect(200)
      .expect(/"foo": *"bar"/)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  it('should transmit params', function (done) {
    app.use('/rewire', rewire('/test').middleware())

    request(app)
      .get('/rewire/bar')
      .expect('Content-Type', /json/)
      .expect(200)
      .expect(/"foo": *"bar"/)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  it('should chain calls', function (done) {
    app.use('/rewire', function (req, res, next) {
      var wire = rewire('/test')

      wire.get(req, '/bar')
        .then(function (response) {
          return JSON.parse(response.body)
        })
        .then(function (body) {
          return body.params.foo
        })
        .then(function (foo) {
          wire.middleware(foo)(req, res, next)
        })
    })
    var expected = {
      params: { first: 'bar', second: 'baz' },
      query: {}
    }

    request(app)
      .get('/rewire/baz')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(expected)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  it('should forward body', function (done) {
    app.use('/rewire', function (req, res, next) {
      var wire = rewire('/test')

      wire.post(req, '/')
        .json({baz: 'baz'})
        .then(function (response) {
          return response.body.toString()
        })
        .then(function (body) {
          return JSON.parse(body)
        })
        .then(function (foo) {
          wire.middleware(foo.body.baz)(req, res, next)
        })
    })
    var expected = {
      params: { first: 'baz', second: 'qux' },
      query: {}
    }

    request(app)
      .get('/rewire/qux')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(expected)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  it('should forward body with middleware', function (done) {
    app.use('/rewire', function (req, res, next) {
      rewire('/test').middleware()(req, res, next)
    })

    var expected = {
      body: { foo: 'bar' }
    }

    request(app)
      .post('/rewire')
      .send({foo: 'bar'})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(expected)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  it('should forward body with middleware after body parsers', function (done) {
    app.use('/rewire', bodyParser.json())
    app.use('/rewire', function (req, res, next) {
      rewire('/test').middleware()(req, res, next)
    })

    var expected = {
      body: { foo: 'bar' }
    }

    request(app)
      .post('/rewire')
      .send({foo: 'bar'})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(expected)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  it('should forward body with middleware after body parsers through body parsers', function (done) {
    app.use('/rewire', bodyParser.json())
    app.use('/rewire', rewire('/body-parsers').middleware())

    var expected = {
      body: { foo: 'bar' }
    }

    request(app)
      .post('/rewire')
      .send({foo: 'bar'})
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(expected)
      .end(function (err, res) {
        if (err) done(err)
        else done()
      })
  })

  // it('should forward body with middleware after body parsers and http-proxy', function (done) {
  //   app.use('/proxy', function(req, res) {
  //     var proxy = httpProxy.createProxyServer({
  //       target: 'http://localhost:8081',
  //     });
  //     console.log('foo')
  //     proxy.web(req, res);
  //   });
  //   app.use('/rewire', bodyParser.json())
  //   app.use('/rewire', rewire('/proxy').middleware())

  //   var expected = {
  //     body: { foo: 'bar' }
  //   }

  //   request(app)
  //     .post('/rewire')
  //     .send({foo: 'bar'})
  //     .expect(200)
  //     .expect('Content-Type', /json/)
  //     .expect(expected)
  //     .end(function (err, res) {
  //       if (err) done(err)
  //       else done()
  //     })
  // })
})

