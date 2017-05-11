var DDingThrift = require('dding-thrift'),
	Server = DDingThrift.Server,
	Client = DDingThrift.Client;
var path = require('path');

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
			console.log(`Target: ${target}, Finish: ${finish}, Finish Rate: ${(finish/target)*100}%`);
			console.log(`Used Time: ${s} s, Average Count per second: ${finish/s} n/s`);
			console.log(`Used Time: ${s} s, Average second per count: ${s*1000/finish} ms/n`);
		}
	});
}