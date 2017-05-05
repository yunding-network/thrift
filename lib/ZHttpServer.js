var Zookeeper = require('./Zookeeper'),
	ZServer = require('./ZServer');

var EventEmitter 	= require('events').EventEmitter,
	util 		 	= require('util'),
	ip 				= require('ip'),
	_ 				= require('underscore'),
	async 			= require('async');


/**
 * [ZCServer 构造函数]
 */
var ZHServer = function(){
};

// 继承ZServer
util.inherits(ZHServer, ZServer);

/**
 * [registerZookeeper 复写zookeeper注册函数]
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
ZHServer.prototype.registerZookeeper = function(cb){
	var self = this;
	var services = _.keys(this.services);
	async.each(services, function(serviceName, next){
		var options = {
			connection_type: self.CONNECT_TYPE.HTTP,
			path: self.serverPath
		};
		if(self.connectionOpts.transport){
			options['transport'] = self.connectionOpts.transport
		}
		if(self.connectionOpts.protocol){
			options['protocol'] = self.connectionOpts.protocol
		}
		self.createServiceNode(serviceName, self.SERVICE_STATE.START, function(error){
			if(error) return next(error);
			self.createLocalNode( serviceName, (self.connectionOpts.host || ip.address())+':'+(self.connectionOpts.port || 80), JSON.stringify(options), next);
		});
	}, function(error){
		if(error) return cb(error);
		return cb();
	})
};

/**
 * [protocol type const]
 * @type {Object}
 */
exports.protocol = {
	Binary: "TBinaryProtocol",
	JSON: "TJSONProtocol",
	Compact: "TCompactProtocol"
};

/**
 * [transport type const]
 * @type {Object}
 */
exports.transport = {
	Frame: "TFramedTransport",
	Buffer: "TBufferedTransport"
};

/**
 * [create 入口函数]
 * @return {[type]} [description]
 */
exports.create = function(){
	return new ZHServer;
};