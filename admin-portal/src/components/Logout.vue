<template>

</template>

<script type="text/babel">
    const LOGIN_URL = 'login';

    export default {

        data() {
            return {
            }
        },
        beforeCreate(){

            this.$store.dispatch('authenticationStore/logout').then(() => {
                this.$router.replace(LOGIN_URL);
            });

        },
        methods:{
        }
    }
</script>