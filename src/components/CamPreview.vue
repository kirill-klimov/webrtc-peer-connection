<script setup lang="ts">
import MyButton from "./MyButton.vue";
import CrossIcon from '../assets/cross.svg'
import { onMounted, ref } from "vue";

defineProps({
    closeMe: Function
})

const v = ref<HTMLVideoElement>()
onMounted(async () => {
    try {
        const ms = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true
        })
        if (v.value) {
            v.value.srcObject = ms
        }    
    } catch(e) {
        console.log(e);
    }
})

</script>

<template>
<div class="absolute w-full h-full top-0 left-0 bg-black/25 flex items-center justify-center">
    <div class="flex flex-col gap-4 items-center">
        <video
        class="w-[350px] h-96 bg-neutral-700 rounded overflow-hidden" 
        muted autoplay playsinline ref="v"></video>
        <MyButton
        class="flex gap-1 items-center" 
        @click="closeMe">close<CrossIcon /></MyButton>
    </div>
</div>
</template>
