<template>


        <div class="login-box">

            <h2 class="main-section-header">Reset Password</h2>
            <br />
            <p>An email will be sent to you with further instructions.</p>
            <div class="login-form w-form">
                <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>

                <status @resetStatus="successClear($options.name)" v-if="successHas($options.name)" :message="successGet($options.name)" status="success"></status>

                <div class="form-group mb-3"  :class="{'has-error': errors.has('email') }">
                    <label for="email" class="label">Username:</label>
                    <input
                            type="text"
                            v-validate="'required|max:100'"
                            v-model.lazy="email"
                            :class="{'has-error': errors.has('username') }"
                            class="input w-input"
                            maxlength="256"
                            name="username"
                            id="username"
                    >
                    <span v-show="errors.has('username')" class="status-block error-block">{{ errors.first('username') }}</span>
                </div>
                <label>&nbsp;</label>
                <hb-btn color="primary" :disabled="isLoading($options.name)" @click="resetPassword">Reset Password</hb-btn>
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
                email: '',
            }
        },
        beforeCreate(){

        },
        components: {
            Loader,
            Status
        },
        methods:{
            resetPassword(){
                this.validate(this).then(status => {
                    if(!status) return;
                    api.post(this, api.RESET_PASSWORD, {
                        email: this.email
                    });
                });

            }
        }
    }

</script>