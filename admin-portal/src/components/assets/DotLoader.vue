<template>

    <div class="loader" :style="{ fontSize: size, color: color  }"></div>

</template>

<script type="text/babel">

    export default {
        data() {
            return {

            }
        },
        props:{
            size: {
                required: false,
                type: String,
                default:'20px'
            },
            color: {
                required: false,
                type: String,
                default:'#333333'
            }
        }
    }

</script>


<style scoped>
    .loader,
    .loader:before,
    .loader:after {
        border-radius: 50%;
        width: 1em;
        height: 1em;
        -webkit-animation-fill-mode: both;
        animation-fill-mode: both;
        -webkit-animation: load7 1.8s infinite ease-in-out;
        animation: load7 1.8s infinite ease-in-out;
    }
    .loader {
        font-size: 10px;
        margin: 0px auto;
        position: relative;
        text-indent: -9999em;
        -webkit-transform: translateZ(0);
        -ms-transform: translateZ(0);
        transform: translateZ(0);
        -webkit-animation-delay: -0.16s;
        animation-delay: -0.16s;
    }
    .loader:before,
    .loader:after {
        content: '';
        position: absolute;
        top: 0;
    }
    .loader:before {
        left: -2em;
        -webkit-animation-delay: -0.32s;
        animation-delay: -0.32s;
    }
    .loader:after {
        left: 2em;
    }
    @-webkit-keyframes load7 {
        0%,
        80%,
        100% {
            box-shadow: 0 2.5em 0 -1.3em;
        }
        40% {
            box-shadow: 0 2.5em 0 0;
        }
    }
    @keyframes load7 {
        0%,
        80%,
        100% {
            box-shadow: 0 2.5em 0 -1.3em;
        }
        40% {
            box-shadow: 0 2.5em 0 0;
        }
    }
</style>