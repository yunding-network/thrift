var DDingThrift = require('../../index'),
	ZClient = DDingThrift.ZClient,
	Zookeeper = DDingThrift.Zookeeper;

var path = require('path');

var zclient = ZClient.create();

zclient.initZookeeper({
	hosts: '127.0.0.1:2181', // support more like:{hosts: '127.0.0.1:2181, 127.0.0.1:2182, 127.0.0.1:2183'}
	timeout: 10000,
	debug_level: Zookeeper.ZOO_LOG_LEVEL_ERROR,
	host_order: false,
	isBuffer: false
});

zclient.initConnection('testPrefix', {
	// zclient will auto get host and port from zookeeper
	// zclient will auto judge connect type from zookeeper
	thrift_gen: path.normalize(__dirname + '/../thrift/gen-nodejs/'),
	protocol: DDingThrift.PROTOCOL.BINARY,		// (optional) default: TBinaryProtocol
	transport: DDingThrift.TRANSPORT.BUFFER 	// (optional) default: TBufferedTransport
}, function(){

	// var serviceName = 'Calculator'; // serviceName is thrift'file define service'name
	// var service = zclient.getService(serviceName);

	// // service's proxy will balance server
	// service.proxy('add', 1, 2, function(error, result){
	// 	if(error){
	// 		console.error('Client get error: %j', error);
	// 	}

	// 	console.log('Client get result: %d', result);
	// });

	var serviceName = 'Calculator';
	var service = zclient.getServiceByClientId('192.168.20.78:3000', serviceName);
	service.proxy('add', 1, 2, function(error, result){
		if(error){
			console.error('Client get error: %j', error);
		}

		console.log('Client get result: %d', result);
	});
});