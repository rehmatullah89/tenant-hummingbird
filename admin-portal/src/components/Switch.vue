<template></template>

<script type="text/babel">


    export default {
        data() {
            return {}
        },
        beforeCreate(){
            this.$store.commit('authenticate', {
                is_authenticated: true,
                auth_token: this.$route.query.t
            });
            this.$router.replace('/dashboard');
        }
    }

</script>

