// import our modules 
var http         = require('http')
var finalhandler = require('finalhandler')
var compression  = require('compression')
var bodyParser   = require('body-parser')
var express   = require('express') 
var json2csv	 =require('json2csv')
var appRoot = require('app-root-path').path;
var moment = require('moment');
var message = "Hello World!"
var router = express.Router()
var fields = ['Actor Id', 'Actor Type','Session Id','ScriptName','Message','Start Time', 'End Time','Time Taken in ms','Status'];
var app = express();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const momenttimezone=require('moment-timezone');

app.set('trust proxy', true);
app.set('views',appRoot);
app.engine('pug', require('pug').__express);
app.set('view engine', 'pug');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(router);

var server = http.createServer(app);

var mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}
mkdirSync(appRoot+'/reports');
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};

router.use(compression());
 
// To test the availability of service.
router.get('/message', function (req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(message + '\n')
})
 
 /*
 To get the log analysis of single session.
 @praram: sessionId
 */
 router.get('/performance/session/:sessionId', function (req, res) {
    let sessionId = req.params.sessionId;
       readLogEntries(sessionId)
            .then(function (logEntries) {
			processLogs(logEntries.length ? logEntries : [],sessionId).then(function (processedLogs){
			var csv = json2csv({ data: processedLogs, fields: fields });
			fs.writeFile(appRoot+'/reports/'+sessionId+'-performance.csv', csv, function(err) {
			  if (err) throw err;
			  console.log('file saved');
			});
            res.render('report', {
                moment: moment,
                processedLogs: processedLogs.length ? processedLogs : []
            });
			});
			})
            .catch(function (reason) {
            console.log(reason);
            res.status(500).send(reason.message);
        });
});

/*
To get the log analysis of all the sessions.
*/

router.get('/performance/sessions', function (req, res) {
			processAllSessions().then(function( processedLogs){
			//console.log(processedLogs);
			var csv = json2csv({ data: processedLogs, fields: fields });
			fs.writeFile(appRoot+'/reports/All_Sessions-performance.csv', csv, function(err) {
			  if (err) throw err;
			  console.log('file saved');
			});
            res.render('report', {
                moment: moment,
                processedLogs: processedLogs.length ? processedLogs : []
            });			
			});
});

function processAllSessions(){
		return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
				let processedCount=0;
				let processedLogs=[];
				fs. readdir(appRoot+'/logs/', function(err, items) {
				items.forEach(function(item){
				if(item.includes('.log')){
				let sessionId=item.slice(0,(item.indexOf('.log')));
				readLogEntries(sessionId)
					.then(function (logEntries) {
					//console.log(logEntries);
				processLogs(logEntries.length ? logEntries : [],sessionId).then(function (processedSessionLogs){
				processedLogs=processedLogs.concat(processedSessionLogs);
				processedCount=processedCount+1;
				//console.log(processedCount);
				if(processedCount == items.length){
				resolve(processedLogs);
				}
				});
				//console.log(processedLogs);
				})
				.catch(function (reason) {
				console.log(err);
				reject(err);
				});
				}
				
				});
				return;
                });
				}
                catch (err) {
				console.log(err);
                    reject(err);
                    return;
                }
            });
		});
}

