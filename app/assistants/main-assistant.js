function MainAssistant(){
    this.songs = [];
    this.sid = -1;
}

MainAssistant.prototype.setup = function(){
    this.stop = this.stop.bind(this);
    this.play = this.play.bind(this);
    this.nextButton = this.nextButton.bind(this);
    this.clearList = this.clearList.bind(this);
    this.resetList = this.resetList.bind(this);
	
	this.stop();
    
    this.db = new Mojo.Depot({
        name: "douban_music",
        version: 1,
        replace: false
    }, this.dbOpenOK.bind(this), this.dbOpenFail.bind(this));
    
    this.appMenuModel = {
        visible: true,
        items: [Mojo.Menu.editItem, {
            label: $L("Preferences..."),
            command: 'do-prefs'
        }, {
            label: $L("Help..."),
            command: 'help'
        }]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, {
        omitDefaultItems: true
    }, this.appMenuModel);
    
    this.initSongList();
};

MainAssistant.prototype.dbOpenOK = function(event){
    this.db.simpleGet('channel', function(response){
        var size = Object.values(response).size();
        if (size == 0) {
            this.channel = '1';
        }
        else {
            this.channel = response;
        }
        Mojo.Log.info("------loan.lastValue.main-------:" + this.channel);
        this.initLastValue(this.channel);
        this.douban();
    }
.bind(this));
}

MainAssistant.prototype.dbOpenFail = function(transaction, result){
    Mojo.Log.warn("Can't open database (#", result.message, ").");
}

MainAssistant.prototype.initLastValue = function(lastValue){
    Mojo.Log.info("lastValue = " + lastValue);
    switch (lastValue) {
        case '1':
            this.channelName = "华语MHz";
            break;
        case '2':
            this.channelName = "欧美MHz";
            break;
        case '3':
            this.channelName = "七零MHz";
            break;
        case '4':
            this.channelName = "八零MHz";
            break;
        case '5':
            this.channelName = "九零MHz";
            break;
        case '6':
            this.channelName = "粤语MHz";
            break;
        case '7':
            this.channelName = "摇滚MHz";
            break;
        case '8':
            this.channelName = "民谣MHz";
            break;
        case '9':
            this.channelName = "轻音乐MHz";
            break;
    }
    Mojo.Log.info("channelName = " + this.channelName);
    this.controller.get("channel").update(this.channelName);
}

MainAssistant.prototype.handleCommand = function(event){
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'help':
                this.controller.stageController.pushAppSupportInfoScene();
                break;
            case 'do-prefs':
                this.controller.stageController.pushScene('preferences');
                break;
        }
    }
}

MainAssistant.prototype.douban = function(){
    Mojo.Log.info("douban init = " + this.channel);
    this.songs = [];
    this.sid = -1;
    var url = "http://douban.fm/j/mine/playlist?channel=" + this.channel +
    "&type=n&status=p&uid=&sid=";
    var authorization = Douban.Oauth.oauthHeader(url, "GET");
    var req = new Ajax.Request(url, {
        method: "get",
        evalJSON: 'true',
        requestHeaders: ['Authorization', authorization],
        onLoading: this.onLoading.bind(this),
        onSuccess: this.viewList.bind(this),
        onFailure: this.viewFailure.bind(this)
    });
}

MainAssistant.prototype.onLoading = function(){
    this.controller.get("loading").style.display = "block";
}

MainAssistant.prototype.viewList = function(resp){
    this.controller.get("loading").style.display = "none";
    Mojo.Log.info("onSuccess" + resp.responseJSON["song"]);
    if (resp.responseJSON["r"] == 0) {
        this.songs = resp.responseJSON["song"];
        this.initSongList(this.songs)
        this.nextButton();
    }
}

MainAssistant.prototype.viewFailure = function(resp){
    this.controller.get("loading").style.display = "none";
    Mojo.Log.info("onFailure = " + Object.toJSON(resp));
}

// 初始化歌曲列表
MainAssistant.prototype.initSongList = function(songList){
    if (songList != null && songList.length > 0) {
        var list = new Array(songList.length);
        var i;
        for (i = 0; i < songList.length; i++) {
            list[i] = {
                data: $L(songList[i]["title"] + " - " + songList[i]["artist"]),
                value: songList[i],
                index: i
            };
        }
        this.listModel.items = list;
        this.controller.modelChanged(this.listModel);
    }
    else {
        this.listModel = {
            listTitle: $L('songList'),
            items: []
        };
        
        // Set up the attributes & model for the List widget:
        this.controller.setupWidget('songList', {
            itemTemplate: 'main/listitem',
            listTemplate: 'main/listcontainer',
            emptyTemplate: 'main/list-empty'
        }, this.listModel);
        
        Mojo.Event.listen(this.controller.get("songList"), Mojo.Event.listTap, this.handleUpdate.bind(this));
    }
}

