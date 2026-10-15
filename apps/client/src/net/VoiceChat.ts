import type { NetClient } from './NetClient';
import type { LobbyPayload } from '../state/store';
import type { Snapshot } from '@kitchen/core';
import { showToast } from '../ui/toast';

export interface PeerVoiceState {
  muted: boolean;
  speaking: boolean;
}

interface SignalPayload {
  type: 'offer' | 'answer' | 'candidate' | 'renegotiate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

function buildRtcConfig(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const turnUrl = (import.meta as any).env?.VITE_TURN_URL;
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: (import.meta as any).env?.VITE_TURN_USERNAME || undefined,
      credential: (import.meta as any).env?.VITE_TURN_CREDENTIAL || undefined,
    });
  }
  return { iceServers };
}

class VoiceChatService {
  private netClient: NetClient | null = null;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private audioElements = new Map<string, HTMLAudioElement>();
  private peerStates = new Map<string, PeerVoiceState>();
  private knownPeerIds = new Set<string>();

  private micEnabled = false;
  private muted = true;
  private localSpeaking = false;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadTimer: number | null = null;
  private listeners = new Set<() => void>();

  attach(netClient: NetClient) {
    if (this.netClient === netClient) return;
    this.netClient = netClient;

    netClient.on('lobby', (lobby: LobbyPayload) => {
      const ids = (lobby.players || [])
        .map(m => m.id)
        .filter(id => id && id !== netClient.sessionId);
      this.syncKnownPeers(ids);
    });

    netClient.on('snapshot', (snap: Snapshot) => {
      const ids = (snap.players || [])
        .map(p => p.ownerId || p.id)
        .filter(id => id && id !== netClient.sessionId && !id.endsWith('_1') && !id.endsWith('_2'));
      if (ids.length > 0) {
        this.syncKnownPeers(ids);
      }
    });

    netClient.on('voice_signal', payload => {
      void this.handleSignal(payload.fromId, payload.signal as SignalPayload);
    });

    netClient.on('voice_state', payload => {
      this.peerStates.set(payload.playerId, {
        muted: payload.muted,
        speaking: payload.speaking,
      });
      this.notifyListeners();
    });

    netClient.on('disconnect', () => {
      this.cleanupPeers();
    });
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners() {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch {
        // ignore listener errors
      }
    }
  }

  isMicActive(): boolean {
    return this.micEnabled && !this.muted;
  }

  isLocalSpeaking(): boolean {
    return this.micEnabled && !this.muted && this.localSpeaking;
  }

  getPlayerVoiceState(playerId: string): PeerVoiceState {
    // Strip solo mode suffix (_1 / _2) if present
    const baseId = playerId.replace(/_[12]$/, '');
    if (this.netClient && baseId === this.netClient.sessionId) {
      return {
        muted: !this.isMicActive(),
        speaking: this.isLocalSpeaking(),
      };
    }
    return this.peerStates.get(baseId) || { muted: true, speaking: false };
  }

