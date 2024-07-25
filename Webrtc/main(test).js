let localstream; //local camera video feed and audio stream
let remotestream;
let peerconnection;
let APP_ID = "4dc5370bbf7f44c3bf66a02648d594f9";
let token = null;
let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomID = urlParams.get("room");

if (!roomID) {
  window.location = "lobby.html";
}

const servers = {
  iceServers: [
    {
      urls: [`stun:stun1.l.google.com:19302`, `stun:stun2.l.google.com:19302`],
    },
  ],
};

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  channel = client.createChannel(roomID);
  await channel.join();

  channel.on("MemberJoined", handleUserJoined);
  channel.on("MemberLeft", handleUserLeft);

  client.on(`MessageFromPeer`, handleMessageFromPeer);

  localstream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  document.getElementById(`user1`).srcObject = localstream;

  // Check number of users
  checkNumberOfUsers();
};

let checkNumberOfUsers = async () => {
  let members = await channel.getMembers();
  if (members.length === 1) {
    document.getElementById('videos').classList.add('full-screen-video');
    document.getElementById('user2').classList.add('hidden');
  } else {
    document.getElementById('videos').classList.remove('full-screen-video');
    document.getElementById('user2').classList.remove('hidden');
  }
};

let handleUserLeft = (memberID) => {
  console.log("Member Left: ", memberID);
  document.getElementById(`user2`).style.display = `none`;
  checkNumberOfUsers();
};

let handleMessageFromPeer = async (message, memberID) => {
  message = JSON.parse(message.text);
  console.log(`Message:`, message);

  // *****message type is offer*****
  if (message.type === "offer") {
    await createAnswer(memberID, message.offer);
  }
  // *****message type is answer*****
  if (message.type === "answer") {
    await addAnswer(message.answer);
  }
  // *****message type is candidate*****
  if (message.type === "candidate") {
    if (peerconnection) {
      await peerconnection.addIceCandidate(message.candidate);
    }
  }
};

let handleUserJoined = async (memberID) => {
  console.log("New user has joined:", memberID);
  await createOffer(memberID);
  checkNumberOfUsers();
};

let createPeerConnection = async (memberID) => {
  peerconnection = new RTCPeerConnection(servers);

  remotestream = new MediaStream();
  document.getElementById(`user2`).srcObject = remotestream;
  document.getElementById(`user2`).style.display = "block";
  
  if (!localstream) {
    localstream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    document.getElementById(`user1`).srcObject = localstream;
  }

  localstream.getTracks().forEach((track) => {
    peerconnection.addTrack(track, localstream);
  });

  peerconnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remotestream.addTrack(track);
    });
  };

  peerconnection.onicecandidate = async (event) => {
    if (event.candidate) {
      await client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
          }),
        },
        memberID
      );
    }
  };
};

let createOffer = async (memberID) => {
  await createPeerConnection(memberID);

  let offer = await peerconnection.createOffer();
  await peerconnection.setLocalDescription(offer);
  await client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    memberID
  );
};

let createAnswer = async (memberID, offer) => {
  await createPeerConnection(memberID);

  await peerconnection.setRemoteDescription(offer);

  let answer = await peerconnection.createAnswer();
  await peerconnection.setLocalDescription(answer);

  await client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    memberID
  );
};

let addAnswer = async (answer) => {
  if (!peerconnection.currentRemoteDescription) {
    await peerconnection.setRemoteDescription(answer);
  } else {
    console.error("No remote Description available to set");
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
  document.getElementById(`user1`).style.
};

let toggleCam = async () => {
  let VideoTrack = localstream
    .getTracks()
    .find((track) => track.kind == "video");

  if (VideoTrack.enabled) {
    VideoTrack.enabled = false;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255,80,80)";
  } else {
    VideoTrack.enabled = true;
    document.getElementById("camera-btn").style.backgroundColor =
      "rgb(255, 235, 205)";
  }
};

let toggleMic = async () => {
  let AudioTrack = localstream
    .getTracks()
    .find((track) => track.kind == "audio");

  if (AudioTrack.enabled) {
    AudioTrack.enabled = false;
    document.getElementById("mic-btn").style.backgroundColor = "rgb(255,80,80)";

    let img = document.getElementById("img-mic");
    img.src = "/icons/mute.png";
  } else {
    AudioTrack.enabled = true;
    document.getElementById("mic-btn").style.backgroundColor =
      "rgb(255, 235, 205)";
    let img = document.getElementById("img-mic");
    img.src = "/icons/mic.png";
  }
};

window.addEventListener("beforeunload", leaveChannel);
document.getElementById("camera-btn").addEventListener("click", toggleCam);
document.getElementById("mic-btn").addEventListener("click", toggleMic);
init();
