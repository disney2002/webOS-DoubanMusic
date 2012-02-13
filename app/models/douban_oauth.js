Douban = {};
Douban.api_key = "0302a7058862dc9d0907f510992895d7";
Douban.api_key_secret = "eed55397923d0e56";
Douban.request_token = "";
Douban.request_token_secret = "";
Douban.access_token = "";
Douban.access_token_secret = "";
Douban.uid = "";

Douban.signature_method = "HMAC-SHA1";

Douban.request_token_uri = "http://www.douban.com/service/auth/request_token";
Douban.access_token_uri = "http://www.douban.com/service/auth/access_token";
Douban.authorization_uri = "http://www.douban.com/service/auth/authorize?oauth_token=";

Douban.Oauth = ({

	getRequestToken: function(cb, fcb){
        var appController = Mojo.Controller.getAppController();
		var stageController = appController.getActiveStageController();
		var currentScene = stageController.activeScene();
		
        var message = {
            method: "GET",
            action: Douban.request_token_uri,
            parameters: {
                oauth_consumer_key: Douban.api_key,
                oauth_signature_method: Douban.signature_method,
                oauth_signature: "",
                oauth_timestamp: "",
                oauth_nonce: ""
            }
 	 	}
  
  		// 签名
  		OAuth.setTimestampAndNonce(message);
  		OAuth.SignatureMethod.sign(message, {
      		consumerSecret: Douban.api_key_secret
  		})
        //构造请求Request Token的url
      	var url = message.action + '?' + new Hash(OAuth.getParameterMap(message.parameters)).toQueryString();
  		var req = new Ajax.Request(url,{
      		
      		method: message.method,
      		onSuccess: function(resp){
          		var responseObj = OAuth.getParameterMap(OAuth.decodeForm(resp.responseText));
          		Douban.request_token = responseObj.oauth_token;
          		Douban.request_token_secret = responseObj.oauth_token_secret;
          		cb(Douban.request_token, Douban.request_token_secret);
      		}.bind(this),
      		onFailure: function(xhr){
        		fcb(xhr);
      		}.bind(this)
  		})
	},

	// 2. 用户确认授权
	getUserAuthorizationURL:function (){     
        //生成引导用户授权的url
    	return Douban.authorization_uri + Douban.request_token + '&oauth_callback=opp';
	},

	// 3. 换取Access Token，该步骤使用API Key、API Key Secret、Request Token和Request Token Secret签名
	getAccessToken:function(cb, fcb){
    	var message = {
        	method: "GET",
        	action: Douban.access_token_uri,
        	parameters: {
            	oauth_consumer_key: Douban.api_key,
            	oauth_token: Douban.request_token,
                oauth_signature_method: Douban.signature_method,
            	oauth_signature: "",
            	oauth_timestamp: "",
            	oauth_nonce: ""
        	}
    	}
    
    	// 签名
    	OAuth.setTimestampAndNonce(message);
    	OAuth.SignatureMethod.sign(message, {
        	consumerSecret: Douban.api_key_secret,
        	tokenSecret: Douban.request_token_secret,
   		});
   		
   		
   		//构造请求Access Token的url
        var url = message.action + '?' + new Hash(OAuth.getParameterMap(message.parameters)).toQueryString();

    	var req = new Ajax.Request(url,{
              
              method: message.method,
              onSuccess: function(resp){
                  //解析返回的Request Token和Request Token Secret
                  var responseObj = OAuth.getParameterMap(OAuth.decodeForm(resp.responseText));
                  Douban.access_token = responseObj.oauth_token;
                  Douban.access_token_secret = responseObj.oauth_token_secret;
                  Douban.Cookie.storeCookie();
                  cb(Douban.access_token, Douban.access_token_secret);
              }.bind(this),
              onFailure: function(xhr){
                  fcb(xhr);
              }.bind(this)
    	})
	},
	
	oauthHeader: function(url,method){
	 
	    var message = {
            method: method,
            action: url,
            parameters: {
            	oauth_consumer_key: Douban.api_key,
                oauth_token: Douban.access_token,
                oauth_signature_method: Douban.signature_method,
                oauth_signature: "",
                oauth_timestamp: "",
                oauth_nonce: ""
            }
          }
          // 签名
          OAuth.setTimestampAndNonce(message);
          OAuth.SignatureMethod.sign(message, {
              consumerSecret: Douban.api_key_secret,
              tokenSecret: Douban.access_token_secret,
          });

          //构造OAuth头部
          var oauth_header = "OAuth realm=\"\", oauth_consumer_key=";
              oauth_header += message.parameters.oauth_consumer_key + ', oauth_nonce=';
              oauth_header += message.parameters.oauth_nonce + ', oauth_timestamp=';
              oauth_header += message.parameters.oauth_timestamp + ', oauth_signature_method=HMAC-SHA1, oauth_signature=';
              oauth_header += message.parameters.oauth_signature + ', oauth_token=';
              oauth_header += message.parameters.oauth_token;             
 		  
 		  return oauth_header;
	}

});