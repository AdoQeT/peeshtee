import { multiplayerManager } from '../multiplayer/peerManager';
import { logger } from '../../utils/logger';

export interface VoiceState {
  isJoined: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  connectedPeers: string[];
  error: string | null;
}

type VoiceListener = (state: VoiceState) => void;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

/**
 * Lightweight WebRTC Peer-to-Peer Voice Chat Manager
 * Uses the existing authenticated room `events` channel (`MP_VOICE_SIGNAL`) for SDP/ICE signaling.
 */
class VoiceChatManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteAudios: Map<string, HTMLAudioElement> = new Map();
  private listeners: Set<VoiceListener> = new Set();
  private unsubSignal: (() => void) | null = null;

  private state: VoiceState = {
    isJoined: false,
    isMuted: false,
    isDeafened: false,
    connectedPeers: [],
    error: null
  };

  public getState(): VoiceState {
    return this.state;
  }

  public subscribe(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(partial: Partial<VoiceState>) {
    this.state = {
      ...this.state,
      ...partial,
      connectedPeers: Array.from(this.peers.keys())
    };
    this.listeners.forEach(fn => {
      try {
        fn(this.state);
      } catch {}
    });
  }

  public async joinVoice(): Promise<boolean> {
    if (this.state.isJoined) return true;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.emit({ error: 'Tarayıcı mikrofon desteğine izin vermiyor.' });
      return false;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.attachSignalListener();
      this.emit({ isJoined: true, isMuted: false, isDeafened: false, error: null });

      if (multiplayerManager.isConnected) {
        multiplayerManager.send({
          type: 'MP_VOICE_SIGNAL',
          signalType: 'join',
          senderPeerId: multiplayerManager.instanceId
        });
      }
      return true;
    } catch (err) {
      logger.warn('Voice chat mic permission failed:', err);
      this.emit({ error: 'Mikrofon izni reddedildi veya cihaz bulunamadı.' });
      return false;
    }
  }

  public leaveVoice() {
    if (this.state.isJoined && multiplayerManager.isConnected) {
      try {
        multiplayerManager.send({
          type: 'MP_VOICE_SIGNAL',
          signalType: 'leave',
          senderPeerId: multiplayerManager.instanceId
        });
      } catch {}
    }

    this.unsubSignal?.();
    this.unsubSignal = null;

    this.peers.forEach(pc => {
      try { pc.close(); } catch {}
    });
    this.peers.clear();

    this.remoteAudios.forEach(audio => {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {}
    });
    this.remoteAudios.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.emit({ isJoined: false, isMuted: false, isDeafened: false, error: null });
  }

  public toggleMute() {
    if (!this.localStream) return;
    const nextMuted = !this.state.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !nextMuted;
    });
    this.emit({ isMuted: nextMuted });
  }

  public toggleDeafen() {
    const nextDeafened = !this.state.isDeafened;
    this.remoteAudios.forEach(audio => {
      audio.muted = nextDeafened;
    });
    this.emit({ isDeafened: nextDeafened });
  }

  private attachSignalListener() {
    this.unsubSignal?.();
    this.unsubSignal = multiplayerManager.onEvent(async event => {
      if (event.type !== 'MP_VOICE_SIGNAL') return;
      const fromPeer = event.senderPeerId;
      if (!fromPeer || fromPeer === multiplayerManager.instanceId) return;
      if (event.targetPeerId && event.targetPeerId !== multiplayerManager.instanceId) return;
      if (!this.state.isJoined || !this.localStream) return;

      try {
        if (event.signalType === 'join') {
          // Existing member initiates offer to the newly joined peer
          const pc = this.getOrCreatePeer(fromPeer);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          multiplayerManager.send({
            type: 'MP_VOICE_SIGNAL',
            signalType: 'offer',
            targetPeerId: fromPeer,
            sdp: offer.sdp,
            senderPeerId: multiplayerManager.instanceId
          });
        } else if (event.signalType === 'offer' && event.sdp) {
          const pc = this.getOrCreatePeer(fromPeer);
          await pc.setRemoteDescription({ type: 'offer', sdp: event.sdp });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          multiplayerManager.send({
            type: 'MP_VOICE_SIGNAL',
            signalType: 'answer',
            targetPeerId: fromPeer,
            sdp: answer.sdp,
            senderPeerId: multiplayerManager.instanceId
          });
        } else if (event.signalType === 'answer' && event.sdp) {
          const pc = this.peers.get(fromPeer);
          if (pc && pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription({ type: 'answer', sdp: event.sdp });
          }
        } else if (event.signalType === 'ice' && event.candidate) {
          const pc = this.peers.get(fromPeer);
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(event.candidate));
          }
        } else if (event.signalType === 'leave') {
          this.removePeer(fromPeer);
        }
      } catch (err) {
        logger.warn('Voice signaling error:', err);
      }
    });
  }

  private getOrCreatePeer(peerId: string): RTCPeerConnection {
    const existing = this.peers.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(peerId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = e => {
      if (e.candidate && multiplayerManager.isConnected) {
        multiplayerManager.send({
          type: 'MP_VOICE_SIGNAL',
          signalType: 'ice',
          targetPeerId: peerId,
          candidate: e.candidate.toJSON(),
          senderPeerId: multiplayerManager.instanceId
        });
      }
    };

    pc.ontrack = e => {
      const stream = e.streams[0];
      if (!stream) return;
      let audio = this.remoteAudios.get(peerId);
      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.muted = this.state.isDeafened;
        document.body.appendChild(audio);
        this.remoteAudios.set(peerId, audio);
      }
      audio.srcObject = stream;
      void audio.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
        this.removePeer(peerId);
      }
    };

    this.emit({});
    return pc;
  }

  private removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      try { pc.close(); } catch {}
      this.peers.delete(peerId);
    }
    const audio = this.remoteAudios.get(peerId);
    if (audio) {
      try {
        audio.pause();
        audio.srcObject = null;
        audio.remove();
      } catch {}
      this.remoteAudios.delete(peerId);
    }
    this.emit({});
  }
}

export const voiceChatManager = new VoiceChatManager();
