<!-- eslint-disable no-undef -->
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { socket } from './api/socket'
import CopyButton from './components/CopyButton.vue'
import MyButton from './components/MyButton.vue'
import RefreshIcon from './assets/refresh.svg'
import CamIcon from './assets/cam.svg'
import CallIcon from './assets/call.svg'
import CamPreview from './components/CamPreview.vue'
import CallScreen from './components/CallScreen.vue'

// UI
const onCall = ref(false)
const peerNameRef = ref<HTMLInputElement>()
const camPreview = ref(false)

// data
const me = ref<string>()
const people = ref<string[]>()
const hasOffer = ref<Description | null>()

const ls = ref<MediaStream | null>()
const rs = ref<MediaStream | null>()

onMounted(async () => {
  socket.on('hello', id => {
    console.log('My name:', id);
    document.title = id
    me.value = id
  })
  socket.on('online', list => {
    console.log('People online:', list);
    people.value = list
  })
  socket.on('offer', offer => {
    console.log('Got offer:', offer);
    hasOffer.value = offer
  })
})

function copied(name: string) {
  if (name === me.value) return
  if (peerNameRef.value) {
    peerNameRef.value.value = name
  }
}

async function call(e: Event) {
  e.preventDefault()  
  if (!peerNameRef.value) return
  const peer = peerNameRef.value.value.trim()
  if (!peer) return
  onCall.value = true

  const config = {
    iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}],
    iceCandidatePoolSize: 10,
  };
  const pc = new RTCPeerConnection(config)
  socket.on('close', () => {
    pc.close()
    ls.value = null
    rs.value = null
    onCall.value = false
    hasOffer.value = null
  })
  
  pc.ontrack = event => {
    try {
      const remoteStream = new MediaStream()
      event.streams[0].getTracks().forEach(t => {
        remoteStream.addTrack(t)
        
      })
      rs.value = remoteStream
    } catch(e) {
      console.log(e);
    }
  }
  
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
  ls.value = localStream

  const offerDescription = await pc.createOffer()
  const offer = {
    peer,
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  }

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('offerCandidate', {
        peer,
        candidate: event.candidate.toJSON()
      })
    }
  }

  socket.on('answerCandidate', ac => {
    console.log(ac);
    
    const candidate = new RTCIceCandidate(ac)
    pc.addIceCandidate(candidate)
  })

  socket.on('answer', answer => {
    if (answer) {
      const answerDescription = new RTCSessionDescription(answer)
      pc.setRemoteDescription(answerDescription)
    } else {
      ls.value = null
      rs.value = null
      onCall.value = false
      hasOffer.value = null
    }
  })

  await pc.setLocalDescription(offerDescription)
  socket.emit('offer', offer)
}

async function answer() {
  if (!hasOffer.value) return
  const offer = hasOffer.value
  onCall.value = true

  // setup RTCPeerConnection and user media 
  const config = {
    iceServers: [{ urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}],
    iceCandidatePoolSize: 10,
  };
  const pc = new RTCPeerConnection(config)
  socket.on('close', () => {
    pc.close()
    ls.value = null
    rs.value = null
    onCall.value = false
    hasOffer.value = null
  })
  
  pc.ontrack = event => {
    try {
      const remoteStream = new MediaStream()
      event.streams[0].getTracks().forEach(t => {
        remoteStream.addTrack(t)
      })
      rs.value = remoteStream
    } catch(e) {
      console.log(e);
    }
  }
  
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
  ls.value = localStream

  socket.on('offerCandidates', oc => {
    console.log(oc);
    
    const candidate = new RTCIceCandidate(oc)
    pc.addIceCandidate(candidate)
  })

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('answerCandidate', {
        peer: offer.peer,
        candidate: event.candidate.toJSON()
      })
    }
  }

  const offerDescription = new RTCSessionDescription(offer)
  await pc.setRemoteDescription(offerDescription)

  const answerDescription = await pc.createAnswer()
  const answer = {
    peer: offer.peer,
    sdp: answerDescription.sdp,
    type: answerDescription.type,
  }
  await pc.setLocalDescription(answerDescription)
  socket.emit('answer', answer)
}

function close() {
  socket.emit('close', hasOffer.value?.peer)
}

function decline() {
  socket.emit('answer', {
    peer: hasOffer.value?.peer,
    answer: false
  })
  hasOffer.value = null
}

</script>

<template>
<div class="p-2">

  <CallScreen v-if="hasOffer">
  <div class="bg-white rounded p-2 flex flex-col items-stretch text-center gap-6 min-w-[250px]">
    <span>Incoming call from</span>
    <span class="text-lg font-bold">{{hasOffer.peer}}</span>
    <div class="flex justify-between">
      <MyButton @click="decline">decline</MyButton>
      <MyButton @click="answer">accept</MyButton>
    </div>
  </div>
  </CallScreen>
  
  <CallScreen v-if="onCall" :key="rs?.id" class="flex flex-col gap-4 p-4">
    <div class="flex gap-1 text-center">
      <div>
        <span>local stream</span>
        <video
        :srcObject="ls"
        muted autoplay playsinline 
        class="bg-neutral-700 aspect-[4/3] h-max w-max"></video>
      </div>
      <div>
        <span>remote stream</span>
        <video
        :srcObject="rs"
        autoplay playsinline
        class="bg-neutral-700 aspect-[4/3] h-max w-max"></video>
      </div>
    </div>
    <div class="flex gap-2 flex-wrap">
      <MyButton>mute video</MyButton>
      <MyButton>mute mic</MyButton>
      <MyButton @click="close">hang up</MyButton>
    </div>
  </CallScreen>

  <CamPreview v-if="camPreview" :closeMe="() => camPreview = false" />

  <h1 class="text-xl font-bold mb-2">Hello, {{me}}</h1>
  
  <h2 class="text-lg underline">Connected peers: <small>(click to copy)</small></h2>
  <ul class="pl-7 mb-2">
    <li :key="peer" v-for="peer in people">
      <CopyButton :onCopy="copied" :me="me === peer">{{peer}}</CopyButton>
    </li>
  </ul>
  <MyButton @click="() => socket.emit('online')" class="flex gap-1">
    refresh <RefreshIcon />
  </MyButton>

  <form @submit="call" class="mt-4 flex gap-1 flex-wrap">
    <input 
    ref="peerNameRef"
    class="rounded px-2 py-1"
    placeholder="Peer name"
    type="text">
    <MyButton type="submit" class="flex gap-1">call <CallIcon /></MyButton>
    <MyButton
    class="flex gap-2 items-center"
    type="button" 
    @click="() => camPreview = true">preview my cam<CamIcon /></MyButton>
  </form>
</div>
</template>

<style scoped>
ul li::before {
  content: "\2022";
  color: green;
  font-weight: bold;
  display: inline-block; 
  width: 1em;
  margin-left: -1em;
}
</style>
