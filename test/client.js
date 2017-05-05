var should  = require('should'),
    path    = require('path');

var DDing_thrift = require('../index'),
    Server = DDing_thrift.Server,
    Client = DDing_thrift.Client;

describe('Thrift Client Test', function() {
  var serviceName = 'Calculator';
  var typeName = 'service';

  var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
  var service_path = gen_path + serviceName + '.js';
  var type_path = gen_path + typeName + '_types.js';

  var server, webServer;
  var serverOption = {
    port: 3000,
    thrift_gen: gen_path
  };
  var webOption = {
    port: 3001,
    thrift_gen: gen_path,
    path: '/test'
  };

  before(function(next) {
    // create a server
    server = Server.create(serverOption);
    server.registerService(serviceName, {
      add: function(num1, num2, cb){
        return cb(null, num1+num2);
      }
    });
    server.start();

    // create a web server
    webServer = Server.create(webOption);
    webServer.registerService(serviceName, {
      add: function(num1, num2, cb){
        return cb(null, num1+num2);
      }
    });
    webServer.startWeb(webOption.path);

    return next();
  });

  after(function(next) {
    server.close();
    webServer.close();
    return next();
  });

  beforeEach(function(next) {
    return next();
  });

  afterEach(function(next) {
    return next();
  });


  it('Client create', function(next){
    var option = {
      host: '127.0.0.1',
      port: serverOption.port,
      thrift_gen: gen_path
    };

    var client = Client.create(option);

    should.exist(client);
    client.host.should.be.equal(option.host);
    client.port.should.be.equal(option.port);
    should.exist(client.opts);

    client.thrift_gen_path.should.be.equal(option.thrift_gen);
    client.services_path[serviceName].should.be.equal(service_path);
    client.types_path[typeName].should.be.equal(type_path);

    should.exist(client.transport);
    should.exist(client.protocol);
    should.exist(client.multiplexer);

    should.exist(client.services);
    should.not.exist(client.connection);

    client.state.should.be.equal(DDing_thrift.CLIENT_STATE.STATE_INITED);

    return next();
  });

  it('Client create common connect', function(next){
    var option = {
      host: '127.0.0.1',
      port: serverOption.port,
      thrift_gen: gen_path
    };

    var client = Client.create(option);
    client.createConnect();

    should.exist(client.connection);
    client.connection.host.should.be.equal(option.host);
    client.connection.port.should.be.equal(option.port);

    client.state.should.be.equal(DDing_thrift.CLIENT_STATE.STATE_CONNECTED);

    return next();
  });

  it('Client create http connect', function(next){
    var option = {
      host: '127.0.0.1',
      port: webOption.port,
      thrift_gen: gen_path,
      nodeOptions: {
        path: webOption.path
      }
    };

    var client = Client.create(option);
    client.createHttpConnect();

    should.exist(client.connection);
    client.connection.host.should.be.equal(option.host);
    client.connection.port.should.be.equal(option.port);

    should.exist(client.connection.nodeOptions);
    client.connection.nodeOptions.host.should.be.equal(option.host);
    client.connection.nodeOptions.port.should.be.equal(option.port);
    client.connection.nodeOptions.path.should.be.equal(option.nodeOptions.path);
    client.connection.nodeOptions.method.should.be.equal('POST');
    should.exist(client.connection.nodeOptions.headers);

    client.state.should.be.equal(DDing_thrift.CLIENT_STATE.STATE_CONNECTED);

    return next();
  });

  it('Client create ws connect', function(next){
    var option = {
      host: '127.0.0.1',
      port: webOption.port,
      thrift_gen: gen_path,
      path: webOption.path
    };

    var client = Client.create(option);
    client.createWSConnect();

    should.exist(client.connection);
    client.connection.host.should.be.equal(option.host);
    client.connection.port.should.be.equal(option.port);
    client.connection.path.should.be.equal(option.path);

    should.exist(client.connection.wsOptions);
    client.connection.wsOptions.host.should.be.equal(option.host);
    client.connection.wsOptions.port.should.be.equal(option.port);
    client.connection.wsOptions.path.should.be.equal(option.path);

    client.state.should.be.equal(DDing_thrift.CLIENT_STATE.STATE_CONNECTED);

    return next();
  });

  it('Client create service', function(next){
    var option = {
      host: '127.0.0.1',
      port: serverOption.port,
      thrift_gen: gen_path
    };

    var client = Client.create(option);
    client.createConnect();

    should.not.exist(client.services[serviceName]);

    var service = client.getService(serviceName);
    should.exist(service);
    should.exist(client.services[serviceName]);

    return next();
  });

  it('Client common invoke add function', function(next){
    var option = {
      host: '127.0.0.1',
      port: serverOption.port,
      thrift_gen: gen_path
    };

    var client = Client.create(option);
    client.createConnect();

    var service = client.getService(serviceName);

    var num1 = 1,
        num2 = 2;

    service.add(num1, num2, function(error, result){
      should.not.exist(error);
      result.should.be.equal(num1+num2);

      return next();
    });
  });

  it('Client http invoke add function', function(next){
    var option = {
      host: '127.0.0.1',
      port: webOption.port,
      thrift_gen: gen_path,
      nodeOptions: {
        path: webOption.path
      }
    };

    var client = Client.create(option);
    client.createHttpConnect();

    var service = client.getService(serviceName);

    var num1 = 1,
        num2 = 2;

    service.add(num1, num2, function(error, result){
      should.not.exist(error);
      result.should.be.equal(num1+num2);

      return next();
    });
  });

  it('Client websocket invoke add function', function(next){
    var option = {
      host: '127.0.0.1',
      port: webOption.port,
      thrift_gen: gen_path,
      path: webOption.path
    };

    var client = Client.create(option);
    client.createWSConnect();

    var service = client.getService(serviceName);

    var num1 = 1,
        num2 = 2;

    service.add(num1, num2, function(error, result){
      should.not.exist(error);
      result.should.be.equal(num1+num2);

      return next();
    });
  });
});