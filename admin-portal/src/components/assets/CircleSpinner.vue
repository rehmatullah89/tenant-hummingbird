<template>

        <div class="loader" :style="{ height: size, width: size, borderTopColor: color  }"></div>

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
    .loader {
        display: inline-block;
        border-radius: 50%;
        margin: 5px;
        vertical-align: top;
        border: 2px solid transparent;
        animation: spin 1s ease-in-out infinite;
        -webkit-animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
        to { -webkit-transform: rotate(360deg); }
    }
    @-webkit-keyframes spin {
        to { -webkit-transform: rotate(360deg); }
    }
</style>