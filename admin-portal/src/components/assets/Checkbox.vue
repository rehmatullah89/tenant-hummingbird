<template>


    <div class="checkbox">
        <input
                type="checkbox"
                v-model="model"
                :id="id"
                :name="id"
                data-name="id"
                class="w-checkbox-input"
                @change="setVal"
        >
        <label
                :for="id"
                class="w-form-label">{{label}}&nbsp</label>
    </div>



</template>

<script type="text/babel">
    export default {
        name: "Checkbox",
        data() {
            return {
                model: '',
                id: '',
            }
        },
        props:{
            value:{
                required: true
            },
            label:{
                type: String
            }
        },
        created(){
            this.id = Math.random().toString(36).replace(/[^a-z]+/g, '');
            this.model = this.value;
        },
        watch:{
            value(val){
                this.model = val;
            },
        },
        methods:{
            setVal(val){
                this.$emit('input', this.model);
            }

        }


    }
</script>
