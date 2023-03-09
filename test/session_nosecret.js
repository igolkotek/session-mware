var assert = require('assert')
var http = require('http')
var request = require('supertest')
var session = require('../')
var utils = require('./support/utils')


describe.only('secret option', function() {
  function genidFn() {
    return "12345"
  }

  describe.only('NOSECRET. When secret is function type', function() {
    it("Check regular signed cookie value", function(done) {
      var server = createServer(
        {
          name: 'sid',
          genid: genidFn,
        }, function(req, res) {
          res.end();
        })

      request(server)
        .get('/')
        .expect(shouldFindValueInCookie('sid', genidFn()))
        .expect(200, done)
    })
    it("Check while nosecret", function(done) {
      var server = createServer({
        name: 'sid',
        secret: function() { },
        genid: genidFn
      }, function(req, res) {
        res.end();
      });

      request(server)
        .get('/')
        .expect(shouldSetCookieToValue('sid', genidFn()))
        .expect(200, done);
    })
  })
})
function createServer(options, respond) {
  var fn = respond
  var opts = options
  var server = http.createServer()

  // setup, options, respond
  if (typeof arguments[0] === 'function') {
    opts = arguments[1]
    fn = arguments[2]

    server.on('request', arguments[0])
  }

  return server.on('request', createRequestListener(opts, fn))
}

function createRequestListener(opts, fn) {
  var _session = createSession(opts)
  var respond = fn || end

  return function onRequest(req, res) {
    var server = this

    _session(req, res, function(err) {
      if (err && !res._header) {
        res.statusCode = err.status || 500
        res.end(err.message)
        return
      }

      if (err) {
        server.emit('error', err)
        return
      }

      respond(req, res)
    })
  }
}

function cookie(res) {
  var setCookie = res.headers['set-cookie'];
  return (setCookie && setCookie[0]) || undefined;
}
function createSession(opts) {
  var options = opts || {}

  if (!('cookie' in options)) {
    options.cookie = { maxAge: 60 * 1000 }
  }

  if (!('secret' in options)) {
    options.secret = 'keyboard cat'
  }

  return session(options)
}

function end(req, res) {
  res.end()
}


function shouldSetCookieToValue(name, val) {
  return function(res) {
    var header = cookie(res)
    var data = header && utils.parseSetCookie(header)
    assert.ok(header, 'should have a cookie header')
    assert.strictEqual(data.name, name, 'should set cookie ' + name)
    assert.strictEqual(data.value, val, 'should set cookie ' + name + ' to ' + val)
  }
}
function shouldFindValueInCookie(name, val) {
  return function(res) {
    var header = cookie(res)
    var data = header && utils.parseSetCookie(header)
    assert.ok(header, 'should have a cookie header')
    assert.strictEqual(data.name, name, 'should set cookie ' + name)
    const valFound = data.value.split(".", 1)[0]
    assert.strictEqual(valFound, 's%3A' + val, 'should find in cookie ' + name + ' it`s ' + val)
  }
}

