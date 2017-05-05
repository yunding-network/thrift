var should  = require('should'),
    path    = require('path'),
    async 	= require('async');

var DDing_thrift = require('../index'),
	ZookeeperClient = DDing_thrift.ZookeeperClient,
	Zookeeper = DDing_thrift.Zookeeper;

function getError(code, message){
	var error = new Error();
	error.code = code;
	error.message = message;

	return error;
}

function initZK_Protogenesis(option){
	var zk = new Zookeeper();
	zk.init({
		connect: option.hosts,
		timeout: option.timeout,
		debug_level: option.debug_level,
		host_order_deterministic: option.host_order_deterministic,
		data_as_buffer: option.data_as_buffer
	});
	return zk;
}

function createNode_Protogenesis(option, path, value, cb){
	var zk = initZK_Protogenesis(option);
	zk.a_create(path, value, null, function(errorCode, errorMsg, path){
		if(errorCode != 0){
			// console.error('node create result: %d, error: "%s", path: %s', errorCode, error, path);
			return cb(getError(errorCode, errorMsg));
		}else{
			// console.log('node create result: ok, path: %s', path);
			return cb(null, path);
		}
	});
}

function existNode_Protogenesis(option, path, cb){
	var zk = initZK_Protogenesis(option);
	zk.a_exists(path, false, function(errorCode, errorMsg, state){
		zk.close();
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
}

function getNodeValue_Protogenesis(option, path, cb){
	var zk = initZK_Protogenesis(option);
	zk.a_get(path, false, function(errorCode, errorMsg, stat, data){
		zk.close();
		if(errorCode != 0){
			// console.error('node get result: %d, error: "%s", path: %s', errorCode, error, data);
			return cb(getError(errorCode, errorMsg));
		}else{
			return cb(null, data, stat);
		}
	});
}

function clearNode_Protogenesis(option, path, version, cb){
	var zk = initZK_Protogenesis(option);
	zk.a_delete_(path, version, function(errorCode, errorMsg){
		zk.close();
		if(errorCode != 0){
			// console.error('node remove result: %d, error: "%s"', errorCode, error);
			return cb(getError(errorCode, errorMsg));
		}else{
			// console.log('node remove result: ok');
			return cb();
		}
	});
}

function getNodeChild_Protogenesis(option, path, cb){
	var zk = initZK_Protogenesis(option);
	zk.a_get_children2(path, false, function(errorCode, errorMsg, children, stat){
		zk.close();
		if(errorCode != 0){
			// console.error('node get child: %d, error: "%s", path: %s', errorCode, error);
			return cb(getError(errorCode, errorMsg));
		}else{
			return cb(null, children);
		}
	});
}


describe('Zookeeper Client Test', function() {
	var options = {
		hosts: '127.0.0.1:2181',
		timeout: 10000,
		debug_level: Zookeeper.ZOO_LOG_LEVEL_ERROR,
		host_order: false,
		isBuffer: false
	};
	var nodePath = '/mocha_test';
	var child1 = 'child1',
		child2 = 'child2';
	var value = 'Hello Zookeeper';

  	afterEach(function(next) {
  		async.waterfall([
  			function(cb){
  				getNodeValue_Protogenesis(options, nodePath+'/'+child1, function(error, value, state){
  					if(error) return cb();
  					clearNode_Protogenesis(options, nodePath+'/'+child1, state.version, cb);
  				});
  			},
  			function(cb){
  				getNodeValue_Protogenesis(options, nodePath+'/'+child2, function(error, value, state){
  					if(error) return cb();
  					clearNode_Protogenesis(options, nodePath+'/'+child2, state.version, cb);
  				});
  			},
  			function(cb){
  				getNodeValue_Protogenesis(options, nodePath, function(error, value, state){
  					if(error) return cb();
  					clearNode_Protogenesis(options, nodePath, state.version, cb);
  				});
  			}
  		], function(){return next();});
  	});


	it('zookeeper client create', function(next){
		var zk = ZookeeperClient.create(options);

		should.exist(zk);
		zk.hosts.should.be.equal(options.hosts);
		zk.timeout.should.be.equal(options.timeout);
		zk.debug_level.should.be.equal(options.debug_level);
		should.not.exist(zk.host_order);
		should.not.exist(zk.isBuffer);

		should.exist(zk.zk);

		return next();
	});

	it('zookeeper client add persistent node', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			result.should.be.equal(nodePath);
			existNode_Protogenesis(options, nodePath, function(enError, state){
				should.not.exist(enError);
				should.exist(state);
				getNodeValue_Protogenesis(options, nodePath, function(gnvErr, zkValue){
					should.not.exist(gnvErr);
					zkValue.toString().should.be.equal(value);
					zk.close();
					existNode_Protogenesis(options, nodePath, function(enError2, state2){
						should.not.exist(enError2);
						should.exist(state2);
						return next();
					});
				});
			});
		});
	});

	it('zookeeper client add ephemeral node', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createEphemeralNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			result.should.be.equal(nodePath);
			existNode_Protogenesis(options, nodePath, function(enError, state){
				should.not.exist(enError);
				should.exist(state);
				getNodeValue_Protogenesis(options, nodePath, function(gnvErr, zkValue){
					should.not.exist(gnvErr);
					zkValue.toString().should.be.equal(value);
					zk.close();
					existNode_Protogenesis(options, nodePath, function(enError2, state2){
						should.not.exist(enError2);
						should.not.exist(state2);
						return next();
					});
				});
			});
		});
	});

	it('zookeeper client add child node', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.createPersistentNode(nodePath+'/'+child1, value+':'+child1, function(c1Error, result){
				should.not.exist(c1Error);
				zk.createPersistentNode(nodePath+'/'+child2, value+':'+child2, function(c2Error, result){
					should.not.exist(c2Error);
					getNodeChild_Protogenesis(options, nodePath, function(gncError, childrens){
						should.not.exist(gncError);
						childrens.length.should.be.equal(2);
						childrens.indexOf(child1).should.be.not.equal(-1);
						childrens.indexOf(child2).should.be.not.equal(-1);
						return next();
					})
				});
			});
		});
	});

	it('zookeeper client get node value', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.getNodeValue(nodePath, function(gvErr, value, state){
				should.not.exist(gvErr);
				getNodeValue_Protogenesis(options, nodePath, function(gnvErr, zkValue){
					zkValue.toString().should.be.equal(value);
					return next();
				});
			});
		});
	});

	it('zookeeper client get node child', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.createPersistentNode(nodePath+'/'+child1, value+':'+child1, function(c1Error, result){
				should.not.exist(c1Error);
				zk.createPersistentNode(nodePath+'/'+child2, value+':'+child2, function(c2Error, result){
					should.not.exist(c2Error);
					zk.getNodeChild(nodePath, function(gncError, childrens){
						should.not.exist(gncError);
						childrens.length.should.be.equal(2);
						childrens.indexOf(child1).should.be.not.equal(-1);
						childrens.indexOf(child2).should.be.not.equal(-1);
						return next();
					});
				});
			});
		});
	});

	it('zookeeper client set node value', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, 1, function(cpError, result){
			should.not.exist(cpError);
			zk.getNodeValue(nodePath, function(gnvError, v1, state1){
				should.not.exist(gnvError);
				zk.setNodeValue(nodePath, 2, state1.version, function(setError, state2){
					should.not.exist(setError);
					should.exist(state2);
					zk.getNodeValue(nodePath, function(gnvError2, v2){
						should.not.exist(gnvError2);
						parseInt(v2).should.be.equal(2);
						return next();
					});
				});
			});
		});
	});

	it('zookeeper client remove node', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			result.should.be.equal(nodePath);
			existNode_Protogenesis(options, nodePath, function(enError, state){
				should.not.exist(enError);
				should.exist(state);
				zk.removeNode(nodePath, function(rnErr){
					should.not.exist(rnErr);
					existNode_Protogenesis(options, nodePath, function(enError2, state2){
						should.not.exist(enError2);
						should.not.exist(state2);
						return next();
					});
				})
			});
		});
	});

	it('zookeeper client exist node', function(next){
		var zk = ZookeeperClient.create(options);

		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.existNode(nodePath, function(esErr, state){
				should.not.exist(esErr);
				should.exist(state);
				return next();
			});
		});
	});

	it('zookeeper client watch node update twice', function(next){
		var zk = ZookeeperClient.create(options);
		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.addWatcher(nodePath);
			var times = 0;
			zk.on('set', function(updatePath){
				updatePath.should.be.equal(nodePath);
				times++;
				if(times == 2) return next();
			});
			zk.getNodeValue(nodePath, function(gnvError, v1, state1){
				should.not.exist(gnvError);
				zk.setNodeValue(nodePath, 'Hello DDing', state1.version, function(setError, state2){
					should.not.exist(setError);
					zk.getNodeValue(nodePath, function(gnvError, v1, state1){
						should.not.exist(gnvError);
						zk.setNodeValue(nodePath, 'Hello DDing', state1.version, function(setError, state2){
							should.not.exist(setError);
						});
					});
				});
			});
		});
		
	});

	it('zookeeper client watch node delete', function(next){
		var zk = ZookeeperClient.create(options);
		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.addWatcher(nodePath);
			zk.on('delete', function(deletePath){
				deletePath.should.be.equal(nodePath);
				zk.getNodeValue(nodePath, function(err){
					err.code.should.be.equal(-101);
					return next();
				});
			});
			zk.getNodeValue(nodePath, function(gnvError, v1, state1){
				should.not.exist(gnvError);
				zk.removeNode(nodePath, state1.version, function(delError){
					should.not.exist(delError);
				});
			});
		});
	});

	it('zookeeper client watch add child node', function(next){
		var zk = ZookeeperClient.create(options);
		zk.createPersistentNode(nodePath, value, function(cpError, result){
			should.not.exist(cpError);
			zk.addChildWatcher(nodePath);
			zk.on('child', function(updatePath){
				zk.getNodeChild(nodePath, function(gncError, childrens){
					should.not.exist(gncError);
					if(childrens.indexOf(child1) != -1) return next();
				});
			});

			zk.createPersistentNode(nodePath+'/'+child1, value+':'+child1, function(c1Error, result){
				should.not.exist(c1Error);
			});
		});
	});
});