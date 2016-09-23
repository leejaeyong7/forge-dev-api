/*============================================================================
 * @author     : Jae Yong Lee (leejaeyong7@gmail.com)
 * @file       : main.js
 * @brief      : Node server script
 * Copyright (c) Jae Yong Lee
 =============================================================================*/
//----------------------------------------------------------------------------//
//                                  INCLUDES                                  //
//----------------------------------------------------------------------------//
var express = require('express');
var fs = require("fs");
var cors = require("cors");
var path = require("path");
var bodyParser = require("body-parser");
var formidable = require("formidable");
var forge = require("./app/forge");
var MD = require("./app/model-derivative");
var app = express();
var status;
//----------------------------------------------------------------------------//
//                                END INCLUDES                                //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                             APP CONFIGURATION                              //
//----------------------------------------------------------------------------//
app.use(bodyParser.json());
app.use('/js',express.static(path.join(__dirname, 'dist/js')));
app.use('/css',express.static(path.join(__dirname, 'dist/css')));
app.use('/',express.static(path.join(__dirname, 'assets/')));
app.use('/',express.static(path.join(__dirname, 'assets/')));
//----------------------------------------------------------------------------//
//                           END APP CONFIGURATION                            //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                              APP DEFINITIONS                               //
//----------------------------------------------------------------------------//

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname,'./dist/index.html'));
});

app.get("/viewer",function(req,res){
  res.sendFile(path.join(__dirname,'./dist/viewer.html'))
})

// logs user into forge
app.post("/forge-login",function(req,res){
  forge.authorize(req.body.id,req.body.pw,function(data){
    if(!data){
      return res.status(500).send("Authorization failed");
    } else{
      return res.send(data);
    }
  });
});


// checks bucket status
app.post("/forge-checkBucket",function(req,res){
  forge.checkBucket(req.body.token,req.body.name,function(data){
    if(!data){
      return res.status(500).send("No response from checking");
    } else{
      return res.send(data);
    }
  });
});

// creates bucket using name and token
app.post("/forge-createBucket",function(req,res){
  forge.createBucket(req.body.token,req.body.name,function(data){
    if(!data){
      return res.status(500).send("No response from checking");
    } else{
      return res.send(data);
    }
  });
});

// uploads file from client to forge
app.post("/forge-upload",function(req,res){
  var form = new formidable.IncomingForm();
  var token = null;
  var name = null;
  var filename = null; 
  var filepath = null; 
  form.on("field",function(field,value){
    if(field == "token"){
      token = value;
    } else if (field == "name"){
      name = value;
    }
  });
  form.on("file",function(name,file){
    filename = file.name;
    filepath = file.path;
  });
  form.on("end",function(field,value){
    forge.uploadFile(token,name,filename,filepath,function(data){
      if(!data){
        return res.status(500).send("upload failed");
      } else {
        return res.send(data);
      }
    });
  });
  form.parse(req);
});
// translate bucket to input format
app.post("/forge-translate-svf",function(req,res){
  forge.translateSVF(req.body.token,req.body.urn,function(data){
    if(!data){
      return res.status(500).send("Translation failed");
    } else {
      return res.send(data);
    }
  });
});

// gets status
app.post("/forge-checkStatus",function(req,res){
  forge.getStatus(req.body.token,req.body.urn,function(data){
    if(!data){
      return res.status(500).send("Status Check failed");
    } else {
      // var jobArray = data.derivatives;
      // for (var i in jobArray){
      //   if (jobArray[i].outputType == req.body.jobType){
      //     return res.send({urn:jobArray[i]});
      //   }
      // }
      return res.send(data);
    }
  });
});

app.post("/forge-download",function(req,res){
  forge.download(req.body.token,req.body.urn,req.body.fileurn).pipe(res);
  res.end();
});


app.post("/forge-model-guid",function(req,res){
  forge.getModelViewId(req.body.token,req.body.urn,function(data){
    if(data){
      res.send(data);
    } else {
      res.send(null);
    }
  });
});

app.post("/forge-extract-obj",function(req,res){
  forge.extractGeometry(req.body.token,req.body.urn,req.body.guid,
    function(data){
      if(data){
        res.send(data);
      } else {
        res.send(null);
      }
    });
});

app.listen(8080);
//----------------------------------------------------------------------------//
//                            END APP DEFINITIONS                             //
//----------------------------------------------------------------------------//
