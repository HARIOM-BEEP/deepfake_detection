import Peer from 'simple-peer';

class WebRTCService {
  constructor() {
    this.peers = new Map(); // socketId -> Peer instance
    this.streams = new Map(); // socketId -> MediaStream
  }

  createPeer(socketId, initiator, stream, socket) {
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (signal) => {
      if (initiator) {
        socket.emit('offer', { to: socketId, offer: signal });
      } else {
        socket.emit('answer', { to: socketId, answer: signal });
      }
    });

    peer.on('stream', (remoteStream) => {
      this.streams.set(socketId, remoteStream);
      // Emit custom event for UI to handle
      window.dispatchEvent(new CustomEvent('peer-stream', {
        detail: { socketId, stream: remoteStream }
      }));
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
    });

    peer.on('close', () => {
      this.removePeer(socketId);
    });

    this.peers.set(socketId, peer);
    return peer;
  }

  addPeer(socketId, stream, socket) {
    if (this.peers.has(socketId)) {
      return this.peers.get(socketId);
    }
    return this.createPeer(socketId, true, stream, socket);
  }

  handleOffer(socketId, offer, stream, socket) {
    const peer = this.createPeer(socketId, false, stream, socket);
    peer.signal(offer);
    return peer;
  }

  handleAnswer(socketId, answer) {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.signal(answer);
    }
  }

  handleIceCandidate(socketId, candidate) {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.signal(candidate);
    }
  }

  removePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.destroy();
      this.peers.delete(socketId);
    }
    
    const stream = this.streams.get(socketId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.streams.delete(socketId);
    }

    // Emit custom event for UI cleanup
    window.dispatchEvent(new CustomEvent('peer-removed', {
      detail: { socketId }
    }));
  }

  removeAllPeers() {
    this.peers.forEach((peer, socketId) => {
      this.removePeer(socketId);
    });
  }

  getStream(socketId) {
    return this.streams.get(socketId);
  }

  getAllStreams() {
    return Array.from(this.streams.entries()).map(([socketId, stream]) => ({
      socketId,
      stream
    }));
  }
}

export default new WebRTCService();
