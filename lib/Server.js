var Thrift 			= require('thrift'),
	EventEmitter 	= require('events').EventEmitter,
	util 		 	= require('util'),
	FS 				= require('fs'),
	Path 			= require('path');

var CONST = {
	STATE_INITED:  1,
	STATE_STARTED: 2,
	STATE_CLOSED:  3
};

/**
 * [Server 构造函数]
 * 
 * @param {[Object]} opts [初始化参数，port必须存在]
 */
var Server = function(opts){
	// Initialize the emitter base object
	EventEmitter.call(this);

	// Initialize thrift gen file path
	this.thrift_gen_path = opts.thrift_gen;
	this.services_path = {};
	this.types_path = {};

	this.initThriftGenFile();

	// Set Configuration
	this.port = opts.port;
	this.tls  = opts.tls || null;

	// TFramedTransport || TBufferedTransport 
	this.transport  = Thrift[opts.transport] || Thrift.TBufferedTransport;
	// TBinaryProtocol || TJSONProtocol || TCompactProtocol
	this.protocol   = Thrift[opts.protocol]  || Thrift.TBinaryProtocol;

	// Initialize a processor for service's register
	this.processor  = new Thrift.MultiplexedProcessor();

	// Initialize the server(create by Node.JS net or tls module)
	this.server = null;

	// Set state for control
	this.state = CONST.STATE_INITED;
	
	return this;
};
util.inherits(Server, EventEmitter);

/**
 * [verifyServiceOBj 校验注册function的结构体是否正确]
 * 
 * @param  {[Object]} serviceObj  [function结构体]
 * @return {[Bealoon]}            [结果true/false]
 */
function verifyServiceOBj(serviceObj){
	// not object
	if(typeof serviceObj !== 'object') return false;
	// not array
	if(Array.isArray(serviceObj)) return false;
	// sub element's value is function
	for(var key in serviceObj){
		var val = serviceObj[key];
		if(typeof val != 'function'){
			return false;
			break;
		}
	}

	return true;
}

/**
 * [initThriftGenFile 初始化由Thrift生成文件路径方法]
 * 默认带_types.js为Thrift定义参数文件
 * 其他均为service文件
 * 
 * @return {[Voide]}
 */
Server.prototype.initThriftGenFile = function() {
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
 * [registerService 注册service]
 * 
 * @param  {[String]}   serviceName [service的昵称]
 * @param  {[Object]}   serviceObj  [注册service的function结构体{name: function}]
 * @return {[CallBack]}             [(error, result))]
 */
Server.prototype.registerService = function(serviceName, serviceObj) {
	// verify service name
	if(!this.services_path[serviceName]){
		throw new Error("Service's name error");
		return;
	}
	// service object's structure right
	if(!verifyServiceOBj(serviceObj)){
		throw new Error("Service's object type error");
		return;
	}

	var thriftGenService = require(this.services_path[serviceName]);

	// 创建处理器
	var serviceProcessor = new thriftGenService.Processor(serviceObj);
	// 注册service
	this.processor.registerProcessor(serviceName, serviceProcessor);
};

/**
 * [start 启动函数]
 * 
 * @return {[Void]}
 */
Server.prototype.start = function() {
	var self = this;
	// 判断状态
	if(this.state > CONST.STATE_INITED){
		throw new Error('Server already started');
		return;
	}

	// 默认配置
	var options = {
		transport: this.transport,
		protocol: this.protocol,
		tls: this.tls
	};

	// 创建多路server
	var server = Thrift.createMultiplexServer(this.processor,options);
	server.on('error', this.emit.bind(self, 'error'));

	// 监听
	server.listen(this.port);

	// 实例赋值
	this.server = server;
	this.state = CONST.STATE_STARTED;
};

Server.prototype.startWeb = function(path) {
	var self = this;
	// 判断状态
	if(this.state > CONST.STATE_INITED){
		throw new Error('Server already started');
		return;
	}

	var options = {
		cors: {'*': true},
		services: {}
	};
	options.services[path] = {
		transport: this.transport,
		protocol:  this.protocol,
		processor: this.processor
	};

	var httpServer = Thrift.createWebServer(options);
	httpServer.on('error', this.emit.bind(self, 'error'));

	//
	httpServer.listen(this.port);

	// 实例赋值
	this.server = httpServer;
	this.state = CONST.STATE_STARTED;
};

/**
 * [close 关闭函数]
 * 
 * @return {[Void]}      []
 */
Server.prototype.close = function() {
	// 判断状态
	if(this.state > CONST.STATE_STARTED){
		throw new Error('Server already closed');
		return;
	}

	// 断开连接
	this.server.close();
	// 实例赋值
	this.state = CONST.STATE_CLOSED;
};

/**
 * [create 入口函数]
 * 
 * @param  {[Object]} opts [初始化参数]
 * @return {[Object]}      [Server实例]
 */
exports.create = function(opts){
	if(!opts.port){
		throw new Error('Param error');
		return;
	}

	return new Server(opts);
};
exports.Server = Server;
exports.SERVER_STATE = CONST;