function processLogs(logEntries,sessionId){
	//console.log(logEntries);
	 return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                try {
	
				let actorsData={};
				let processedLogs=[];
				
				logEntries.forEach(function(logEntry){
				if(!actorsData[logEntry.actorId]){
				let actorLog = [];
				actorLog.push(logEntry);
				actorsData[logEntry.actorId]=actorLog;
				}else{
				let actorLog= actorsData[logEntry.actorId];
				actorLog.push(logEntry);
				actorsData[logEntry.actorId]=actorLog;
				}
				});
				var keys=Object.keys([actorsData][0]);
				//console.log("keys:"+keys);
				keys.forEach(function(key){
				//console.log("key:"+key);
				let scriptName;
				let previousStartTime;
				let previousData="";
				actorsData[key].forEach(function(actorLog){
				if(actorLog.msg.startsWith("Executing test")){
				scriptName=actorLog.msg.slice(actorLog.msg.indexOf("Executing test")+15,actorLog.msg.length);
				previousStartTime=actorLog.time;
				}else if(actorLog.msg.includes("started executing test")){
				scriptName=actorLog.msg.slice(actorLog.msg.indexOf("started executing test")+23,actorLog.msg.length);
				previousStartTime=actorLog.time;
				}else if(actorLog.msg.startsWith("------------") || actorLog.msg.startsWith("Test session "+sessionId+" has completed\n")){
				if(previousData !=""){
				previousData=previousData+',"End Time":"'+moment(actorLog.time).format("HH:mm:ss sss")+'","Time Taken in ms":"'+(new Date(actorLog.time)-new Date(previousStartTime))+'\"}';
				//console.log(previousData);
				let jsonData=JSON.parse(previousData);
				jsonData.Message=decodeURI(jsonData.Message);
				jsonData.ScriptName=decodeURI(jsonData.ScriptName);
				processedLogs.push(jsonData);
				previousData="";
				}
				previousStartTime=actorLog.time;
				}else if(actorLog.msg.startsWith("ERROR:")){
				if(previousData !=""){
				previousData=previousData+',"End Time":"'+moment(actorLog.time).format("HH:mm:ss sss")+'","Time Taken in ms":"'+(new Date(actorLog.time)-new Date(previousStartTime))+'\"}';
				let jsonData=JSON.parse(previousData);
				jsonData.Message=decodeURI(jsonData.Message);
				jsonData.ScriptName=decodeURI(jsonData.ScriptName);
				//console.log(jsonData);
				jsonData.Status="Failed";
				//console.log(jsonData);
				processedLogs.push(jsonData);
				previousData="";
				}
				}else if(actorLog.msg.startsWith("Executing action") || actorLog.msg.startsWith("DEBUG: Executing action")){
				if(previousData !=""){
				previousData=previousData+',\"End Time\":\"'+moment(actorLog.time).format("HH:mm:ss sss")+'\",\"Time Taken in ms\":\"'+(new Date(actorLog.time)-new Date(previousStartTime))+'\"}';
				//console.log(previousData);
				let jsonData=JSON.parse(previousData);
				jsonData.Message=decodeURI(jsonData.Message);
				jsonData.ScriptName=decodeURI(jsonData.ScriptName);
				processedLogs.push(jsonData);
				previousData="";
				}
				previousData='{\"Actor Id\":\"'+key+'\",\"Actor Type\":\"'+actorLog.actorType+'\",\"Session Id\":\"'+sessionId+'\",\"ScriptName\":\"'+encodeURI(scriptName)+'\",\"Message\":\"'+encodeURI(actorLog.msg)+'\",\"Start Time\":\"'+moment(actorLog.time).format("HH:mm:ss sss")+'\",\"Status\":\"Success\"';
				previousStartTime=actorLog.time;
				}
				});
				});
				resolve(processedLogs);
				}
							catch (err) {
							console.log(err);
								reject(err);
								return;
							}
				});
				});
}

function fileExists(filePath) {
			try {
				return fs.statSync(filePath).isFile();
			}
			catch (err) {
				return false;
			}
}

function format(text, ...any) {
    var args = arguments;
    return text.replace(/\{(\d+)\}/g, function (match, index) {
        var argIndex = Number(index) + 1;
        return typeof args[argIndex] !== 'undefined' ?
            args[argIndex] :
            match;
    });
}

	
function readLogEntries(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                let logEntries = [];
                let logFilePath = path.join(appRoot, 'logs', sessionId + '.log');
				//console.log(logFilePath);
                if (!fileExists(logFilePath)) {
                    resolve(logEntries);
                    return;
                }
                try {
                    let inputStream = fs.createReadStream(logFilePath);
                    inputStream.on('error', function (err) {
                        console.log(format('ERROR: Input stream error: ', err));
                        reject(err);
                        return;
                    });
                    let lineReader = readline.createInterface({
                        input: inputStream
                    });
                    lineReader.on('line', function (line) {
                        try {
							let jsonObject=JSON.parse(line);
							logEntries.push(jsonObject);
                        }
                        catch (err) {
                            console.log(format('ERROR: Failed parsing log line', line, err));
                        }
                    });
                    lineReader.on('close', function () {
                        resolve(logEntries);
                        return;
                    });
                    lineReader.on('error', function (err) {
                        console.log(format('ERROR: Readline error: ', err));
                        reject(err);
                        return;
                    });
                }
                catch (err) {
				console.log(err);
                    reject(err);
                    return;
                }
            });
        });
    }

// create and mount a new router for our API
//
// make our http server listen to connections
server.listen(2999);