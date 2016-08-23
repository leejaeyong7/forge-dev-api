/*============================================================================
 * @author     : Jae Yong Lee (leejaeyong7@gmail.com)
 * @file       : forge-client.js
 * @brief      : Client side handlers for model derivative 
 * Copyright (c) Jae Yong Lee @ Reconstruct Inc
 =============================================================================*/
//----------------------------------------------------------------------------//
//                            VARIABLE DEFINITIONS                            //
//----------------------------------------------------------------------------//
var $ = require('jquery');
var URLSafeBase64 = require('urlsafe-base64');
//----------------------------------------------------------------------------//
//                          END VARIABLE DEFINITIONS                          //
//----------------------------------------------------------------------------//
//----------------------------------------------------------------------------//
//                             MODULE DEFINITION                              //
//----------------------------------------------------------------------------//
/**
 * @brief Forge module constructor
 */
var forge = function(){
  this.token= null;
  this.name= null;
  this.urn = null;
  this.urns = {};
};

forge.prototype = {
  constructor:forge,
  /**
   * @brief login user with given id,pw
   * @action sets up token
   */
  login: function(auth,cb){
    var ref = this;
    $.post({
      url:"/forge-login",
      data: JSON.stringify(auth),
      contentType: 'application/json',
      dataType: 'json',
      success:function(e){
        ref.token = e.access_token;
        cb(e.expires_in);
      },
      error:function(e){
        console.log(e);
      }
    });
  },
  /**
   * @brief checks whether bucket exists given name(requires login)
   */
  checkBucket:function(name,cb){
    var ref = this;
    if(!ref.token){
      console.log("User is not logged in yet");
      return;
    }
    $.post({
      url:"/forge-checkBucket",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        name:name,
        token:ref.token
      }),
      success:function(e){
        if ((e.hasOwnProperty("bucketOwner") && 
             e["bucketOwner"] == e.id) ||

            (e.hasOwnProperty("reason") && 
             e["reason"] == "Bucket already exists")){
          // exists already
          cb("exists");
        } else if(e.hasOwnProperty("reason") && 
                  e["reason"] == "Bucket not found"){
          cb("empty");
        } else {
          cb("denied");
          console.log("denied");
        };
      },
      error:function(e){
        console.log(e);
      }
    });
  },
  /**
   * @brief creates Bucket with name, and calls callback
   */
  createBucket: function(name,cb){
    var ref = this;
    if(!ref.token){
      console.log("User is not logged in yet");
      return;
    }
    $.post({
      url:"/forge-createBucket",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        name:name,
        token:ref.token
      }),
      success:function(e){
        if (e.hasOwnProperty("reason")){
          // on error
          console.log(e);
        }else{
          ref.name = name;
          cb();
        }
      },
      error:function(e){
        console.log(e);
      }
    });
  },
  uploadToBucket: function(form,cb){
    var ref = this;
    if(!ref.token || !ref.name){
      console.log("No token/name");
      return;
    }
    form.append("token",ref.token);
    form.append("name",ref.name);
    
    $.post({
      url:"/forge-upload",
      data: form, 
      // for multipart formdata
      cache: false,
      contentType: false,
      processData: false,
      success:function(e){
        e = JSON.parse(e);
        if(e && e.objectId){
          ref.urn = URLSafeBase64.encode(btoa(e.objectId));
        }
        cb();
      },
      error:function(e){
        console.log(e);
      }
    });
  },

  translateSVF: function(cb){
    var ref = this;
    if(!ref.token || !ref.urn){
      console.log("No token/urn");
      return;
    }
    $.post({
      url:"/forge-translate-svf",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        token:ref.token,
        urn:ref.urn
      }),
      success:function(e){
        cb();
      },
      error: function(e){
        console.log(e);
      }
    });
  },

  checkStatus:function(jobtype,cb){
    var ref = this;
    if(!ref.token || !ref.urn){
      console.log("No token/urn");
      return;
    }
    $.post({
      url:"/forge-checkStatus",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        token:ref.token,
        urn:ref.urn
      }),
      success:function(e){
        for(var i in e.derivatives){
          if(e.derivatives[i].outputType == jobtype){
            for(var j in e.derivatives[i].children){
              if(["graphics","obj"].indexOf(
                e.derivatives[i].children[j].role.toLowerCase()
              ) > -1){
                ref.urns[jobtype] = e.derivatives[i].children[j].urn;
                return cb(ref,URLSafeBase64.encode(ref.urns[jobtype]));
              }
            }
          }
        }
        return cb(null);
      },
      error: function(e){
        console.log(e);
      }
    });
  },

  download:function(jobtype,cb){
    var ref = this;
    if(!ref.token || !ref.urn || !ref.urns.jobtype){
      console.log("No token/urn/fileurn");
      return;
    }
    $.post({
      url:"/forge-download",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        token:ref.token,
        urn:ref.urn,
        fileurn:ref.urns.jobtype
      }),
      success:function(e){
        var uriContent = "data:application/octet-stream," +
              encodeURIComponent(e);

        var newWindow=window.open(uriContent, 'output.' + jobtype);
        cb();
      },
      error: function(e){
        console.log(e);
      }
    });
  },
  getModelId: function(cb){
    var ref = this;
    $.post({
      url:"/forge-download",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        token:ref.token,
        urn:ref.urn
      }),
      success:function(e){
        e = JSON.parse(e);
        ref.guid = e.data.metadata[0].guid; 
        cb(ref.guid);
      },
      error: function(e){
        console.log(e);
      }
    });
  },
  extractOBJ: function(cb){
    var ref = this;
    $.post({
      url:"/forge-extract-obj",
      contentType: 'application/json',
      dataType: 'json',
      data:JSON.stringify({
        token:ref.token,
        urn:ref.urn,
        guid:ref.guid
      }),
      success:function(e){
      },
      error: function(e){
        console.log(e);
      }
    });
  }
}
//----------------------------------------------------------------------------//
//                           END MODULE DEFINITION                            //
//----------------------------------------------------------------------------// 
//----------------------------------------------------------------------------//
//                               MODULE EXPORTS                               //
//----------------------------------------------------------------------------//
module.exports = new forge();
//----------------------------------------------------------------------------//
//                             END MODULE EXPORTS                             //
//----------------------------------------------------------------------------//

  // $("#file-input").change(function(){
  //   $("#file-name").text($(this).val());
  // });
  // $('#theForm').ajaxSubmit({
  //   success: function(e) {
  //     e.preventDefault();
  //     console.log(e);
  //   }
  // });
  // var i = setInterval(function(){
  //   $.ajax({
  //     type:"GET",
  //     url:"/check-status",
  //     success:function(d){
  //       $("#spinner").css({display:"none"});
  //       $("#status").html("Finished Processing! file at: "+d.path);
  //       clearInterval(i);
  //     },
  //     error: function(d){
  //       $("#spinner").css({display:"none"});
  //       $("#status").html("Error in Processing! Error: "+d);
  //       clearInterval(i);
  //     }
  //   });
  // },2000);
