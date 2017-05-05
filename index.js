exports.Thrift = require('thrift');
exports.Zookeeper = require('zookeeper');

exports.Server = require('./lib/Server');
exports.Client = require('./lib/Client');
exports.ZookeeperClient = require('./lib/Zookeeper');

exports.ZServer = require('./lib/ZServer');
exports.ZClient = require('./lib/ZClient');

exports.ZCommonServer = require('./lib/ZCommonServer');
exports.ZHttpServer = require('./lib/ZHttpServer');
exports.ZWSServer = require('./lib/ZWsServer');

exports.TRANSPORT = {
	FRAME 			: 'TFramedTransport',
	BUFFER  		: 'TBufferedTransport'
};
exports.PROTOCOL = {
	BINARY 			: 'TBinaryProtocol',
	JSON			: 'TJSONProtocol',
	COMPACT			: 'TCompactProtocol'
};
exports.SERVER_STATE = {
	STATE_INITED	: 1,
	STATE_STARTED	: 2,
	STATE_CLOSED	: 3
};
exports.CLIENT_STATE = {
	STATE_INITED	: 1,
	STATE_CONNECTED	: 2,
	STATE_CLOSED	: 3
};
exports.CONNECTION_TYPE = {
	"COMMON"		: 1,
	"HTTP"			: 2,
	"SSL"			: 3,
	"WEB_SOCKET"	: 4,
	"STDIO"			: 5,
	"XHR"			: 6
};