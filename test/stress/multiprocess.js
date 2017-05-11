var cluster = require('cluster'),
	numCPUs = require('os').cpus().length;


module.exports = function(masterFunc, workerFunc){
	var result = [];
	var flag = 0;
	var workerFinishNum = 0;
	if(cluster.isMaster){
		for (var i = 0; i < numCPUs-1; i++) {
			cluster.fork();
		}
		for(var key in cluster.workers){
			var worker = cluster.workers[key];
			worker.on('message', function(res){
				flag++;
				result.push(res);
				if(flag == numCPUs-1){
					var allTarget = 0, 
						allFinish = 0, 
						allTime = 0;
					for(var r of result){
						allTarget += r.target;
						allFinish += r.finish;
						allTime += r.time;
					}
					console.log(`Master count: 1, Worker count: ${numCPUs-1}`);
					console.log(`Target: ${allTarget}, Finish: ${allFinish}, Finish Rate: ${(allFinish/allTarget)*100}%`);
					console.log(`Used Time: ${allTime} s, Average: ${allFinish/allTime} n/s`);
				}
			});
		}
		masterFunc();
		cluster.on('exit', (worker, code, signal) => {
			workerFinishNum++;
			if(workerFinishNum == numCPUs-1){
				process.exit(1);
			}
		});
	}else{
		var worker = cluster.worker;
		workerFunc(worker, function(result){
			process.send(result);
			process.exit(1);
		});
	}
};