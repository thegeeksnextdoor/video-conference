(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WebRTC = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var PeerConnection = require('./peerconnection.js');
var Indicator = require('./indicator.js');

function AllConnection(){
	var local;
	var stream;
	this.connection = {};
	this.indicator = new Indicator();
	this.localVideo = document.getElementById("localVideo");
	this.localVideo.autoplay = true;
}

// initialise the setup of own camera
AllConnection.prototype.init = function(user, socket, cb){
	var self = this;
	this.local = user;
	this.socket = socket;
	if (this.indicator.hasUserMedia()) {
		navigator.getUserMedia({ video: true, audio: true }, function (stream) {
			self.localVideo.src = window.URL.createObjectURL(stream);
			self.stream = stream;
			cb();
		}, function (error) {
			console.log(error);
		});
	} else {
		alert("Sorry, your browser does not support WebRTC.");
	}
}

//initialise a connection with peers
AllConnection.prototype.initConnection = function(peer){
	var self = this;
	self.connection[peer] = new PeerConnection(self.local, peer, self.socket, self.stream);
	self.connection[peer].createVideo(peer, function(){
		self.connection[peer].startConnection(peer, function(){
			self.connection[peer].setupPeerConnection(peer, function(){
				self.connection[peer].makeOffer( function(offer){
					console.log("send offer to " + peer);
					self.socket.emit("SDPOffer", {
						type: "SDPOffer",
						local: self.local,
						remote: peer,
						offer: offer
					});
				})
			})
		})
	})
}

//setup environment to be connected by others
AllConnection.prototype.buildEnvironment = function(peer, cb){
	var self = this;
	self.connection[peer] = new PeerConnection(self.local, peer, self.socket, self.stream);
	self.connection[peer].createVideo(peer, function(){
		self.connection[peer].startConnection(peer, function(){
			self.connection[peer].setupPeerConnection(peer, function(){
				cb();
			});
		});
	});
}

//when receive an spd offer
AllConnection.prototype.onOffer = function(sdpOffer){
	var self = this;
	self.connection[sdpOffer.remote].receiveOffer(sdpOffer, function(sdpAnswer){
		self.socket.emit("SDPAnswer", {
			type: "SDPAnswer",
			local: self.local,
			remote: sdpOffer.remote,
			answer: sdpAnswer
		});
	}) 
}

//when receive an spd answer
AllConnection.prototype.onAnswer = function(sdpAnswer){
	this.connection[sdpAnswer.remote].receiveAnswer(sdpAnswer);
}

//when receive an ice candidate
AllConnection.prototype.onCandidate = function(iceCandidate){
	this.connection[iceCandidate.remote].addCandidate(iceCandidate);
}

module.exports = AllConnection;

},{"./indicator.js":3,"./peerconnection.js":5}],2:[function(require,module,exports){
/* Adapted from Otalk */
var support = require('webrtcsupport');

function GainController(stream) {
	this.support = support.supportWebAudio && support.supportMediaStream;

	// set our starting value
	this.gain = 1;

	if (this.support) {
		var context = this.context = new support.AudioContext();
		this.microphone = context.createMediaStreamSource(stream);
		this.gainFilter = context.createGain();
		this.destination = context.createMediaStreamDestination();
		this.outputStream = this.destination.stream;
		this.microphone.connect(this.gainFilter);
		this.gainFilter.connect(this.destination);
		stream.addTrack(this.outputStream.getAudioTracks()[0]);
		stream.removeTrack(stream.getAudioTracks()[0]);
	}
	this.stream = stream;
}

// setting
GainController.prototype.setGain = function (val) {
	// check for support
	if (!this.support) return;
	this.gainFilter.gain.value = val;
	this.gain = val;
};

GainController.prototype.getGain = function () {
	return this.gain;
};

GainController.prototype.off = function () {
	return this.setGain(0);
};

GainController.prototype.on = function () {
	this.setGain(1);
};

module.exports = GainController;

},{"webrtcsupport":4}],3:[function(require,module,exports){
function Indicator(){}

//indicate whether the browser supports user media
Indicator.prototype.hasUserMedia = function(){
	navigator.getUserMedia = navigator.getUserMedia ||
	navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
	navigator.msGetUserMedia;
	return !!navigator.getUserMedia;
}

//indicate whether the browser supports RTCPeerConnection
Indicator.prototype.hasRTCPeerConnection = function() {
	window.RTCPeerConnection = window.RTCPeerConnection ||
	window.webkitRTCPeerConnection || window.mozRTCPeerConnection
	window.RTCSessionDescription = window.RTCSessionDescription
	window.webkitRTCSessionDescription ||
	window.mozRTCSessionDescription;
	window.RTCIceCandidate = window.RTCIceCandidate ||
	window.webkitRTCIceCandidate || window.mozRTCIceCandidate;
	return !!window.RTCPeerConnection;
}

module.exports = Indicator;
},{}],4:[function(require,module,exports){
// created by @HenrikJoreteg
var prefix;
var version;

if (window.mozRTCPeerConnection || navigator.mozGetUserMedia) {
    prefix = 'moz';
    version = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);
} else if (window.webkitRTCPeerConnection || navigator.webkitGetUserMedia) {
    prefix = 'webkit';
    version = navigator.userAgent.match(/Chrom(e|ium)/) && parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);
}

