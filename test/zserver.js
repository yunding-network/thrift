var should  = require('should'),
    path    = require('path');

var DDing_thrift = require('../index'),
    ZServer = DDing_thrift.ZServer,
    Zookeeper = DDing_thrift.Zookeeper;

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

    var zs;

    afterEach(function(next) {
      // delete connection
	    if(zs.connection && zs.connection.state == DDing_thrift.SERVER_STATE.STATE_STARTED){
	     	zs.closeConnection();
	    }
	    if(zs.zookeeper){
	    	zs.closeZookeeper();
	    }
	    zs = null;
	    return next();
	  });

  	it('Server create', function(next){
  		zs = new ZServer();
  		should.exist(zs);
  		return next();
  	});

  	it('Server init zookeeper', function(next){
  		zs = new ZServer();
  		zs.initZookeeper(zkOption);
  		should.exist(zs.zookeeperOpts);
  		should.exist(zs.zookeeper);
  		return next();
  	});

  	it('Server init connection', function(next){
  		zs = new ZServer();
  		zs.initZookeeper(zkOption);
  		zs.initConnection(serverOption);
  		should.exist(zs.connectionOpts);
  		should.exist(zs.connection);
  		should.exist(zs.services);
  		zs.connection.state.should.equal(DDing_thrift.SERVER_STATE.STATE_INITED);
  		return next();
  	});

  	it('Server start', function(next){
  		zs = new ZServer();
  		zs.initZookeeper(zkOption);
  		zs.initConnection(serverOption);

	    zs.start(function(){
	    	zs.connection.state.should.equal(DDing_thrift.SERVER_STATE.STATE_STARTED);
	    	return next();
	    });
  	});

  	it('Server close', function(next){
  		zs = new ZServer();
  		zs.initZookeeper(zkOption);
  		zs.initConnection(serverOption);

	    zs.start(function(){
	    	zs.connection.state.should.equal(DDing_thrift.SERVER_STATE.STATE_STARTED);
	    	zs.close();
	    	zs.connection.state.should.equal(DDing_thrift.SERVER_STATE.STATE_CLOSED);
	    	return next();
	    });
  	})
});