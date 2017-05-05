var Thrift 			= require('thrift'),
	EventEmitter 	= require('events').EventEmitter,
	util 		 	= require('util'),
	FS 				= require('fs'),
	Path 			= require('path');

var CONST = {
	STATE_INITED    :  1,
	STATE_CONNECTED :  2,
	STATE_CLOSED    :  3
};

var CONNECT_TYPE = {
	"COMMON": 1,
	"HTTP": 2,
	"SSL": 3,
	"WEB_SOCKET": 4,
	"STDIO": 5,
	"XHR": 6
};

/**
 * [Client 构造函数]
 * 
 * @param {[Object]} opts [初始化参数，host/port必须存在]
 */
var Client = function(opts){
	//Initialize the emitter base object
	EventEmitter.call(this);

	// Set configuration
	this.opts = opts;
	this.host = opts.host;
	this.port = opts.port;

	// Initialize thrift gen file path
	this.thrift_gen_path = opts.thrift_gen;
	this.services_path = {};
	this.types_path = {};
	this.initThriftGenFile();

	// TFramedTransport || TBufferedTransport 
	this.transport  = Thrift[opts.transport] || Thrift.TBufferedTransport;
	// TBinaryProtocol || TJSONProtocol || TCompactProtocol
	this.protocol   = Thrift[opts.protocol]  || Thrift.TBinaryProtocol;

	// Initialize connection
	this.connection = null;

	// Initialize Services tree
	this.services = {};

	// Initialize multiplexer
	this.multiplexer = new Thrift.Multiplexer();

	// Set state 
	this.state = CONST.STATE_INITED;

	this.on('error', function(err){
		throw err;
	});



	return this;
};
util.inherits(Client, EventEmitter);

/**
 * [defaultOptions 默认配置生成]
 * 
 * @param  {[Object]} client [client实例]
 * @return {[Object]}        [description]
 */
function defaultOptions(client){
	client = client || {};

	return {
		transport: client.transport || Thrift.TBufferedTransport,
		protocol:  client.protocol  || Thrift.TBinaryProtocol
	};
}

/**
 * [initThriftGenFile 初始化由Thrift生成文件路径方法]
 * 默认带_types.js为Thrift定义参数文件
 * 其他均为service文件
 * 
 * @return {[Voide]}
 */
Client.prototype.initThriftGenFile = function() {
	if(!FS.existsSync(this.thrift_gen_path)){
		throw new Error("Thrift gen file path error");
		return;
	}

	var allFiles = FS.readdirSync(this.thrift_gen_path);
	var reg = /(\.js)$/;
	var typeReg = /(\_types\.js)$/;
	
	for(var file of allFiles){
		if(!reg.test(file)) continue;
		// types file
		if(typeReg.test(file)){
			this.types_path[file.replace(typeReg, '')] = Path.normalize(this.thrift_gen_path + '/' + file);
		// service file
		}else{
			this.services_path[file.replace(reg, '')] = Path.normalize(this.thrift_gen_path + '/' + file);
		}
	}
};


/**
 * [createConnect 创建默认连接]
 * 
 * @return {[Object]} [链接实例]
 */
Client.prototype.createConnect = function() {
	if(this.state > CONST.STATE_INITED){
		throw new Error('Client already connected');
		return;
	}

	var self = this;

	// create options by client
	var options = defaultOptions(this);
	if(this.opts.debug) options['debug'] = this.opts.debug;
	if(this.opts.max_attempts) options['max_attempts'] = this.opts.max_attempts;
	if(this.opts.retry_max_delay) options['retry_max_delay'] = this.opts.retry_max_delay;
	if(this.opts.connect_timeout) options['connect_timeout'] = this.opts.connect_timeout;
	if(this.opts.timeout) options['timeout'] = this.opts.timeout;

	// create connection and set into client
	var connection = Thrift.createConnection(self.host, self.port, options);
	this.connection = connection;
	
	// set error event on Client
	this.connection.on('error', self.emit.bind(self, 'error'));
	this.connection.on('close', self.emit.bind(self, 'close'));

	// set client state
	this.state = CONST.STATE_CONNECTED;
	return connection;
};


/**
 * [createHttpConnect 创建Http连接]
 * 
 * @return {[Object]} [链接实例]
 */
Client.prototype.createHttpConnect = function() {
	if(this.state > CONST.STATE_INITED){
		throw new Error('Client already connected');
		return;
	}

	var self = this;
	
	// create options by client
	var options = defaultOptions(this);
	if(this.opts.https) options['https'] = this.opts.https;
	// if(this.opts.path) options['path'] = this.opts.path;
	if(this.opts.headers) options['headers'] = this.opts.headers;
	if(this.opts.responseType) options['responseType'] = this.opts.responseType;
	if(this.opts.nodeOptions) options['nodeOptions'] = this.opts.nodeOptions;

	// create connection and set into client
	var connection = Thrift.createHttpConnection(self.host, self.port, options);
	this.connection = connection;

	// set error event on Client
	this.connection.on('error', self.emit.bind(self, 'error'));
	this.connection.on('close', self.emit.bind(self, 'close'));

	// set client state
	this.state = CONST.STATE_CONNECTED;
	return connection;
};


/**
 * [createSSLConnect 创建SSL安全连接]
 * 
 * @return {[Object]} [链接实例]
 */
