var Zookeeper = require('./Zookeeper'),
	Server = require('./Server');

var EventEmitter 	= require('events').EventEmitter,
	util 		 	= require('util'),
	ip 				= require('ip'),
	_ 				= require('underscore'),
	async 			= require('async');


var ZServer = function(opts){
	return this;
};
util.inherits(ZServer, EventEmitter);


ZServer.prototype.initZookeeper = function(zkOpts) {
	this.zookeeperOpts = zkOpts;
	this.zookeeper = Zookeeper.create(this.zookeeperOpts);
};

ZServer.prototype.initConnection = function(conOpts){
	this.connectionOpts = conOpts;
	this.connection = Server.create(conOpts);
	this.services = {};
};

ZServer.prototype.registerService = function(serviceName, serviceObj){
	try{
		this.connection.registerService(serviceName, serviceObj);
		this.services[serviceName] = {};
		for(var key in serviceObj){
			this.services[serviceName][key] = serviceObj[key];
		}
	}catch(err){
		delete this.services[serviceName];
	}
};

ZServer.prototype.createServiceNode = function(serviceName, value, cb){
	var self = this;
	var servicePath = '/' + serviceName;
	self.zookeeper.existNode(servicePath, function(error, result){
		if(error) return cb(error);
		if(result) return cb();
		self.zookeeper.createPersistentNode(servicePath, value, cb);
	});
};

ZServer.prototype.createLocalNode = function(serviceName, nodeName, value, cb) {
	var nodePath = '/' + serviceName + '/' + nodeName;
	this.zookeeper.createEphemeralNode(nodePath, value, cb);
};

ZServer.prototype.registerZookeeper = function(cb){
	return cb();
};

ZServer.prototype.start = function(isWeb, webPath, cb) {
	if(typeof isWeb == 'function'){
		cb = isWeb;
		isWeb = false;
	}else if(typeof webPath == 'function'){
		cb = webPath;
		webPath = '/';
	}
	var self = this;
	try{
		// start server
		if(!isWeb){
			this.connection.start();
		}else{
			this.connection.startWeb(webPath);
		}
		
		self.registerZookeeper(cb);
	}catch(err){
		return cb(err);
	}
};

ZServer.prototype.closeZookeeper = function() {
	this.zookeeper.close();
};

ZServer.prototype.closeConnection = function() {
	this.connection.close();
};

ZServer.prototype.close = function(cb){
	cb = cb || function(){};
	try{
		this.closeZookeeper();
		this.closeConnection();
	}catch(err){
		return cb(err);
	}
};


ZServer.prototype.CONNECT_TYPE = {
	"COMMON"		: 1,
	"HTTP"			: 2,
	"SSL"			: 3,
	"WEB_SOCKET"	: 4,
	"STDIO"			: 5,
	"XHR"			: 6
};

ZServer.prototype.SERVICE_STATE = {
	"START"	: 1,
	"STOP"	: 2,
	"PAUSE"	: 3
};

module.exports = ZServer;