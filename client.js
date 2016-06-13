webrtc = new WebRTC("localhost:8080");

function muteVideo(){
	webrtc.muteVideo();
}
function muteAudio(){
	webrtc.muteAudio();
}
function unmuteVideo(){
	webrtc.unmuteVideo();
}
function unmuteAudio(){
	webrtc.unmuteAudio();
}

function sendChatMessage(e){
	if (e.keyCode == 13) {
		var message = document.getElementById("chat").value;
		webrtc.sendChatMessage(message);
		document.getElementById("chat").value = "";
	}
}

WebRTC.prototype.onChatMessage = function(chatMessageData){
	document.getElementById("messageBox").value += chatMessageData.sender + ": " + chatMessageData.content;
}

webrtc.onUserDisconnect = function(userDisconnected){
	console.log("user " + userDisconnected + " is disconnected");
	var videoId = "peer_" + userDisconnected;
	var video = document.getElementById(videoId);
	video.parentNode.removeChild(video);
}

function sendName(e){
	if (e.keyCode == 13) {
		var command = document.getElementById("command").value;
		if (command.length == 0)
			document.getElementById("feedback").value = "Input a valid command";
		else {
			webrtc.login(command, function(){
				document.getElementById("feedback").value = "You successfully login ";
			}, function(){
				document.getElementById("feedback").value = "Current account already exists" ;
			});
			document.getElementById("command").value = "";
		}
	}
}

function cRoom(e){
	if (e.keyCode == 13) {
		var command = document.getElementById("createroom").value;
		if (command.length == 0)
			document.getElementById("feedback").value = "Input a valid command";
		else {
			webrtc.createRoom(command, function(){
				webrtc.startCamera();
				document.getElementById("feedback").value = "You successfully created Room ";
			}, function(){
				document.getElementById("feedback").value = "Current room already exists" ;
			});
			document.getElementById("createroom").value = "";
		}
	}
}

function jRoom(e){	
	if (e.keyCode == 13) {
		var command = document.getElementById("joinroom").value;
		if (command.length == 0)
			document.getElementById("feedback").value = "Input a valid command";
		else {
			webrtc.joinRoom(command, function(){
				webrtc.startCamera();
				document.getElementById("feedback").value = "You successfully joined Room ";
			}, function(){
				document.getElementById("feedback").value = "Room does not exists" ;
			});
			document.getElementById("joinroom").value = "";
		}
	}
}

function getPeers(){	
	webrtc.getPeers(function(peerListData){		
		document.getElementById("peer").value = "";
		var peerList = "";
		for (var i in peerListData.allUser ) {
			peerList += peerListData.allUser[i] + " ";
		}
		document.getElementById("peer").value = peerList;
	});
}