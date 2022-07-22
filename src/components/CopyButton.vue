<script setup lang="ts">

import { ref, useSlots } from 'vue';
import CopyIcon from '../assets/copy.svg'
import CheckIcon from '../assets/check.svg'

const slots = useSlots()

const props = defineProps({
    onCopy: Function,
    me: Boolean
})

const copied = ref(false)

async function copy() {
    if (!slots.default) return;
    const text = slots.default()[0].children?.toString();
    
    if (text) {
        await navigator.clipboard.writeText(text)
        document.execCommand('copy')
        copied.value = true
        if (props.onCopy) props.onCopy(text)
        setTimeout(() => {copied.value = false}, 1000)
    }
}

</script>

<template>

<div @click="copy" class="inline-flex items-center gap-1">
    <span class="text-lg flex items-center gap-1">
        <slot></slot>
        <small v-if="me"><b>(me)</b></small>
    </span>
    <button class="h-6 w-6 grid place-items-center">
        <CopyIcon v-if="!copied" class="stroke-neutral-700" />
        <div v-else class="flex items-center">
            <span class="text-sm">Copied!</span>
            <CheckIcon class="stroke-neutral-700" />
        </div>
    </button>
</div>

</template>