var PC = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var MediaStream = window.webkitMediaStream || window.MediaStream;
var screenSharing = window.location.protocol === 'https:' &&
    ((prefix === 'webkit' && version >= 26) ||
     (prefix === 'moz' && version >= 33))
var AudioContext = window.AudioContext || window.webkitAudioContext;
var videoEl = document.createElement('video');
var supportVp8 = videoEl && videoEl.canPlayType && videoEl.canPlayType('video/webm; codecs="vp8", vorbis') === "probably";
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.msGetUserMedia || navigator.mozGetUserMedia;

// export support flags and constructors.prototype && PC
module.exports = {
    prefix: prefix,
    browserVersion: version,
    support: !!PC && !!getUserMedia,
    // new support style
    supportRTCPeerConnection: !!PC,
    supportVp8: supportVp8,
    supportGetUserMedia: !!getUserMedia,
    supportDataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
    supportWebAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
    supportMediaStream: !!(MediaStream && MediaStream.prototype.removeTrack),
    supportScreenSharing: !!screenSharing,
    // constructors
    AudioContext: AudioContext,
    PeerConnection: PC,
    SessionDescription: SessionDescription,
    IceCandidate: IceCandidate,
    MediaStream: MediaStream,
    getUserMedia: getUserMedia
};

},{}],5:[function(require,module,exports){

function PeerConnection(local, peer, socket, stream){
	var theirVideo;
	var theirVideoId;
	var p2pConnection;
	var indicator;
	this.stream = stream;
	this.user = local;
	this.remote = peer;
	this.socket = socket;
	this.configuration = {
			"iceServers": [{ "url": "stun:stun.1.google.com:19302"
			}]
	};
}

//create a new video element in html for every peer connenction built
PeerConnection.prototype.createVideo = function(peer, cb){
	var remotes = document.getElementById("remoteVideoContainer");
	if (remotes) {
		var remoteVideo = document.createElement("video");
		remoteVideo.className = "remote";
		remoteVideo.id = "peer_" + peer;
		this.theirVideoId = remoteVideo.id;
		remoteVideo.autoplay = true;
		remotes.appendChild(remoteVideo);
		this.theirVideo = document.getElementById(this.theirVideoId);
	}
	cb();
}

//setup the p2p connection with a peer
PeerConnection.prototype.setupPeerConnection = function(peer, cb) {
	var self = this;
	// Setup stream listening
	this.p2pConnection.addStream(self.stream);
	this.p2pConnection.onaddstream = function (e) {
		self.theirVideo.src = window.URL.createObjectURL(e.stream);
	};

	// Setup ice handling
	this.p2pConnection.onicecandidate = function (event) {
		if (event.candidate) {
			self.socket.emit("candidate", {
				type: "candidate",
				local: self.user,
				remote: peer,
				candidate: event.candidate
			});
		}
	};
	cb();
}

//initialise p2pconnection at the start of a peer connection 
PeerConnection.prototype.startConnection = function(peer, cb){
	var self = this;
	this.p2pConnection = new RTCPeerConnection(this.configuration);
	cb();
}

//make an sdp offer
PeerConnection.prototype.makeOffer = function(cb)	{
	var self = this;
	this.p2pConnection.createOffer(function (sdpOffer) {
		self.p2pConnection.setLocalDescription(sdpOffer);
		cb(sdpOffer);
	}, function(error){
		console.log(error);
	});
}

//receive an sdp offer and create an sdp answer
PeerConnection.prototype.receiveOffer = function(sdpOffer, cb){
	var self = this;
	var SDPOffer = new RTCSessionDescription(sdpOffer.offer);
	this.p2pConnection.setRemoteDescription(SDPOffer, function(){
		self.p2pConnection.createAnswer(function (answer) {
			self.p2pConnection.setLocalDescription(answer);
			cb(answer);
		},function(error){
			console.log(error);
		});
	}, function(){});
}

//receive an spd answer
PeerConnection.prototype.receiveAnswer = function(sdpAnswer){
	var SDPAnswer = new RTCSessionDescription(sdpAnswer.answer);
	this.p2pConnection.setRemoteDescription(SDPAnswer,function(){}, function(){});
}

//add ice candidate when receive one
PeerConnection.prototype.addCandidate = function(iceCandidate) {
	this.p2pConnection.addIceCandidate(new RTCIceCandidate(iceCandidate.candidate));
}

module.exports = PeerConnection;
},{}],6:[function(require,module,exports){
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
	
	//receive the peer list in the same room
	self.socket.on("peer", function(peerData){
		document.getElementById("peer").value = "";
		var peerList = "";
		for (var i in peerData.allUser ) {
			peerList += peerData.allUser[i] + " ";
		}
	})

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
		self.socket.emit("chatMessage", {
			type: "chatMessage",
			action: "leave",
			user: self.user,
			content: ''
		});
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
			self.socket.emit("chatMessage", {
				type: "chatMessage",
				action: "create",
				user: self.user,
				content: ''
			});
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
			self.socket.emit("chatMessage", {
				type: "chatMessage",
				action: "join",
				user: self.user,
				content: ''
			});
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

WebRTC.prototype.getPeers = function(){
	var self = this;
	this.socket.emit("peer");
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
	self.socket.emit("chatMessage", {
		type: "chatMessage",
		action: "chat",
		user: self.user,
		content: chatMessage
	})
}

WebRTC.prototype.onChatMessage = function(chatMessageData){
}

module.exports = WebRTC;

},{"./allconnection.js":1,"./gaincontroller.js":2}]},{},[6])(6)
});
