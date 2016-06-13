var AllConnection = require('./allconnection.js');
var GainController = require('./gaincontroller.js');

function WebRTC(server){
	var self = this;
	var user;
	var allConnection;
	var localMediaStream;
	var audioTracks;
	var videoTracks;

	this.socket = io(server);

	//responde to different socket received from server
	
	self.socket.on("feedback", function(feedback) {
		console.log("feedback: " + feedback);
	})

	//new user enter the room
	self.socket.on("newUser", function(newUserData) {
		self.allConnection.buildEnvironment(newUserData, function(){
			self.socket.emit("ICESetupStatus", {
				type: "ICESetupStatus",
				local: self.user,
				remote: newUserData,
				ICESetupStatus: "DONE"
			});
			console.log("ICE setup Ready");
		});
	})

	//receive a sdp offer
	self.socket.on("SDPOffer", function(sdpOffer) {
		self.allConnection.onOffer(sdpOffer);
	})

	//receive a sdp answer
	self.socket.on("SDPAnswer", function(sdpAnswer) {
		self.allConnection.onAnswer(sdpAnswer);
	})

	//receive an ice candidate
	self.socket.on("candidate", function(iceCandidate) {
		self.allConnection.onCandidate(iceCandidate);
	})

	/* receive the status message of ICE setup from the peer
	 * before sending a sdp offer
	 * */
	self.socket.on("ICESetupStatus", function(iceSetupData){
		self.allConnection.initConnection(iceSetupData.remote);
	})

	// when a user in the room disconnnected
	self.socket.on("disconnectedUser", function(disConnectedUserName) {
		console.log("user " + disConnectedUserName + " is disconnected");
		self.allConnection.connection[disConnectedUserName] = null;
		self.onUserDisconnect(disConnectedUserName);
	})

	// when the user receive a chat message
	self.socket.on("chatMessage", function(chatMessageData){
		self.onChatMessage(chatMessageData);
	})
}


//find more details of following api in readme
WebRTC.prototype.login = function(userName, successCallback, failCallback) {
	var self = this;
	this.socket.emit("login", userName);
	this.socket.on("login", function(loginResponse){
		if (loginResponse.status === "success") {
			self.user = loginResponse.userName;
			successCallback();
		} else if (loginResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.createRoom = function(roomId, successCallback, failCallback){
	var self = this;
	this.socket.emit("createRoom", roomId);
	this.socket.on("createRoom", function(createRoomResponse){
		if (createRoomResponse.status === "success") {
			successCallback();
		} else if (createRoomResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.startCamera = function(){
	var self = this;
	try {
		self.allConnection = new AllConnection();
		self.allConnection.init(self.user, self.socket, function(){
			self.setLocalMediaStream(function(){
				self.socket.emit("setupCamera", {
					type: "setupCamera",
					cameraSetupStatus: "success"
				});
				self.gainController = new GainController(self.localMediaStream);
			});
		});
	}catch(e){
		self.socket.emit("setupCamera", {
			type: "setupCamera",
			cameraSetupStatus: "fail"
		});
	}
}

WebRTC.prototype.joinRoom = function(roomId, successCallback, failCallback) {
	var self = this;
	this.socket.emit("joinRoom", roomId);
	this.socket.on("joinRoom", function(joinRoomResponse){
		if (joinRoomResponse.status === "success") {
			successCallback();
		} else if (joinRoomResponse.status === "fail") {
			failCallback();
		}
	});
}

WebRTC.prototype.muteVideo = function(){
	if (this.videoTracks[0]) {
		this.videoTracks[0].enabled = false;
	}
}

WebRTC.prototype.unmuteVideo = function(){
	if (this.videoTracks[0]) {
		this.videoTracks[0].enabled = true;
	}
}

WebRTC.prototype.muteAudio = function(){
	if (this.audioTracks[0]) {
		this.audioTracks[0].enabled = false;
		this.gainController.setGain(0);
	}
}

WebRTC.prototype.unmuteAudio = function(){
	if (this.audioTracks[0]) {
		this.audioTracks[0].enabled = true;
		this.gainController.setGain(1);
	}
}

WebRTC.prototype.getPeers = function(cb){
	var self = this;
	this.socket.emit("peer");
	self.socket.on("peer", function(peerList){
		cb(peerList);
	})
}

WebRTC.prototype.onUserDisconnect = function(userDisconnected){
}

WebRTC.prototype.setLocalMediaStream = function(cb){
	this.localMediaStream = this.allConnection.stream;
	this.audioTracks = this.localMediaStream.getAudioTracks();
	this.videoTracks = this.localMediaStream.getVideoTracks();
	cb();
}

WebRTC.prototype.sendChatMessage = function(chatMessage){
	var self = this;
	this.socket.emit("chatMessage", {
		type: "chatMessage",
		user: self.user,
		content: chatMessage
	})
}

WebRTC.prototype.onChatMessage = function(chatMessageData){
}

module.exports = WebRTC;