  async toggleMic(): Promise<boolean> {
    if (!this.micEnabled) {
      const ok = await this.enableMicrophone();
      if (!ok) return false;
      this.muted = false;
    } else {
      this.muted = !this.muted;
    }

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !this.muted;
      }
    }

    if (this.muted) {
      this.localSpeaking = false;
    }

    this.broadcastLocalState();
    this.notifyListeners();

    if (!this.muted) {
      showToast('🎤 Đã bật Mic đàm thoại!', 'info');
      // Connect or renegotiate with all peers in the room
      for (const peerId of this.knownPeerIds) {
        void this.connectToPeer(peerId, true);
      }
    } else {
      showToast('🔇 Đã tắt Mic', 'info');
    }

    return !this.muted;
  }

  private async enableMicrophone(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showToast('Trình duyệt không hỗ trợ Microphone (cần kết nối HTTPS hoặc localhost)', 'error');
      return false;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.micEnabled = true;
      this.startVoiceActivityDetection(this.localStream);
      return true;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      showToast('Không thể truy cập Mic — Hãy cấp quyền Microphone cho trình duyệt!', 'error');
      return false;
    }
  }

  private startVoiceActivityDetection(stream: MediaStream) {
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      const source = this.audioCtx.createMediaStreamSource(stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;
      source.connect(this.analyser);

      const data = new Uint8Array(this.analyser.frequencyBinCount);
      if (this.vadTimer) window.clearInterval(this.vadTimer);

      this.vadTimer = window.setInterval(() => {
        if (!this.analyser || this.muted || !this.micEnabled) {
          if (this.localSpeaking) {
            this.localSpeaking = false;
            this.broadcastLocalState();
            this.notifyListeners();
          }
          return;
        }
        this.analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i] || 0;
        }
        const avg = sum / data.length;
        const speakingNow = avg > 14;
        if (speakingNow !== this.localSpeaking) {
          this.localSpeaking = speakingNow;
          this.broadcastLocalState();
          this.notifyListeners();
        }
      }, 140);
    } catch (e) {
      console.warn('VAD setup error:', e);
    }
  }

  private broadcastLocalState() {
    this.netClient?.sendVoiceState(!this.isMicActive(), this.isLocalSpeaking());
  }

  private syncKnownPeers(peerIds: string[]) {
    const nextSet = new Set(peerIds);
    for (const oldId of Array.from(this.knownPeerIds)) {
      if (!nextSet.has(oldId)) {
        this.closePeer(oldId);
        this.knownPeerIds.delete(oldId);
      }
    }
    for (const id of nextSet) {
      const isNew = !this.knownPeerIds.has(id);
      this.knownPeerIds.add(id);
      if (isNew && this.isMicActive()) {
        void this.connectToPeer(id, true);
      }
    }
    this.notifyListeners();
  }

  private getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
    let pc = this.peers.get(peerId);
    if (pc) return pc;

    pc = new RTCPeerConnection(buildRtcConfig());
    this.peers.set(peerId, pc);

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = event => {
      if (event.candidate) {
        this.netClient?.sendVoiceSignal(peerId, {
          type: 'candidate',
          candidate: event.candidate.toJSON(),
        } satisfies SignalPayload);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc?.connectionState === 'failed' && this.isMicActive()) {
        try {
          pc.restartIce?.();
        } catch {
          // ignore
        }
      }
    };

    pc.ontrack = event => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.attachRemoteAudio(peerId, stream);
    };

    return pc;
  }

  private async flushPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const queue = this.pendingCandidates.get(peerId);
    if (!queue || queue.length === 0) return;
    this.pendingCandidates.delete(peerId);
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('WebRTC queued ICE candidate error:', e);
      }
    }
  }

  private async connectToPeer(peerId: string, createOffer: boolean) {
    if (typeof RTCPeerConnection === 'undefined') return;
    const pc = this.getOrCreatePeerConnection(peerId);

    // Ensure local tracks are added if mic was enabled after PC creation
    if (this.localStream) {
      const senders = pc.getSenders();
      for (const track of this.localStream.getTracks()) {
        if (!senders.some(s => s.track === track)) {
          pc.addTrack(track, this.localStream);
        }
      }
    }

    if (createOffer) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.netClient?.sendVoiceSignal(peerId, {
          type: 'offer',
          sdp: pc.localDescription || offer,
        } satisfies SignalPayload);
      } catch (e) {
        console.warn('WebRTC offer error:', e);
      }
    }
  }

  private async handleSignal(fromId: string, signal: SignalPayload) {
    if (!signal || typeof RTCPeerConnection === 'undefined') return;
    this.knownPeerIds.add(fromId);
    const pc = this.getOrCreatePeerConnection(fromId);

    try {
      if (signal.type === 'offer' && signal.sdp) {
        if (pc.signalingState !== 'stable') {
          try {
            await pc.setLocalDescription({ type: 'rollback' });
          } catch {
            // ignore rollback error
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.flushPendingCandidates(fromId, pc);
        if (this.localStream) {
          const senders = pc.getSenders();
          for (const track of this.localStream.getTracks()) {
            if (!senders.some(s => s.track === track)) {
              pc.addTrack(track, this.localStream);
            }
          }
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.netClient?.sendVoiceSignal(fromId, {
          type: 'answer',
          sdp: pc.localDescription || answer,
        } satisfies SignalPayload);
      } else if (signal.type === 'answer' && signal.sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await this.flushPendingCandidates(fromId, pc);
        }
      } else if (signal.type === 'candidate' && signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          const list = this.pendingCandidates.get(fromId) || [];
          list.push(signal.candidate);
          this.pendingCandidates.set(fromId, list);
        }
      }
    } catch (e) {
      console.warn('WebRTC signal handling error:', e);
    }
  }

  private attachRemoteAudio(peerId: string, stream: MediaStream) {
    let audio = this.audioElements.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.audioElements.set(peerId, audio);
    }
    audio.srcObject = stream;
    void audio.play().catch(() => {
      // Autoplay will resume on next user interaction
    });
  }

  private closePeer(peerId: string) {
    this.pendingCandidates.delete(peerId);
    const pc = this.peers.get(peerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // ignore
      }
      this.peers.delete(peerId);
    }
    const audio = this.audioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerId);
    }
    this.peerStates.delete(peerId);
  }

  private cleanupPeers() {
    for (const peerId of Array.from(this.peers.keys())) {
      this.closePeer(peerId);
    }
    this.pendingCandidates.clear();
    this.knownPeerIds.clear();
    this.peerStates.clear();
    this.notifyListeners();
  }
}

export const voiceChat = new VoiceChatService();
