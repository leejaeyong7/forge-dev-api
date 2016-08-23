/*============================================================================
 * @author     : Jae Yong Lee (leejaeyong7@gmail.com)
 * @file       : model-derivative.js
 * @brief      : Model derivative integration for projects
 * Copyright (c) Jae Yong Lee & Daniel Yuan @ Reconstruct Inc
 =============================================================================*/
//----------------------------------------------------------------------------//
//                                  INCLUDES                                  //
//----------------------------------------------------------------------------//
var fs = require("fs");
var path =  require('path');
var forge = require('./forge.js');
//----------------------------------------------------------------------------//
//                                END INCLUDES                                //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                            VARIABLE DEFINITIONS                            //
//----------------------------------------------------------------------------//
//TODO: Change Model Derivative to something that reconstruct owns
var derivCredentials = {
  id: "U2c1AolI1lTb7xeKakquGvGGEdc9K0zv", 
  pwd: "enb9GaUqMqAnyYmY"
};

//Check Interval is how often the server will check Model Derivative in seconds
var checkInterval = 20;
//----------------------------------------------------------------------------//
//                          END VARIABLE DEFINITIONS                          //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                             API IMPLEMENTATION                             //
//----------------------------------------------------------------------------//
var ModelDerivative = {
  /**
   * @brief sets up bucket and authorize them for processing
   */
  setupBucket: function(bucketName, callback){
    forge.authorize(derivCredentials.id, derivCredentials.pwd, function(auth){
      if (auth){
        console.log("authorized");
        auth = JSON.parse(auth);
        var token = auth["access_token"];
        console.log(token);
        console.log(bucketName);
        forge.checkBucket(token, bucketName, function(data){
          // If data exists,this means that the bucket was either not found or
          // we have access to the bucket (We can create Bucket)
          if (data){
            data = JSON.parse(data);
            console.log(data);
            if ((data.hasOwnProperty("bucketOwner") && 
                 data["bucketOwner"] == derivCredentials.id) ||

                (data.hasOwnProperty("reason") && 
                 data["reason"] == "Bucket already exists")){
              // bucket already exists
              callback({"token": token, "bucket": bucketName}); 

            }else if (data.hasOwnProperty("reason") && 
                      data["reason"] == "Bucket not found"){
              //Bucket is not found; therefore, we can create it
              forge.createBucket(token, bucketName, function(res){
                if (res){
                  if (res.hasOwnProperty("bucketOwner") &&
                      res["bucketOwner"] == derivCredentials.id){
                    callback({"token": token, "bucket": bucketName}); 
                  }else if (res.hasOwnProperty("reason")){
                    console.log(res.reason);
                    callback({err: res.reason});
                  }else{
                    console.log("Unknown Error type 1");
                    callback({err: "Unknown Error", msg: res});
                  }
                }else{
                  console.log("Can't create Bucket");
                  callback({err: "Couldn't create Bucket"});
                }
              });
            }else{
              console.log("Unknown Error type 2");
              callback({err: "Unknown Error", msg: data});
            }
          } else {
            console.log("Bucket Exists");
            callback({
              err: "Bucket already exists, and credentials can't access"
            });
          }
        });
      }else{
        console.log("Can't authorize");
        callback({err: "Couldn't authorize"});
      }
    });
  },

  /**
   * @brief This will get status from forge, and search for the jobType in the
   *        response
   */
  checkJob: function(token, urn, jobType, callback){
    forge.getStatus(token,urn, function(data){
      if (data){
        data = JSON.parse(data);
        var jobArray = data.derivatives;
        for (var i in jobArray){
          if (jobArray[i].outputType == jobType){
            callback(jobArray[i]);
            return;
          }
        }
        callback({data: null});
      }else{
        callback({err: "Couldn't get status"});
      }
    });
  },

  /**
   * @brief This is the handler for generating the SVF file that we extract 
   *        obj, tree, and property files from
   */
  generateSVF: function(token, bucketName, inputFile, callback){
    var fileName = path.basename(inputFile);
    forge.uploadFile(token, bucketName, fileName, inputFile, function(res){
      if (res){
        res = JSON.parse(res);
        if (res.hasOwnProperty("objectId")){
          var urnName = res["objectId"];
          var urn = forge.getSafeURL(urnName);
          console.log("Generated urn: " + urn);
          forge.translateSVF(token, urn, function(body){
            if (body.acceptedJobs){
              var checkStatus = function(){
                ModelDerivative.checkJob(token, urn, "svf", function(data){
                  if (data.progress == "complete" &&
                      data.status != "inprogress" &&
                      data.status != "pending"){
                    callback({success: true, urn: urn,data:data});
                  }else if (!data.hasOwnProperty("err")){
                    setTimeout(checkStatus, checkInterval*1000);
                  }else{
                    callback({err: "Unknown Error", msg: data});
                  }
                });
              };
              checkStatus();
            }else{
              callback({err: "SVF Job wasn't accepted", msg: body});
            }
          });
        }else{
          callback({err: "Couldn't upload file.", msg: res});
        }
      }else{
        callback({err: "Couldn't upload file."});
      }
    });
  },


  // Runs the workflow to upload the local file to model derivative, process
  // them, and download them back into a local directory
  runWorkflow: function(bucketName, sourceName, folderName, resreturn, callback){
    //Changing names based on the name template
    var extension = path.extname(sourceName);
    var fileName = path.basename(sourceName,extension);
    console.log("Running Workflow...");
    console.log("filename: "+ fileName);
    ModelDerivative.setupBucket(bucketName, function(bucketRes){
      console.log("Setting up Bucket");
      //Continue only if there is a toekn provided from setupBuckets
      if (bucketRes && bucketRes.hasOwnProperty("token")){
        var token = bucketRes.token;
        console.log("Generated token: " + token);
        ModelDerivative.generateSVF(token, bucketName, sourceName, function(svfRes){
          if (svfRes && svfRes.hasOwnProperty("urn")){
            var urn = svfRes.urn;
            var SVFURN = svfRes.data.urn;
            resreturn(urn);
            forge.getFile(token,urn,SVFURN,folderName,callback);
          }else{
            callback({err: "Couldn't get urn from generateSVF", msg: svfRes});
          }
        });
      }else{
        console.log("Can't generate token");
        callback({err: "Couldn't setup our buckets", msg: bucketRes});
      }
    });
  },
  checkStatus: function(bucketName, urn, callback){
    forge.authorize(derivCredentials.id, derivCredentials.pwd, function(auth){
      if (auth){
        auth = JSON.parse(auth);
        var token = auth["access_token"];
        forge.checkBucket(token, bucketName, function(data){
          // If data exists,this means that the bucket was either not found or
          // we have access to the bucket (We can create Bucket)
          if (data){
            data = JSON.parse(data);
            if ((data.hasOwnProperty("bucketOwner") && 
                 data["bucketOwner"] == derivCredentials.id) ||

                (data.hasOwnProperty("reason") && 
                 data["reason"] == "Bucket already exists")){
              // bucket already exists
              callback({"token": token, "bucket": bucketName}); 

              var checkStatus = function(){
                ModelDerivative.checkJob(token, urn, "svf", function(data){
                  if (data.progress == "complete" &&
                      data.status != "inprogress" &&
                      data.status != "pending"){
                    callback({data:data});
                  }else if (!data.hasOwnProperty("err")){
                    setTimeout(checkStatus, checkInterval*1000);
                  }else{
                    callback({err: "Unknown Error Type 2"});
                  }
                });
              };
              checkStatus();
            }else if (data.hasOwnProperty("reason") && 
                      data["reason"] == "Bucket not found"){
              callback({err:"Bucket not found"});
            } else {
              // no bucket
              callback({err: "Unknown Error Type 1"});
            }
          } else {
            // no data
            callback({err: "No access"});
          }
        });
      } else {
        // no auth
        callback({err: "No authorization"});
      }
    });
  }
};
//----------------------------------------------------------------------------//
//                           END API IMPLEMENTATION                           //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                               MODULE EXPORT                                //
//----------------------------------------------------------------------------//
module.exports= ModelDerivative;
//----------------------------------------------------------------------------//
//                             END MODULE EXPORT                              //
//----------------------------------------------------------------------------//
