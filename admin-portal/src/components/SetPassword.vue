<template>

    <div>


        <div class="login-box" v-show="!confirmed">
            <h2 class="main-section-header">Setup Online Account</h2>

            <div class="login-form w-form">

                <p>Name: <strong>{{contact.salutation}} {{contact.first}} {{contact.middle}} {{contact.last}} {{contact.suffix}}</strong></p>
                <p>Username/Email: <strong>{{contact.email}}</strong></p>
                <br />
                <p>Enter a password below:</p>


                <status @resetStatus="errorClear($options.name)" v-if="errorHas($options.name)" :message="errorGet($options.name)" status="error"></status>

                <status @resetStatus="successClear($options.name)" v-if="successHas($options.name)" :message="successGet($options.name)" status="success"></status>




                <div class="form-group"  :class="{'has-error': errors.has('username') }">
                    <label for="password" class="label">Username:</label>
                    <input
                            id="username"
                            type="username"
                            v-validate="'required|min:6|max:100'"
                            :class="{'has-error': errors.has('username') }"
                            v-model="username"
                            name="username"
                            class="w-input input"
                            placeholder="Minimum 6 characters"
                            data-vv-as="username"
                    />
                    <span v-show="errors.has('password')" class="status-block error-block">{{ errors.first('username') }}</span>
                </div>


                <div class="form-group"  :class="{'has-error': errors.has('password') }">
                    <label for="password" class="label">Password:</label>
                    <input
                            id="password"
                            type="password"
                            v-validate="'required|min:6|max:100'"
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
                            v-validate="'required|confirmed:password|max:100'"
                            :class="{'has-error': errors.has('password_confirm') }"
                            v-model="password_confirm"
                            name="password_confirm"
                            class="w-input input"
                            data-vv-as="password repeat"
                    />
                    <span v-show="errors.has('password_confirm')" class="status-block error-block">{{ errors.first('password_confirm') }}</span>
                </div>
                <br />
                <div class="form-group"  >
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
                <!--<form @submit.prevent="savePassword" method="POST" action="" class="form" v-show="!disabled">-->
                    <!--<h2>Setup Online Account</h2>-->
                    <!--<p><strong>Username/Email: {{contact.email}}</strong></p>-->
                    <!--<p>Enter a password below:</p>-->
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
                        <!--<button class="btn btn-primary">Set Password</button>-->
                        <!--<span v-show="isLoading($options.name)" ><loader color="#00b2ce" size="20px" class="inline-loader"></loader></span>-->
                    <!--</div>-->
                <!--</form>-->
            <!--</div>-->
        <!--</div>-->



    <!--</div>-->
</template>

<script type="text/babel">
    import Status from './includes/Messages.vue';
    import Loader from './assets/CircleSpinner.vue';
    import api from '../assets/api.js';


    export default {
        name: "SetPassword",
        data() {
            return {
                username:'',
                password: '',
                password_confirm: '',
                disabled: false,
                confirmed: false,
                contact: {}
            }
        },
        created(){

            api.get(this, api.SET_PASSWORD + this.$route.params.hash).then(r => {
                this.contact = r.contact
            });
        },
        components: {
            Loader,
            Status
        },
        methods:{
            savePassword(){
                var _this = this;
                this.$validator.validateAll().then(function(){
                    api.post(_this, api.RESET_PASSWORD + _this.$route.params.hash, {
                        username: _this.username,
                        password: _this.password,
                        password2: _this.password_confirm
                    }).then(r => {
                        _this.confirmed = true;
                    });
                }).catch(function(err){
                    var errorMsg = _this.$validator.errors.items.map(i => i.msg).join('<br />');
                    _this.errorSet(_this.$options.name,  errorMsg);
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