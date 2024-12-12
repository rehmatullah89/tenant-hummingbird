<template>

    <div>


        <div class="login-box" v-show="!confirmed">
            <h2 class="main-section-header">Reset Password</h2>
            <p>Enter your new password below:</p>

            <div class="login-form w-form">
                <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>

                <status @resetStatus="successClear($options.name)" v-if="successHas($options.name)" :message="successGet($options.name)" status="success"></status>


                <div class="form-group"  :class="{'has-error': errors.has('password') }">
                    <label for="password" class="label">Password:</label>
                    <input
                            id="password"
                            type="password"
                            v-validate="'required|min:6'"
                            :class="{'has-error': errors.has('password') }"
                            v-model="password"
                            name="password"
                            class="w-input input"
                            placeholder="Minimum 6 characters"
                            data-vv-as="password"
                    />
                    <span v-show="errors.has('password')" class="status-block error-block">{{ errors.first('password') }}</span>
                </div>

                <div class="form-group"  :class="{'has-error': errors.has('password_confirm') }">
                    <label for="password" class="label">Repeat Password</label>
                    <input
                            id="password_confirm"
                            type="password"
                            v-validate="'required|confirmed:password'"
                            :class="{'has-error': errors.has('password_confirm') }"
                            v-model="password_confirm"
                            name="password_confirm"
                            class="w-input input"
                            data-vv-as="password repeat"
                    />
                    <span v-show="errors.has('password_confirm')" class="status-block error-block">{{ errors.first('password_confirm') }}</span>
                </div>

                <button
                    :disabled="isLoading($options.name)"
                    @click="savePassword"
                    class="primary-btn w-button">
                    Set Password
                </button>
                    <span v-show="isLoading($options.name)" >
                        <loader color="#00b2ce" size="20px" class="inline-loader"></loader>
                    </span>
            </div>

        </div>


        <div class="login-box" v-show="confirmed">
            <h2 class="main-section-header"><span class="icon"></span> &nbsp;Password Successfully Set</h2>

            <p>Your password has been updated. You can now login</p>
            <br /><br />
            <router-link class="w-button primary-btn" :to="'/login'">Go to login</router-link>
        </div>
    </div>


    <!--<div class="container">-->
        <!--<div class="row" v-show="!confirmed">-->
            <!--<div class="col-xs-6 col-xs-push-3">-->
                <!--<br/><br/><br/><br/>-->
                <!--<status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>-->
                <!--<br /><br />-->
                <!--<form @submit.prevent="savePassword" method="POST" action="/login" class="form" v-show="!disabled">-->
                    <!--<h2>Reset Password</h2>-->
                    <!--<p>Enter your new password below:</p>-->
                    <!--<div class="form-group"  :class="{'has-error': errors.has('password') }">-->
                        <!--<input-->
                                <!--type="password"-->
                                <!--v-validate="'required|min:6'"-->
                                <!--:class="{'has-error': errors.has('password') }"-->
                                <!--v-model="password"-->
                                <!--name="password"-->
                                <!--class="form-control"-->
                                <!--placeholder="Password"-->
                                <!--data-vv-as="password"-->
                        <!--/>-->
                        <!--<span v-show="errors.has('password')" class="help-block">{{ errors.first('password') }}</span>-->
                    <!--</div>-->

                    <!--<div class="form-group"  :class="{'has-error': errors.has('password_confirm') }">-->
                        <!--<input-->
                                <!--type="password"-->
                                <!--v-validate="'required|confirmed:password'"-->
                                <!--:class="{'has-error': errors.has('password_confirm') }"-->
                                <!--v-model="password_confirm"-->
                                <!--name="password_confirm"-->
                                <!--class="form-control"-->
                                <!--placeholder="Password Repeat"-->
                                <!--data-vv-as="password repeat"-->
                        <!--/>-->
                        <!--<span v-show="errors.has('password_confirm')" class="help-block">{{ errors.first('password_confirm') }}</span>-->
                    <!--</div>-->

                    <!--<div class="form-group">-->
                        <!--<button class="btn btn-primary" @click="savePassword">Reset Password</button>-->
                        <!--<span v-show="isLoading($options.name)" ><loader color="#00b2ce" size="20px" class="inline-loader"></loader></span>-->
                    <!--</div>-->
                <!--</form>-->
                <!--<span v-show="disabled">-->
                    <!--<router-link  to="/reset-password" class="btn btn-dark">Reset your Password</router-link>&nbsp; or-->

                <!--</span>-->
                <!--<router-link to="/login">Return to login</router-link>-->
            <!--</div>-->
        <!--</div>-->

        <!--<div class="row" v-show="confirmed">-->
            <!--<br/><br/><br/><br/>-->
            <!--<div class="col-xs-6 col-xs-push-3 text-center section">-->
                <!--<div class="row">-->
                    <!--<div class="col-xs-12 text-center">-->
                        <!--<h3>Password Update Successful</h3>-->
                        <!--<i class="confirmation-check text-success fa fa-check-circle" ></i>-->
                        <!--<p>Your password has been updated. You can now login</p>-->
                    <!--</div>-->
                <!--</div>-->

                <!--<div class="row">-->
                    <!--<div class="col-xs-12 text-center">-->
                        <!--<router-link class="btn btn-dark btn-lg float-left" :to="'/login'">Go to login</router-link>-->
                    <!--</div>-->
                <!--</div>-->


            <!--</div>-->
        <!--</div>-->

    <!--</div>-->
</template>

<script type="text/babel">
    import Status from './includes/Messages.vue';
    import Loader from './assets/CircleSpinner.vue';
    import api from '../assets/api.js';


    export default {
        name: "NewPassword",
        data() {
            return {
                password: '',
                password_confirm: '',
                disabled: false,
                confirmed: false
            }
        },
        created(){

            api.get(this, api.RESET_PASSWORD + this.$route.params.hash).then(r => {
            });


//            api.validateHash(this, this.$route.params.hash);
        },
        components: {
            Loader,
            Status
        },
        methods:{
            savePassword(){
                api.post(this, api.RESET_PASSWORD + this.$route.params.hash, {
                    password: this.password,
                    password2: this.password_confirm,
                }).then(r => {
                    this.confirmed = true;

                });
            }
        }
    }

</script>

<style scoped>
    .confirmation-check{
        font-size: 120px;
        margin-top: 30px;
        margin-bottom: 30px;
    }
</style>