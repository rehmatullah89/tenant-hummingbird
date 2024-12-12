<template>

    <router-link v-if="item.to" :class="item.class" :to="item.to" :activeClass="item.activeClass">
        <span class="nav-icon">
            <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                xml:space="preserve"
                :x="item.svg.x"
                :y="item.svg.y"
                :viewBox="item.svg.viewBox"
                :style="item.svg.style"
            >
                <path
                    :class="item.svg.path.class"
                    :d="item.svg.path.d"
                />
            </svg>
        </span>
    </router-link>
    <a v-else :class="item.class" :activeClass="item.activeClass" @click.stop="linkAction">
        <span class="nav-icon">
            <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink"
                xml:space="preserve"
                :x="item.svg.x"
                :y="item.svg.y"
                :viewBox="item.svg.viewBox"
                :style="item.svg.style"
            >
                <path
                    :class="item.svg.path.class"
                    :d="item.svg.path.d"
                />
            </svg>
        </span>
    </a>
</template>
<script>
import { EventBus } from '../../../EventBus.js';
export default {
    data() {
        return {}
    },
    props: [
        'item'
    ],
    methods: {
        linkAction(){
            EventBus.$emit(this.item.action.command, this.item.action.payload);
        }
    }
}
</script>
<style lang="scss" scoped>
a, a:active {
    border: none;
    outline: none;
}
</style>
