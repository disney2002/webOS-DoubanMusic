function PreferencesAssistant() {

}

PreferencesAssistant.prototype.setup = function() {
	// 初始化下拉框
	this.channelInit();

	// 获取上次保存的值
	this.storage = new Mojo.Depot( {
		name : "douban_music",
		version : 1,
		replace : false
	}, function() {
		this.storage.simpleGet('channel', function(response) {
			var size = Object.values(response).size();
			if (size == 0) {
				this.channel = 1;
			} else {
				this.channel = response;
			}
			Mojo.Log.info("------loan.lastValue.prefs-------:" + this.channel);
			this.selectorModel.value = this.channel;
			this.controller.modelChanged(this.selectorModel);
		}.bind(this))
	}.bind(this));
};

PreferencesAssistant.prototype.channelInit = function() {
	this.attributes = {
		choices : [ {
			label : "华语",
			value : '1'
		}, {
			label : "欧美",
			value : '2'
		}, {
			label : "七零",
			value : '3'
		}, {
			label : "八零",
			value : '4'
		}, {
			label : "九零",
			value : '5'
		}, {
			label : "粤语",
			value : '6'
		}, {
			label : "摇滚",
			value : '7'
		}, {
			label : "民谣",
			value : '8'
		}, {
			label : "轻音乐",
			value : '9'
		} ]
	};

	this.selectorModel = {
		value : '1',
		disabled : false
	};
	this.controller.setupWidget('commotionSelector', this.attributes,
			this.selectorModel);

	Mojo.Event.listen(this.controller.get('commotionSelector'),
			Mojo.Event.propertyChange, this.selectorChanged.bind(this));
}

PreferencesAssistant.prototype.selectorChanged = function(event) {
	Mojo.Log.info("------saved.value------" + event.value);
	this.storage.simpleAdd('channel', event.value, function() {
	}, function() {
	});
	this.controller.stageController.pushScene('main');  
}

PreferencesAssistant.prototype.cleanup = function() {
	Mojo.Log.info("---PreferencesAssistant stage cleanup---");
};
