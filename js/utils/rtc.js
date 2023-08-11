function connect(client_id) {
  return new Promise((resolve, reject) => {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const peerConnection = new RTCPeerConnection(configuration);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
      });

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        const signalServer = new WebSocket('wss://www.websocket.org/echo.html');
        signalServer.onopen = () => {
          signalServer.send(JSON.stringify({
            type: 'ice-candidate',
            to: client_id,
            candidate: event.candidate
          }));
        };
        signalServer.onerror = error => {
          reject(error); // Reject the promise if there's an error
        };
      }
    };

    // ... (code to handle incoming video/audio streams and offer/answer from the other client)

    // Once the peer connection is established and the signaling process is complete,
    // return the peer connection object itself
    resolve(peerConnection);
  });
}
