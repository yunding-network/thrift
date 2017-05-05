var Zookeeper 	 = require('zookeeper'),
	EventEmitter = require('events').EventEmitter,
	util 		 = require('util');

/**
 * 构造函数
 * @param {[type]} opts [description]
 */
function ZKClient(opts){
	EventEmitter.call(this);

	var self = this;

	this.zk = new Zookeeper();

	this.hosts = opts.hosts;
	this.timeout = opts.timeout || 60000;
	this.debug_level = opts.debug_level || Zookeeper.ZOO_LOG_LEVEL_INFO;
	this.host_order_deterministic = opts.host_order || false;
	this.data_as_buffer = opts.isBuffer || false;

	this.zk.on('connect', self.emit.bind(self, 'connect'));
	this.zk.on('close', self.emit.bind(self, 'close'));

	return this;
}
util.inherits(ZKClient, EventEmitter);


/**
 * 常量
 * @type {Object}
 */
var WATCH_CONST = {
	STATE:{
		SESSION_TIMEOUT: -112,
		AUTH_FAIL: -113,
		CONNECTING: 1,
		ASSOCIATING: 2,
		CONNECTED: 3,
		NO_CONNECT: 999
	},
	TYPE: {
		CREATE: 1,
		DELETE: 2,
		UPDATE: 3,
		CHILD_CHANGE: 4,
		SESSION: -1,
		WATCHER_DELETE: -2
	}
};

function getError(code, message){
	var error = new Error();
	error.code = code;
	error.message = message;

	return error;
}

/**
 * [close description]
 * @return {[type]} [description]
 */
ZKClient.prototype.close = function(){
	this.zk.close();
};

/**
 * 监控某节点 会触发当前节点的删除和修改事件
 * @param {[type]} nodePath [description]
 */
ZKClient.prototype.addWatcher = function(nodePath){
	var client = this;

	client.zk.aw_get(nodePath, function(type, state, path){
		if(type == WATCH_CONST.TYPE.UPDATE && state == WATCH_CONST.STATE.CONNECTED){
			client.emit('set', path);	
		}else if(type == WATCH_CONST.TYPE.DELETE && state == WATCH_CONST.STATE.CONNECTED){
			client.emit('delete', path);
		}
		// else if(type == WATCH_CONST.TYPE.SESSION && state == WATCH_CONST.STATE.CONNECTING){
		// 	client.emit('reconnect');
		// }else if(type == WATCH_CONST.TYPE.SESSION && state == WATCH_CONST.STATE.SESSION_TIMEOUT){
		// 	client.emit('reconnect_session_timeout');
		// }else if(type == WATCH_CONST.TYPE.SESSION && state == WATCH_CONST.STATE.CONNECTED){
		// 	client.emit('reconnect_session');
		// }
		client.addWatcher(nodePath);
	}, function(rc, error, stat, data){
		client.emit('stat', stat);
	});
}


/**
 * 监控该节点下子节点  子节点有增删 都会触发
 * @param {[type]} nodePath [description]
 */
ZKClient.prototype.addChildWatcher = function(nodePath){
	var client = this;

	client.zk.aw_get_children2(nodePath, function(type, state, path){
		if(type == WATCH_CONST.TYPE.CHILD_CHANGE && state == WATCH_CONST.STATE.CONNECTED){
			client.emit('child', path);	
		}
		client.addChildWatcher(nodePath);
	}, function( rc, error, children, stat){
		client.emit('stat', stat);
	});
}


/**
 * 创建常规型 ZNode 用户需要显式的创建、删除
 * @param  {[String]}   	nodePath [节点路径]
 * @param  {[String]}   	value    [节点值]
 * @param  {Function} 		cb       [回调]
 * @return {[callback]}              [(error, result)]
 */
ZKClient.prototype.createPersistentNode = function(nodePath, value, cb){
	var self = this;
	this.zk.a_create(nodePath, value, null, function(errorCode, errorMsg, path){
		if(errorCode != 0){
			// console.error('node create result: %d, error: "%s", path: %s', errorCode, error, path);
			return cb(getError(errorCode, errorMsg));
		}else{
			// console.log('node create result: ok, path: %s', path);
			return cb(null, path);
		}
	});
};

