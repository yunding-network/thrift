var Zookeeper = require('./Zookeeper'),
	Client = require('./Client');
var EventEmitter 	= require('events').EventEmitter,
	util 		 	= require('util'),
	ip 				= require('ip'),
	_ 				= require('underscore'),
	async 			= require('async'),
	FS 				= require('fs'),
	Path 			= require('path');
	
/**
 * [zookeeper client 构造函数]
 */
var ZClient = function(){
	return this;
};

util.inherits(ZClient, EventEmitter);


/**
 * [initThriftGenFile 初始化由Thrift生成文件路径方法]
 * 默认带_types.js为Thrift定义参数文件
 * 其他均为service文件
 * 
 * @return {[Voide]}
 */
ZClient.prototype.initThriftGenFile = function() {
	this.types_path = {};
	this.services_path = {};

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
 * [deleteClientByServiceName 通过ServiceName删除Client]
 * @param  {[Object]} zclient     [实例化]
 * @param  {[String]} serviceName [服务名称]
 * @param  {[String]} clientId    [客户端ID]
 * @return {[Void]}               []
 */
function deleteClientByServiceName(zclient, serviceName, clientId){
	// delete clients
	delete zclient.clients[clientId];
	// delete connectionOpts
	delete zclient.connectionOpts[clientId];
	// delete servicesClient
	var servicesClients = zclient.servicesClient[serviceName];
	// get all client
	for(var client of servicesClients){
		if(!client) continue;
		// verify clientId
		if(client.host == clientId.split(':')[0] && client.port == clientId.split(':')[1]){
			// delete 
			var index = servicesClients.indexOf(client);
			delete servicesClients[index];
			// delete null in array
			zclient.servicesClient[serviceName] = _.compact(zclient.servicesClient[serviceName]);
		}
	}
}

/**
 * [deleteClientInAllService 删除Services中的全部Client]
 * @param  {[type]} zclient  [实例化]
 * @param  {[type]} clientId [客户端ID]
 * @return {[void]}          []
 */
function deleteClientInAllService(zclient, clientId){
	for(var serviceName in zclient.services){
		deleteClientByServiceName(zclient, serviceName, clientId);
	}
}

/**
 * [deleteServiceByServiceNameAndClientID 通过服务名称和客户端ID删除服务]
 * @param  {[type]} zclient     [实例化]
 * @param  {[type]} serviceName [服务名称]
 * @param  {[type]} clientId    [客户端ID]
 * @return {[void]}             []
 */
function deleteServiceByServiceNameAndClientID(zclient, serviceName, clientId){
	var services = zclient.services[serviceName];
	for(var service of services.sets){
		if(!service) continue;
		if(service.clientId == clientId){
			var index = services.sets.indexOf(service);
			delete services.sets[index];
			zclient.services[serviceName].sets = _.compact(zclient.services[serviceName].sets);
		}
	}
}

/**
 * [deleteServiceByClientId 通过客户端Id下所有的服务]
 * @param  {[type]} zclient  [实例化]
 * @param  {[type]} clientId [客户端ID]
 * @return {[void]}          []
 */
function deleteServiceByClientId(zclient, clientId){
	for(var serviceName in zclient.services){
		var services = zclient.services[serviceName];
		for(var service of services.sets){
			if(!service) continue;
			if(service.clientId == clientId){
				var index = services.sets.indexOf(service);
				delete services.sets[index];
				zclient.services[serviceName].sets = _.compact(zclient.services[serviceName].sets);
			}
		}
	}
}

/**
 * [initZookeeper 初始化zookeeper]
 * @param  {[Object]} zkOpts [zookeeper配置]
 * @return {[void]}          [description]
 */
ZClient.prototype.initZookeeper = function(zkOpts){
	var self = this;

	this.zookeeperOpts = zkOpts;
	this.zookeeper = Zookeeper.create(this.zookeeperOpts);

	// set value of connect node
	this.zookeeper.on('set', function(path){
		// TODO: need deal
		// console.log('set: ', arguments);
	});

	// delete connect node
	this.zookeeper.on('delete', function(path){
		var pathStrArr = path.split('/');
		var serviceName = pathStrArr[1];
		var connect = pathStrArr[2];

		if(serviceName && connect){
			// delete service
			deleteServiceByServiceNameAndClientID(self, serviceName, connect);
		}
	});

	// add or delete connect node
	this.zookeeper.on('child', function(path){
		var serviceName = path.split('/')[1];
		self.zookeeper.getNodeChild(path, function(error, childrens){
			async.each(childrens, function(child, next){
				var clientId = child;
				async.waterfall([
					function(subNext){
						if(!self.clients[child]){
							// create connectionOpts
							createNodeConnectOpts(self, serviceName, clientId, function(error){
								if(error){
									throw new Error('add connect options error when Zookeeper get child watch');
									return subNext(error);
								}
								var client = createNodeConnection(self, clientId);
								return subNext(null, client);
							})
						}else{
							return subNext(null, self.clients[clientId]);
						}
					},
					function(client, subNext){
						if(client){
							createService(self, client, serviceName);
						}
						return subNext();
					}
				], next);
			}, function(error){
				if(error) console.error('Add new node with error: ', error);
			});
		});
	});
};

/**
 * [initServiceNode 初始化服务节点]
 * @param  {Function} cb     [回调]
 * @return {[Callback]}      []
 */
ZClient.prototype.initServiceNode = function(cb){
	var self = this;
	// init services and services client
	this.services = {};
	this.servicesClient = {};

	// get all service name
	this.zookeeper.getNodeChild('/', function(error, serviceNames){
		if(error) return cb(error);
		// traverse servicesNames
		async.each(serviceNames, function(serviceName, next){
			var servicePath = '/'+serviceName;
			// get every service's node
			self.zookeeper.getNodeValue(servicePath, function(error, val){
				if(error) return next(error);
				if(val == SERVICE_STATE.START){
					// number for invoke balance
					// sets is service array
					self.services[serviceName] = {
						number: 0,
						sets: []
					};
					self.servicesClient[serviceName] = [];
					// watch every [connect node]  in [service node]
					self.zookeeper.addChildWatcher(servicePath);
				}
				return next();
			});
		}, cb);
	});
};

/**
 * [createNodeConnectOpts 创建链接配置]
 * @param  {[type]}   zclient         [实例化]
 * @param  {[type]}   serviceName     [服务名称]
 * @param  {[type]}   clientId        [节点]
 * @param  {Function} cb              [回调]
 * @return {[cb]}                     []
 */
function createNodeConnectOpts(zclient, serviceName, clientId, cb){
	var nodePath = '/'+serviceName+'/'+clientId;
	zclient.zookeeper.getNodeValue(nodePath, function(error, val){
		if(error) return cb(error);
		var option = JSON.parse(val);
		if(option.prefix && option.prefix != zclient.prefix){
			return cb();
		}

		option.host = clientId.split(':')[0];
		option.port = clientId.split(':')[1];
		option.thrift_gen = zclient.thrift_gen_path;
		if(option.connection_type == CONNECT_TYPE.HTTP){
			option.nodeOptions = {
				path: option.path || '/'
			};
		}
		if(!zclient.connectionOpts[clientId]){
			option.services = [serviceName];
			zclient.connectionOpts[clientId] = option;
		}else{
			zclient.connectionOpts[clientId].services.push(serviceName);
		}
		zclient.zookeeper.addWatcher(nodePath);
		return cb();
	});
}


/**
 * [initConnectNode 初始化链接节点]
 * @param  {Function} cb [description]
 * @return {[type]}      [description]
 */
ZClient.prototype.initConnectNode = function(cb){
	var self = this;
	this.connectionOpts = {};
	async.each(_.keys(this.services), function(serviceName, next){
		var servicePath = '/'+serviceName;
		self.zookeeper.getNodeChild(servicePath, function(error, childrens){
			if(error) return next(error);
			async.each(childrens, function(clientId, subNext){
				createNodeConnectOpts(self, serviceName, clientId, subNext);
			}, next);
		});
	}, cb);
};

/**
 * [createNodeConnection 创建Thrift Client链接]
 * @param  {[type]} zclient   [实例化]
 * @param  {[type]} clientId  [客户端ID]
 * @return {[type]}           [description]
 */
function createNodeConnection(zclient, clientId){
	// get options for connect
	var opt = zclient.connectionOpts[clientId];
	// get client for connect
	var client = zclient.clients[clientId];
	// create a client if no 
	if(!opt && !client){
		// create
		client = Client.create(opt);
		// set id
		zclient.clients[clientId] = client;

		// set client in every service
		for(var serviceName of opt.services){
			zclient.servicesClient[serviceName].push(client);
		}

		// set close event deal function
		client.on('close', function(){
			// delete client in every service if connection close
			deleteClientInAllService(zclient, client.host+':'+client.port);
			// delete service by clientId if connection close
			deleteServiceByClientId(zclient, client.host+':'+client.port);
		});

	}
	// client create connection
	if(client && client.state != Client.CLIENT_STATE.STATE_CONNECTED){
		switch(opt.connection_type){
			case CONNECT_TYPE.COMMON:
				client.createConnect();
				break;

			case CONNECT_TYPE.HTTP:
				client.createHttpConnect();
				break;

			case CONNECT_TYPE.SSL:
				client.createSSLConnect();
				break;

			case CONNECT_TYPE.WEB_SOCKET:
				client.createWSConnect();
				break;

			case CONNECT_TYPE.STDIO:
				client.createStdIOConnect();
				break;

			case CONNECT_TYPE.XHR:
				client.createXHRConnect();
				break;
		}
	}

	return client;
}

/**
 * [initConnection 初始化链接函数]
 * @param  {[type]}   opts [链接配置]
 * @param  {Function} cb   [回调]
 * @return {[type]}        []
 */
ZClient.prototype.initConnection = function(prefix, opts, cb){
	if(typeof prefix == 'object'){
		cb = opts;
		opts = prefix;
		prefix = null;
	}
	if(prefix){
		this.prefix = prefix;
	}
	
	try{
		// opts need has thrift_gen path
		if(!opts.thrift_gen){
			return cb('Thrift gen file path error');
		}
		if(!FS.readdirSync(opts.thrift_gen)){
			return cb('Thrift gen file path error');
		}
		this.thrift_gen_path = opts.thrift_gen;
		// init thrift gen file path
		this.initThriftGenFile();

		var self = this;
		this.clients = {};
		async.waterfall([
			// init service node
			function(next){
				self.initServiceNode(next);
			},
			// init connect options
			function(next){
				self.initConnectNode(next);
			},
			// connect thrift server
			function(next){
				async.each(_.keys(self.connectionOpts), function(url, subNext){
					createNodeConnection(self, url);
					return subNext();
				}, next);
			},
			// init service
			function(next){
				self.initServices(next);
			}
		], cb);
	}catch(err){

		return cb(err);
	}
};

/**
 * [createService 创建服务]
 * @param  {[type]} zclient     [实例化]
 * @param  {[type]} client      [thrift客户端]
 * @param  {[type]} serviceName [服务名称]
 * @return {[void]}             []
 */
function createService(zclient, client, serviceName){
	if(!client) return;
	// get client id
	var clientId = client.host + ':' + client.port;
	// create if no
	if(_.where(zclient.services[serviceName].sets, {client: clientId}).length == 0){

		// get from client
		var service = client.getService(serviceName);
		// set client id
		service.clientId = clientId;
		// push to service's array
		zclient.services[serviceName].sets.push(service);
	}
}

/**
 * [initServices 初始化服务]
 * @param  {Function} cb [回调]
 * @return {[cb]}        []
 */
ZClient.prototype.initServices = function(cb){
	var self = this;
	for(var serviceName in this.servicesClient){
		var clients = this.servicesClient[serviceName];
		for(var client of clients){
			createService(self, client, serviceName);
		}
	}
	return cb();
};


/**
 * [getService 获得服务]
 * proxy代理 为了负载均衡
 * 
 * @param  {[type]} serviceName [服务名称]
 * @return {[type]}             []
 */
ZClient.prototype.getService = function(serviceName) {
	var self = this;
	return {
		proxy: function(){
			var fn = null, 
				args = [];

			for(var index in arguments){
				// get invoke function name
				if(index == 0){
					fn = arguments[index];
				// get invoke argument
				}else{
					args.push(arguments[index]);
				}
			}
			// get service with balance
			var service = getServicesByName(self.services, serviceName);

			if(service){
				service[fn].apply(service, args);
			}else{
				noServiceApply.apply(null, args);
			}
		}
	}
};


ZClient.prototype.getServiceByClientId = function(clientId, serviceName){
	var self = this;
	var client = this.clients[clientId];
	if(!client){
		return null;
	}
	return {
		proxy: function(){
			var fn = null, 
				args = [];

			for(var index in arguments){
				// get invoke function name
				if(index == 0){
					fn = arguments[index];
				// get invoke argument
				}else{
					args.push(arguments[index]);
				}
			}
			// get service with balance
			var service = client.getService(serviceName);
			if(service){
				service[fn].apply(service, args);
			}else{
				noServiceApply.apply(null, args);
			}
		}
	}
}

/**
 * [noServiceApply 当没有服务时候的返回 反正阻塞]
 * @return {[type]} [description]
 */
function noServiceApply(){
	
}

/**
 * [getServicesByName 服务负载均衡分配]
 * @param  {[type]} services    [全部服务]
 * @param  {[type]} serviceName [服务名称]
 * @return {[type]}             [服务]
 */
var getServicesByName = function(services, serviceName) {
	var allServiceObj = services[serviceName];
	if(!allServiceObj) return;
	allServiceObj.number++;
	
	// 当前请求ID 除以 全部服务数量 取余
	var remainder = allServiceObj.number % allServiceObj.sets.length;
	var flag = -1;
	// 安余数负载 0整除数组最后一个 其他
	if(remainder == 0){
		flag =  allServiceObj.sets.length-1;
	}else{
		flag =  remainder-1;
	}
	// 容错 小于0 则返回第一个
	flag = flag<0 ? 0 : flag; 
	// 
	return allServiceObj.sets[flag];
};

/**
 * [CONNECT_TYPE Const for connect type]
 * @type {Object}
 */
var CONNECT_TYPE = {
	"COMMON"		: 1,
	"HTTP"			: 2,
	"SSL"			: 3,
	"WEB_SOCKET"	: 4,
	"STDIO"			: 5,
	"XHR"			: 6
};

/**
 * [SERVICE_STATE Const for service state]
 * @type {Object}
 */
var SERVICE_STATE = {
	"START"	: 1,
	"STOP"	: 2,
	"PAUSE"	: 3
};

/**
 * [create 入口函数]
 * @return {[type]} [description]
 */
exports.create = function(){
	return new ZClient();
};
exports.CONNECT_TYPE = CONNECT_TYPE;
exports.SERVICE_STATE = SERVICE_STATE;