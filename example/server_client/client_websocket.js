var DDingThrift = require('../../index'),
	Client = DDingThrift.Client;

var path = require('path');

var client = Client.create({
	host: 'localhost',
	port: 3000,
	thrift_gen: path.normalize(__dirname + '/../thrift/gen-nodejs/'),
	protocol: DDingThrift.PROTOCOL.BINARY,		// (optional) default: TBinaryProtocol
	transport: DDingThrift.TRANSPORT.BUFFER, 	// (optional) default: TBufferedTransport
	path: '/testWS'
});

client.createWSConnect();

client.on('error', function(err){
	console.error('Client get error: %j', err);
});

client.on('close', function(){
	console.log('Client disconnect');
});

var serviceName = 'Calculator'; // serviceName is thrift'file define service'name

var service = client.getService(serviceName);

service.add(1, 2, function(error, result){
	if(error){
		console.error('Client get error: %j', error);
	}

	console.log('Client get result: %d', result);
})