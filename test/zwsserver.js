var should  = require('should'),
    path    = require('path'),
    ip      = require('ip'),
    async   = require('async');

var DDing_thrift = require('../index'),
    ZWSServer = DDing_thrift.ZWSServer,
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

describe('Thrift Server With Zookeeper In Common Connect Test', function(){
  var serviceName = 'Calculator';
    var typeName = 'service';
    var gen_path = path.normalize(__dirname+'/'+'./gen-nodejs/');
    var service_path = gen_path + serviceName + '.js';
    var type_path = gen_path + typeName + '_types.js';

    var serverOption = {
      port: 3000,
      thrift_gen: gen_path
    };

    var zkOption = {
      hosts: "127.0.0.1:2181",
      debug_level: Zookeeper.ZOO_LOG_LEVEL_ERROR
    };

    var zkServicePath = '/'+serviceName;
    var zkNodePath = zkServicePath + '/' + (ip.address()+':'+serverOption.port);

    var zwss;

    afterEach(function(next) {
      // delete connection
      if(zwss.connection && zwss.connection.state == DDing_thrift.SERVER_STATE.STATE_STARTED){
        zwss.closeConnection();
      }
      if(zwss.zookeeper){
        zwss.closeZookeeper();
      }
      zwss = null;
      // delete zookeeper
      async.waterfall([
        function(cb){
          getNodeValue_Protogenesis(zkOption, zkNodePath, function(error, value, state){
            if(error) return cb();
            clearNode_Protogenesis(zkOption, zkNodePath, state.version, cb);
          });
        },
        function(cb){
          getNodeValue_Protogenesis(zkOption, zkServicePath, function(error, value, state){
            if(error) return cb();
            clearNode_Protogenesis(zkOption, zkServicePath, state.version, cb);
          });
        }
      ], function(){return next();});
    });

    it('Server register service', function(next){
      zwss = ZWSServer.create();
      zwss.initZookeeper(zkOption);
      zwss.initConnection(serverOption);

      zwss.registerService(serviceName, {
        add: function(num1, num2, cb){
          return cb(null, num1+num2);
        }
      });

      should.exist(zwss.services[serviceName].add);
      zwss.start(function(){
        getNodeValue_Protogenesis(zkOption, zkServicePath, function(gnErr, data, state){
          should.not.exist(gnErr);
          should.exist(data);
          should.exist(state);
          getNodeValue_Protogenesis(zkOption, zkNodePath, function(gnErr2, data, state){
            should.not.exist(gnErr2);
            should.exist(data);
            JSON.parse(data).connection_type.should.be.equal(DDing_thrift.CONNECTION_TYPE.WEB_SOCKET);
            should.exist(state);
            return next();
          })
        });
      });
    });
});