/**
 * 创建临时型 ZNode 用户创建它之后，可以显式的删除，也可以在创建它的Session结束后，由ZooKeeper Server自动删除
 * @param  {[String]}   	nodePath [节点路径]
 * @param  {[String]}   	value    [节点值]
 * @param  {Function} 		cb       [回调]
 * @return {[callback]}              [(error, result)]
 */
ZKClient.prototype.createEphemeralNode = function(nodePath, value, cb){
	this.zk.a_create(nodePath, value, Zookeeper.ZOO_EPHEMERAL, function(errorCode, errorMsg, path){
		if(errorCode != 0){
			// console.error('node create result: %d, error: "%s", path: %s', errorCode, error, path);
			return cb(getError(errorCode, errorMsg));
		}else{
			// console.log('node create result: ok, path: %s', path);
			return cb(null, path);
		}
	});
};


/**
 * 获得某节点值
 * @param  {[String]}   nodePath [节点路径]
 * @param  {Function} 	cb       [回调]
 * @return {[callback]}          [(error, string)]
 */
ZKClient.prototype.getNodeValue = function(nodePath, cb){
	this.zk.a_get(nodePath, false, function(errorCode, errorMsg, stat, data){
		if(errorCode != 0){
			// console.error('node get result: %d, error: "%s", path: %s', errorCode, error, data);
			return cb(getError(errorCode, errorMsg));
		}else{
			return cb(null, data, stat);
		}
	});
};


/**
 * [setNodeValue description]
 * @param {[type]}   nodePath [description]
 * @param {[type]}   value    [description]
 * @param {Function} cb       [description]
 */
ZKClient.prototype.setNodeValue = function(nodePath, value, version, cb){
	this.zk.a_set(nodePath, value, version, function(errorCode, errorMsg, stat){
		if(errorCode != 0){
			return cb(getError(errorCode, errorMsg));
		}else{
			return cb(null, stat);
		}
	});
};


/**
 * 获得某节点值
 * @param  {[String]}   nodePath [节点路径]
 * @param  {Function} 	cb       [回调]
 * @return {[callback]}          [(error, array)]
 */
ZKClient.prototype.getNodeChild = function(nodePath, cb) {
	this.zk.a_get_children2(nodePath, false, function(errorCode, errorMsg, children, stat){
		if(errorCode != 0){
			// console.error('node get child: %d, error: "%s", path: %s', errorCode, error);
			return cb(getError(errorCode, errorMsg));
		}else{
			return cb(null, children);
		}
	});
};


/**
 * 删除一个节点
 * @param  {[String]}   	nodePath [节点路径]
 * @param  {Function} 		cb       [回调]
 * @return {[callback]}              [(error, result)]
 */
ZKClient.prototype.removeNode = function(nodePath, version, cb){
	if(typeof version == 'function'){
		cb = version;
		version = 0;
	}
	this.zk.a_delete_(nodePath, version, function(errorCode, errorMsg){
		if(errorCode != 0){
			// console.error('node remove result: %d, error: "%s"', errorCode, error);
			return cb(getError(errorCode, errorMsg));
		}else{
			// console.log('node remove result: ok');
			return cb();
		}
	});
};

/**
 * 判断节点是否还存在
 * @param  {[String]}   	nodePath [节点路径]
 * @param  {Function} 		cb       [回调]
 * @return {[callback]}              [(error, result)]
 */
ZKClient.prototype.existNode = function(nodePath, cb){
	this.zk.a_exists(nodePath, false, function(errorCode, errorMsg, state){
		if(errorCode != 0){
			if(errorCode == -101){
				return cb();
			}
			// console.error('node exist result: %d, error: "%s"', errorCode, error);
			return cb(getError(errorCode, errorMsg));
		}else{
			return cb(null, state);
		}
	});
};


/**
 * 入口函数
 * @param  {[type]} opts [description]
 * @return {[type]}      [description]
 */
exports.create= function(opts){
	if(!opts || !opts.hosts){
		throw new Error('Hosts error when create client');
		return;
	}
	var zkClient = new ZKClient(opts);
	zkClient.zk.init({
		connect: zkClient.hosts,
		timeout: zkClient.timeout,
		debug_level: zkClient.debug_level,
		host_order_deterministic: zkClient.host_order_deterministic,
		data_as_buffer: zkClient.data_as_buffer
	});

	return zkClient;
};