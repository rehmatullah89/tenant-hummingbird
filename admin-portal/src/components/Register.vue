<template>



    <div class="login-box">
        <h2 class="main-section-header">Register For An Account</h2>
        <br />
        <p>By registering, you can pay your bill online, enter maintenance requests, upload documents and more.  Registration is free but you must have a lease with us, and use the email address on file.
            <br /><br />
            Enter your email address below and check your email for the next steps.</p>
        <div class="login-form w-form">
            <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>

            <status @resetStatus="successClear($options.name)" v-if="successHas($options.name)" :message="successGet($options.name)" status="success"></status>

            <div class="form-group mb-3"  :class="{'has-error': errors.has('email') }">
                <label for="email" class="label">Email Address:</label>
                <input
                        type="text"
                        v-validate="'required|email|max:100'"
                        v-model.lazy="email"
                        :class="{'has-error': errors.has('email') }"
                        class="input w-input"
                        maxlength="256"
                        name="email"
                        id="email"
                >
                <span v-show="errors.has('email')" class="status-block error-block">{{ errors.first('email') }}</span>
            </div>
            <label>&nbsp;</label>
            <hb-btn color="primary" :disabled="isLoading($options.name)" @click="register">Send Registration Email</hb-btn>
            <span v-show="isLoading($options.name)" >
                <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
            </span>
        </div>
        <div class="text-block">
            <hb-link to="/login">Return to login</hb-link>
        </div>
    </div>


</template>

<script type="text/babel">
    import Status from './includes/Messages.vue';
    import Loader from './assets/CircleSpinner.vue';
    import api from '../assets/api.js';


    export default {
        name: "Login",
        data() {
            return {
                email: ''
            }
        },

        created(){

        },
        components: {
            Loader,
            Status
        },
        methods:{
            register(){
                this.validate(this).then(status => {
                    if(!status) return;
                    api.post(this, api.REGISTER, {
                        email: this.email
                    });
                });
            }
        }
    }

</script>