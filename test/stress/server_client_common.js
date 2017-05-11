var DDingThrift = require('dding-thrift'),
	Server = DDingThrift.Server,
	Client = DDingThrift.Client;

var multiprocess = require('./multiprocess');

var path = require('path');

var serverFunc = function(){
	var server = Server.create({
		port: 3000,
		thrift_gen: path.normalize(__dirname + '/./thrift/gen-nodejs/'),
		protocol: DDingThrift.PROTOCOL.BINARY,		// (optional) default: TBinaryProtocol
		transport: DDingThrift.TRANSPORT.BUFFER 	// (optional) default: TBufferedTransport
	});

	var serviceName = 'Calculator'; // serviceName is thrift'file define service'name

	server.registerService(serviceName, {
	  add: function(num1, num2, cb){
	    return cb(null, num1+num2);
	  }
	});

	server.start();
};

var clientFunc = function(worker, cb){
	var client = Client.create({
		host: 'localhost',
		port: 3000,
		thrift_gen: path.normalize(__dirname + '/./thrift/gen-nodejs/'),
		protocol: DDingThrift.PROTOCOL.BINARY,		// (optional) default: TBinaryProtocol
		transport: DDingThrift.TRANSPORT.BUFFER 	// (optional) default: TBufferedTransport
	});

	client.createConnect();

	client.on('error', function(err){
		console.error('Client get error: %j', err);
	});

	client.on('close', function(){
		console.log('Client disconnect');
	});

	var serviceName = 'Calculator'; // serviceName is thrift'file define service'name

	var service = client.getService(serviceName);

	var target = parseInt(process.argv[2]);
	var finish = 0;
	var timer = process.hrtime();

	for(var i=0; i< target; i++){
		service.add(1, 2, function(error, result){
			finish++;
			if(finish == target){
				var t =process.hrtime(timer);
				var s = t[0] + t[1]/1000000000;
				return cb({
					target: target,
					finish: finish,
					time: s
				});
			}
		});
	}
};

multiprocess(serverFunc, clientFunc);