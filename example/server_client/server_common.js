var DDingThrift = require('../../index'),
	Server = DDingThrift.Server;

var path = require('path');

var server = Server.create({
	port: 3000,
	thrift_gen: path.normalize(__dirname + '/../thrift/gen-nodejs/'),
	protocol: DDingThrift.PROTOCOL.BINARY,		// (optional) default: TBinaryProtocol
	transport: DDingThrift.TRANSPORT.BUFFER 	// (optional) default: TBufferedTransport
});

var serviceName = 'Calculator'; // serviceName is thrift'file define service'name

server.registerService(serviceName, {
  add: function(num1, num2, cb){
  	console.log('Server get a invoke: %d + %d', num1, num2);
    return cb(null, num1+num2);
  }
});

server.start();