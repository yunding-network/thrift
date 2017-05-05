var DDingThrift = require('../../index'),
	ZCommonServer = DDingThrift.ZCommonServer,
	Zookeeper = DDingThrift.Zookeeper;

var path = require('path');

var zserver_common = ZCommonServer.create();

zserver_common.initZookeeper({
	hosts: '127.0.0.1:2181', // support more like:{hosts: '127.0.0.1:2181, 127.0.0.1:2182, 127.0.0.1:2183'}
	timeout: 10000,
	debug_level: Zookeeper.ZOO_LOG_LEVEL_ERROR,
	host_order: false,
	isBuffer: false
});

zserver_common.initConnection({
	port: 3000,
	thrift_gen: path.normalize(__dirname + '/../thrift/gen-nodejs/'),
	protocol: DDingThrift.PROTOCOL.BINARY,		// (optional) default: TBinaryProtocol
	transport: DDingThrift.TRANSPORT.BUFFER 	// (optional) default: TBufferedTransport
});

var serviceName = 'Calculator'; // serviceName is thrift'file define service'name

zserver_common.registerService(serviceName, {
  add: function(num1, num2, cb){
  	console.log('Server get a invoke: %d + %d', num1, num2);
    return cb(null, num1+num2);
  }
});

zserver_common.start(function(){
	console.log('Server start.......');
});