MainAssistant.prototype.handleUpdate = function(event){
    this.initSongTime();
    this.sid = event.item.index;
    this.mediaInit(this.songs[this.sid]);
    this.play();
    this.controller.get("songCount").innerHTML = this.sid + 1 + " / " +
    this.songs.length;
}

MainAssistant.prototype.mediaInit = function(data){
    this.url = data["url"];
    this.title = data["title"];
    this.controller.get("songTitle").update(this.title);
    this.mediaLib = MojoLoader.require({
        name: "mediaextension",
        version: "1.0"
    });
    this.audioMedia = this.controller.get("audio-media");
    this.audioExtMedia = this.mediaLib.mediaextension.MediaExtension.getInstance(this.audioMedia);
    this.audioExtMedia.audioClass = "media";
    this.audioMedia.src = this.url;
    this.audioMedia.load();
    this.audioMedia.addEventListener('ended', this.nextButton, false);
    this.audioMedia.addEventListener('timeupdate', this.updateTime.bind(this), false);
}

MainAssistant.prototype.updateTime = function(){
    // 计算当前播放时间
    var _current = parseInt(this.audioMedia.currentTime);
    var _mins = parseInt(_current / 60);
    var _secs = _current % 60;
    _secs = _secs < 10 ? "0" + _secs : _secs;
    if (_mins > 10) {
        this.controller.get("currentTime").innerHTML = _mins + ":" + _secs;
    }
    else {
        this.controller.get("currentTime").innerHTML = "0" + _mins + ":" +
        _secs;
    }
    
    // 计算总播放时间
    if (!isNaN(this.audioMedia.duration)) {
        var _total = parseInt(this.audioMedia.duration);
        var _tmins = parseInt(_total / 60);
        var _tsecs = _total % 60;
        _tsecs = _tsecs < 10 ? "0" + _tsecs : _tsecs;
        if (_tmins > 10) {
            this.controller.get("totalTime").innerHTML = _tmins + ":" + _tsecs;
        }
        else {
            this.controller.get("totalTime").innerHTML = "0" + _tmins + ":" +
            _tsecs;
        }
    }
}

MainAssistant.prototype.nextButton = function(){
    this.next();
}

// 下一步播放，如果当前列表的歌曲播放完了，就获取新的歌曲列表
MainAssistant.prototype.next = function(){
    if (this.songs.length > 0) {
        this.initSongTime();
        this.sid = this.sid + 1;
        if (this.sid > this.songs.length) {
            this.resetList();
        }
        else {
            this.mediaInit(this.songs[this.sid]);
            this.play();
        }
        this.controller.get("songCount").style.display = "block";
        this.controller.get("songCount").innerHTML = this.sid + 1 + " / " +
        this.songs.length;
    }
}

MainAssistant.prototype.resetList = function(){
    this.douban();
}

MainAssistant.prototype.play = function(){
    if (this.songs.length > 0) {
        Mojo.Log.info("play");
        this.controller.get("play-button").style.display = "none";
        this.controller.get("pause-button").style.display = "block";
        this.audioMedia.play();
    }
}

MainAssistant.prototype.stop = function(){
    if (this.songs.length > 0) {
        Mojo.Log.info("stop");
        this.controller.get("play-button").style.display = "block";
        this.controller.get("pause-button").style.display = "none";
        this.audioMedia.pause();
    }
}

MainAssistant.prototype.clearList = function(){
    this.listModel.items = [];
    this.controller.modelChanged(this.listModel);
    this.sid = -1;
    this.controller.get("songCount").innerHTML = 0 + " / " + 0;
    this.stop();
}

MainAssistant.prototype.initSongTime = function(){
    this.controller.get("currentTime").innerHTML = "00:00";
    this.controller.get("totalTime").innerHTML = "00:00";
}

MainAssistant.prototype.activate = function(event){
    Mojo.Event.listen(this.controller.get("play-button"), Mojo.Event.tap, this.play);
    Mojo.Event.listen(this.controller.get("pause-button"), Mojo.Event.tap, this.stop);
    Mojo.Event.listen(this.controller.get("next-button"), Mojo.Event.tap, this.nextButton);
    Mojo.Event.listen(this.controller.get("clear-button"), Mojo.Event.tap, this.clearList);
    Mojo.Event.listen(this.controller.get("reset-button"), Mojo.Event.tap, this.resetList);
};

MainAssistant.prototype.deactivate = function(event){
    Mojo.Event.stopListening(this.controller.get("play-button"), Mojo.Event.tap, this.play);
    Mojo.Event.stopListening(this.controller.get("pause-button"), Mojo.Event.tap, this.stop);
    Mojo.Event.stopListening(this.controller.get("next-button"), Mojo.Event.tap, this.nextButton);
    Mojo.Event.stopListening(this.controller.get("clear-button"), Mojo.Event.tap, this.clearList);
    Mojo.Event.stopListening(this.controller.get("reset-button"), Mojo.Event.tap, this.resetList);
};

MainAssistant.prototype.cleanup = function(event){

};
