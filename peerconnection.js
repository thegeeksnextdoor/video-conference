
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