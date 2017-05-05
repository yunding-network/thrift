var should  = require('should'),
    path    = require('path');

var DDing_thrift = require('../index'),
    Server = DDing_thrift.Server;

describe('Thrift Server Test', function() {
  var serviceName = 'Calculator';
  var typeName = 'service';
  var server;

  before(function(next) {
    // runs before all tests in this block
    return next();
  });

  after(function(next) {
    // runs after all tests in this block
    return next();
  });

  beforeEach(function(next) {
    // runs before each test in this block
    return next();
  });

  afterEach(function(next) {
    if(server.state == DDing_thrift.SERVER_STATE.STATE_STARTED){
      server.close();
    }
    server = null;
    return next();
  });

  // 
  it('Server create', function(next){
    var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
    var service_path = gen_path + serviceName + '.js';
    var type_path = gen_path + typeName + '_types.js';

    var option = {
      port: 3000,
      thrift_gen: gen_path
    };
    server = Server.create(option);

    should.exist(server);
    server.port.should.equal(option.port);
    server.state.should.equal(DDing_thrift.SERVER_STATE.STATE_INITED);
    should.not.exist(server.tls);
    
    server.thrift_gen_path.should.be.equal(option.thrift_gen);
    server.services_path[serviceName].should.be.equal(service_path);
    server.types_path[typeName].should.be.equal(type_path);

    should.exist(server.transport);
    should.exist(server.protocol);
    should.exist(server.processor);

    return next();
  });

  // 
  it('Register service', function(next){
    var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
    var option = {
      port: 3000,
      thrift_gen: gen_path
    };
    server = Server.create(option);

    server.registerService(serviceName, {
      add: function(num1, num2, cb){
        return cb(null, num1+num2);
      }
    });

    should.exist(server.processor.services[serviceName]);
    should.exist(server.processor.services[serviceName]._handler.add);

    return next();
  });

  //
  it('Server start', function(next){
    var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
    var option = {
      port: 3000,
      thrift_gen: gen_path
    };
    server = Server.create(option);

    server.registerService(serviceName, {
      add: function(num1, num2, cb){
        return cb(null, num1+num2);
      }
    });

    server.start();
    
    server.state.should.equal(DDing_thrift.SERVER_STATE.STATE_STARTED);
    should.exist(server.server);
    should.exist(server.server._handle);

    return next();
  });

  //
  it('Server close', function(next){
    var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
    var option = {
      port: 3000,
      thrift_gen: gen_path
    };
    server = Server.create(option);

    server.registerService(serviceName, {
      add: function(num1, num2, cb){
        return cb(null, num1+num2);
      }
    });

    server.start();
    server.close();

    server.state.should.equal(DDing_thrift.SERVER_STATE.STATE_CLOSED);
    should.exist(server.server);
    should.not.exist(server.server._handle);

    return next();
  });

});