Client.prototype.createSSLConnect = function() {
	if(this.state > CONST.STATE_INITED){
		throw new Error('Client already connected');
		return;
	}

	var self = this;
	
	// create options by client
	var options = defaultOptions(this);
	if(this.opts.https) options['https'] = this.opts.https;
	if(this.opts.path) options['path'] = this.opts.path;
	if(this.opts.headers) options['headers'] = this.opts.headers;
	if(this.opts.responseType) options['responseType'] = this.opts.responseType;
	if(this.opts.nodeOptions) options['nodeOptions'] = this.opts.nodeOptions;

	// create connection and set into client
	var connection = Thrift.createSSLConnection(self.host, self.port, options);
	this.connection = connection;

	// set error event on Client
	this.connection.on('error', self.emit.bind(self, 'error'));
	this.connection.on('close', self.emit.bind(self, 'close'));

	// set client state
	this.state = CONST.STATE_CONNECTED;
	return connection;
};


/**
 * [createWSConnect 创建WebSocket连接]
 * 
 * @return {[Object]} [链接实例]
 */
Client.prototype.createWSConnect = function() {
	if(this.state > CONST.STATE_INITED){
		throw new Error('Client already connected');
		return;
	}

	var self = this;

	// create options by client
	var options = defaultOptions(this);
	if(this.opts.secure) options['secure'] = this.opts.secure;
	if(this.opts.path) options['path'] = this.opts.path;
	if(this.opts.headers) options['headers'] = this.opts.headers;
	if(this.opts.wsOptions) options['wsOptions'] = this.opts.wsOptions;

	// create connection and set into client
	var connection = Thrift.createWSConnection(self.host, self.port, options);
	connection.open();

	this.connection = connection;

	// set error event on Client
	this.connection.on('error', self.emit.bind(self, 'error'));
	this.connection.on('close', self.emit.bind(self, 'close'));

	// set client state
	this.state = CONST.STATE_CONNECTED;
	return connection;
};


/**
 * [createStdIOConnect 创建通道连接]
 * 
 * @return {[Object]} [链接实例]
 */
Client.prototype.createStdIOConnect = function() {
	if(this.state > CONST.STATE_INITED){
		throw new Error('Client already connected');
		return;
	}

	var self = this;

	// get command from client opts
	var command = this.opts.command;
	if(!command) return null;

	// create options by client
	var options = defaultOptions(this);
	if(this.opts.debug) options['debug'] = this.opts.debug;
	if(this.opts.options) options['options'] = this.opts.options;

	// create connection and set into client
	var connection = Thrift.createStdIOConnection(command, options);
	this.connection = connection;

	// Set error event on Client
	this.connection.on('error', self.emit.bind(self, 'error'));
	this.connection.on('close', self.emit.bind(self, 'close'));

	// set client state
	this.state = CONST.STATE_CONNECTED;
	return connection;
};


/**
 * [createXHRConnect 创建XmlHttpRequest连接]
 * 
 * @return {[Object]} [链接实例]
 */
Client.prototype.createXHRConnect = function() {
	if(this.state > CONST.STATE_INITED){
		throw new Error('Client already connected');
		return;
	}

	var self = this;

	// create options by client
	var options = defaultOptions(this);
	if(this.opts.useCORS) options['useCORS'] = this.opts.useCORS;
	if(this.opts.headers) options['headers'] = this.opts.headers;
	if(this.opts.path) options['path'] = this.opts.path;
	if(this.opts.https) options['https'] = this.opts.https;

	// create connection and set into client
	var connection = Thrift.createXHRConnection(command, options);
	this.connection = connection;

	// set error event on Client
	this.connection.on('error', self.emit.bind(self, 'error'));
	this.connection.on('close', self.emit.bind(self, 'close'));

	// set client state
	this.state = CONST.STATE_CONNECTED;
	return connection;
};

/**
 * [getService 获得service实例]
 * 
 * @param  {[String]} serviceName [Service昵称]
 * @return {[Object]}             [service实例]
 */
Client.prototype.getService = function(serviceName){
	if(this.state < CONST.STATE_CONNECTED || !this.connection){
		throw new Error('Client not connect');
		return;
	}

	if(!this.services_path[serviceName]){
		throw new Error('Service name error');
		return;
	}

	var self = this;

	// return already created service
	if(this.services[serviceName]){
		return this.services[serviceName];
	}

	var thriftGenService = require(this.services_path[serviceName]);
	// create a new service and set into client
	var service = this.multiplexer.createClient(serviceName, thriftGenService, self.connection);
	this.services[serviceName] = service;

	return service;
};

/**
 * [close 关闭链接函数]
 * @return {[type]} [description]
 */
Client.prototype.close = function() {
	if(this.state > CONST.STATE_STARTED){ 
		throw new Error('Client already closed');
		return;
	};

	// close connection and set value
	this.connection.end();
	this.state = CONST.STATE_CLOSED;
};

/**
 * [create 入口函数]
 * @param  {[Object]}   opts [默认配置参数]
 * @param  {Function}   cb   [回调]
 * @return {[Object]}        [Client实例]
 */
exports.create = function(opts){
	if(!opts.host || !opts.port){
		throw new Error('Param error');
		return;
	}

	var client = new Client(opts);

	return client;
};

exports.CONNECT_TYPE = CONNECT_TYPE;
exports.CLIENT_STATE = CONST;