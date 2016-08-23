/*============================================================================
 * @author     : Jae Yong Lee (leejaeyong7@gmail.com)
 * @file       : forge.js
 * @brief      : Model derivative integration for projects
 * Copyright (c) Jae Yong Lee / UIUC Spring 2016
 =============================================================================*/
var request = require('request');
var fs = require("fs");

//Expire time temporarily set at 10 minutes
var expireTime = 600;

var config = process.env;

var Forge = {
  authorize: function(id, pw, callback){
    request.post({
      url:'https://developer.api.autodesk.com/authentication/v1/authenticate',
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      form:{
        'client_id':id,
        'client_secret':pw,
        'grant_type':'client_credentials',
        'scope':'data:read data:write bucket:create bucket:read'
      }
    },function(err,response,body){
      if(err) {
        callback(null);
      }
      callback(body);
    });
  },

  createBucket: function(token,name,callback){
    request.post({
      url:'https://developer.api.autodesk.com/oss/v2/buckets',
      headers:{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      json:{
        'bucketKey':name,
        'policyKey':'transient'
      }
    },function(err,response,body){
      if(err) {
        callback(null);
      }
      callback(body);
    });
  },

  checkBucket: function(token,name,callback){
    request.get({
      url:'https://developer.api.autodesk.com/oss/v2/buckets/'+name+'/details',
      headers:{
        'Authorization':' Bearer ' + token
      }
    },function(err,response,body){
      if(err) {
        callback(null);
      }
      callback(body);
    });
  },

  //Uploads local file specified by path to the Model Derivative bucket
  uploadFile: function(token,name,fileName,path,callback){
    fs.createReadStream(path).pipe(
      request.put({
      url:'https://developer.api.autodesk.com/oss/v2/buckets/'+name+'/objects/'+fileName,
      headers:{
        'Authorization':' Bearer ' + token
      }
    },function(err,response,body){
      if(err) {
        callback(null);
      }
      callback(body);
    }));
  },

  translateSVF: function(token,urn,callback){ 
    request.post({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/job',
      headers:{
        'Authorization':' Bearer ' + token,
        'Content-Type': 'application/json'
      },
      json:{
        'input' : {'urn': urn},
        'output': {"formats": [{"type": "svf","views": ["2d","3d"]}]}
      }
    }, function(err,response,body){
      if(err){
        callback(null);
      }
      callback(body);
    }); 
  },

  //Gets the status of the jobs in urn
  getStatus: function(token,urn,callback){
    request.get({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/'+urn+'/manifest',
      headers:{
        'Authorization':' Bearer ' + token  
      }
    }, function(err,response,body){
      if(err){
        callback(null);
      }
      callback(body);
    });
  },

  //Fetch metadata for the job from the urn
  getModelViewId: function(token,urn,callback){
    request.get({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/'+urn+'/metadata',
      headers:{
        'Authorization':' Bearer ' + token
      }
    }, function(err,response,body){
      if(err){
        callback(null);
      }
      callback(body);
    }); 
  },

  //Fetch tree structure from jobId & urn
  getTree: function(token,urn,jobId,path,callback){
    request.get({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/'+urn+'/metadata/'+jobId,
      headers:{
        'Authorization':' Bearer ' + token  
      }
    }, function(err,response,body){
      if(err){
        callback(null);
      }
      callback({success: true, 'path': path}); 
    }).pipe(fs.createWriteStream(path)); 
  },

  //Fetch tree properties from the jobId & urn
  getProperties: function(token,urn,jobId,path,callback){
    request.get({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/'+urn+'/metadata/'+jobId+'/properties',
      headers:{
        'Authorization':' Bearer ' + token  
      }
    }, function(err,response,body){
      if(err){
        callback(null);
      }
      callback({success: true, 'path': path}); 
    }).pipe(fs.createWriteStream(path)); 
  },
 
  //Runs the obj job on model derivative 
  extractGeometry: function(token,urn,jobId,callback){
    request.post({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/job',
      headers:{
        'Authorization':' Bearer ' + token,
        'Content-Type': 'application/json'
      },
      json:{
        'input': {
          'urn': urn    
        },
        'output': {
          "formats": [{"type": "obj","advanced": {"modelGuid":jobId,"objectIds":[-1]}}]
        }
      }
    }, function(err,response,body){
      if(err){
        callback(null);
      }
      callback(body);
    }); 
  },

  //Grabs obj after it has been processed by Model Derivative
  //It will process the safeURN by itself, just send in plaintext obj URN
  getFile: function(token,urn,fileURN){
    var safeURN = encodeURIComponent(fileURN);
    request.get({
      url:'https://developer.api.autodesk.com/modelderivative/v2/designdata/'+
        urn+'/manifest/'+safeURN,
      headers:{
        'Authorization':' Bearer ' + token  
      }
    });
  },

  //Generate safe url from string using rfc4648_ni base64 variant
  getSafeURL: function(url){
    var base64url = new Buffer(url).toString('base64');
    var curIndex = base64url.length - 1;
    while (curIndex >=0){
      if (base64url[curIndex] == "="){
        base64url = base64url.slice(0, -1);
      }else{
        break;
      }
      curIndex--;
    }
    return base64url;
  }
}

module.exports = Forge;
