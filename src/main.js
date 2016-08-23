/*============================================================================
 * @author     : Jae Yong Lee (leejaeyong7@gmail.com)
 * @file       : main.js
 * @brief      : Client Entry script
 * Copyright (c) Jae Yong Lee @ Reconstruct Inc
 =============================================================================*/
//----------------------------------------------------------------------------//
//                                  INCLUDES                                  //
//----------------------------------------------------------------------------//
var forge = require('./forge-client');
var $ = require('jquery');
//----------------------------------------------------------------------------//
//                                END INCLUDES                                //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                        MAIN INTERACTION DEFINITION                         //
//----------------------------------------------------------------------------//
var auth = {
  id: "U2c1AolI1lTb7xeKakquGvGGEdc9K0zv", 
  pw: "enb9GaUqMqAnyYmY"
};

$("#run").prop("disabled",true);
var fileReady = false;
var bucketNameReady = false;
$("#file-input").change(function(){
  $("#file-name").text($(this).val());
  $("#file-ready").css({display:"none"});
  fileReady = true;
  if(fileReady && bucketNameReady){
    $("#run").prop("disabled",false);
  }
});
// keep the login by refreshing auth
forge.login(auth,function(expire){
  var k = setInterval(forge.login(auth,function(e){
    console.log("Loggin in again");
  }),expire);
});
$("#bucket-name").keyup(function(){
  $("#bucket-exists").css({display:"none"});
  forge.checkBucket($("#bucket-name").val(),function(response){
    switch(response){
    case "exists":
      $("#bucket-exists").css({display:"block"});
      bucketNameReady = false;
      break;
    case "empty":
      $("#bucket-exists").css({display:"none"});
      bucketNameReady = true;
      break;
    case "denied":
      $("#bucket-exists").css({display:"block"});
      bucketNameReady = false;
      break;
    }
    if(fileReady && bucketNameReady){
      $("#run").prop("disabled",false);
    }
  });
});


$("#run").click(function(){
  $("#progress").css({display:"block"});
  $("#progress").text("Creating Bucket");
  forge.createBucket($("#bucket-name").val(),function(){
    $("#progress").text("Uploading To Bucket");
    var form = new FormData();
    form.append("file",$("#file-input")[0].files[0]);
    forge.uploadToBucket(form,function(){
      $("#progress").text("Translating File to SVF");
      forge.translateSVF(function(){
        $("#progress").text("Waiting For Job to finish...(Polling every 2 seconds)");
        var count = 0;
        var statusCheck = setInterval(function(){
          forge.checkStatus("svf",function(ref,done){
            if(done){
              clearInterval(statusCheck);
              $("#progress").text(
                "Jobs Finished! " + 
                "Use: "+
                "curl -X 'GET' -H 'Authorization: Bearer "+ref.token+"' -v"+
                "https://developer.api.autodesk.com/modelderivative/v2/designdata/"+
                ref.urn+
                "/manifest/"+done+" in terminal to download SVF file");

              forge.download("svf",function(){
                $("#progress").text("Jobs Done!");
              });
            } else {
              count++;
              $("#progress").text(
                "Waiting For Job to finish...(Polling every 2 seconds) Try: "
                  + count
              );
            }
          });
        },2000);
      });
    });
  });
});
window.forge = forge;
//----------------------------------------------------------------------------//
//                      END MAIN INTERACTION DEFINITION                       //
//----------------------------------------------------------------------------//
