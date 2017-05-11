// var should  = require('should'),
//     path    = require('path'),
//     ip      = require('ip'),
//     async   = require('async');

// var DDing_thrift  = require('../index'),
// 	ZCommonServer = DDing_thrift.ZCommonServer,
// 	ZClient       = DDing_thrift.ZClient,
// 	Zookeeper = DDing_thrift.Zookeeper;

// function getError(code, message){
//   var error = new Error();
//   error.code = code;
//   error.message = message;

//   return error;
// }    

// function initZK_Protogenesis(option){
//   var zk = new Zookeeper();
//   zk.init({
//     connect: option.hosts,
//     timeout: option.timeout,
//     debug_level: option.debug_level,
//     host_order_deterministic: option.host_order_deterministic,
//     data_as_buffer: option.data_as_buffer
//   });
//   return zk;
// }

// function getNodeValue_Protogenesis(option, path, cb){
//   var zk = initZK_Protogenesis(option);
//   zk.a_get(path, false, function(errorCode, errorMsg, stat, data){
//     zk.close();
//     if(errorCode != 0){
//       // console.error('node get result: %d, error: "%s", path: %s', errorCode, error, data);
//       return cb(getError(errorCode, errorMsg));
//     }else{
//       return cb(null, data, stat);
//     }
//   });
// }

// function clearNode_Protogenesis(option, path, version, cb){
//   var zk = initZK_Protogenesis(option);
//   zk.a_delete_(path, version, function(errorCode, errorMsg){
//     zk.close();
//     if(errorCode != 0){
//       // console.error('node remove result: %d, error: "%s"', errorCode, error);
//       return cb(getError(errorCode, errorMsg));
//     }else{
//       // console.log('node remove result: ok');
//       return cb();
//     }
//   });
// } 	

// function zcsStart(zcs, serverOption, zookeeperOption, serviceName, typeName, cb){
// 	zcs = ZCommonServer.create();
// 	zcs.initZookeeper(zookeeperOption);
// 	zcs.initConnection(serverOption);
// 	zcs.registerService(serviceName, {
// 		add: function(num1, num2, cb){
// 			return cb(null, num1+num2);
// 		}
//     });
//     return zcs.start(cb);
// }

// function zcsClose(zcs, zkOption, zkNodePath, zkServicePath, next){
// 	if(zcs.connection && zcs.connection.state == DDing_thrift.SERVER_STATE.STATE_STARTED){
//      	zcs.closeConnection();
//     }
//     if(zcs.zookeeper){
//     	zcs.closeZookeeper();
//     }
//     zcs = null;
//     // delete zookeeper
//     async.waterfall([
//     	function(cb){
//       		getNodeValue_Protogenesis(zkOption, zkNodePath, function(error, value, state){
//             	if(error) return cb();
//             	clearNode_Protogenesis(zkOption, zkNodePath, state.version, cb);
//           	});
//         },
//         function(cb){
//           	getNodeValue_Protogenesis(zkOption, zkServicePath, function(error, value, state){
//             	if(error) return cb();
//             	clearNode_Protogenesis(zkOption, zkServicePath, state.version, cb);
//           	});
//     }], function(){
//        	return next();
//     });
// }

// describe('Thrift Client With Zookeeper', function() { 
// 	var serviceName = 'Calculator';
// 	var typeName = 'service';

// 	var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
// 	var service_path = gen_path + serviceName + '.js';
// 	var type_path = gen_path + typeName + '_types.js';

// 	var server, webServer;
// 	var server1Option = {
// 		port: 3000,
// 		thrift_gen: gen_path
// 	};
// 	var server2Option = {
// 		port: 3001,
// 		thrift_gen: gen_path
// 	};
// 	var zkOption = {
// 		hosts: "127.0.0.1:2181",
// 		debug_level: 1
// 	};
	
// 	var zkServicePath = '/'+serviceName;
//     var zkNodePath1 = zkServicePath + '/' + (ip.address()+':'+server1Option.port);
//     var zkNodePath2 = zkServicePath + '/' + (ip.address()+':'+server2Option.port);

//     var zcs1, zcs2;
// 	beforeEach(function(next) {
// 		async.waterfall([
//   			function(cb){
//   				zcsStart(zcs1, server1Option, zkOption, serviceName, typeName, cb);
//   			},
//   			function(cb){
//   				zcsStart(zcs2, server2Option, zkOption, serviceName, typeName, cb);
//   			}
//   		], next);
//   	});

//   	afterEach(function(next) {
//   		async.waterfall([
//   			function(cb){
//   				zcsClose(zcs1, zkOption, zkNodePath1, zkServicePath, cb);
//   			},
//   			function(cb){
//   				zcsClose(zcs2, zkOption, zkNodePath2, zkServicePath, cb);
//   			}
//   		], next);
//   	});

//   	it('test', function(next){
//   		return next();
//   	});

// });