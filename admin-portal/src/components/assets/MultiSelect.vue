<template>
    <div>
        <autocomplete

            :id="id"
            :name="name"
            :labeledBy="labeledBy"
            :options="filteredOptions"
            v-model="item"
            :className="className"
            :showAll="showAll"
            :placeholder="setPlaceholder"
            :idField="idField"
            :labelField="labelField"
            @input="addItem"
            keepOpen
        >

            <template slot="option" slot-scope="result">
                <div class="checkbox" :class="{checked: items.indexOf(getVal(result.data)) >= 0 }">
                    <input
                        v-model="box"
                        type="checkbox"
                        :id="'checkbox-multi-select-' + optionString(result.data)"
                        :name="'checkbox-severity-' + optionString(result.data)"
                        :data-name="'checkbox-severity-' + optionString(result.data)"
                        class="w-checkbox-input"
                    >
                    <label
                        :for="'checkbox-severity-' + optionString(result.data)"
                        class="w-form-label">{{ optionLabel(result.data) }}</label>
                </div>
            </template>
        </autocomplete>
    </div>

</template>

<script type="text/babel">
    import Autocomplete from './Autocomplete.vue';
    export default{
        name: "Multiselect",
        data(){
            return {
                items: [],
                item: '',
                box: ''
            }
        },
        components: {
            Autocomplete
        },
        computed:{
            filteredOptions(){
                return this.options;
            },
            setPlaceholder(){
                if(!this.items.length){
                    return this.emptyPlaceholder;
                }
                if(this.items.length >= 1){
                    var str = this.items.length + ' ';
                    str += this.itemName? this.itemName + ' selected': 'items selected';
                    return str;
                }

            }
        },
        mounted(){
           if(this.value){
               this.items = this.value;
           }
        },
        watch:{
          value(value){
              this.items = value;
          }
        },
        methods:{
            getVal(value){
                if(this.idField && value){
                    return value[this.idField];
                } else {
                    return value;
                }
            },
            optionString(o){
                if(this.idField && o[this.idField]){
                    return this.slugify(o[this.idField])
                }
                if(this.labelField && o[this.labelField]){
                    return this.slugify(o[this.labelField])
                }
                if(!o) return '';
                return this.slugify(o);
            },
            slugify(text){
                return text.toString().toLowerCase()
                        .replace(/\s+/g, '-')           // Replace spaces with -
                        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                        .replace(/^-+/, '')             // Trim - from start of text
                        .replace(/-+$/, '');            // Trim - from end of text
            },
            optionLabel(o){
                if(typeof this.labelField !== 'undefined' && o[this.labelField] !== 'undefined'){
                    return o[this.labelField]
                }
                return o;
            },
            addItem(item){

                if(!item) return;

                if(this.items.indexOf(item) >= 0){
                    this.items.splice(this.items.indexOf(item), 1);

                } else {
                    this.items.push(item);
                }

                this.$emit('input', this.items);
                this.$nextTick(() => {
                    console.log("ITEM", this.item);

                    this.item = '';
                })


            }
        },
        props: {
            emptyPlaceholder:{
                type: String,
                required: false
            },
            itemName:{
                type: String,
                required: false
            },
            id: {
                type: String,
                required: false
            },
            name: {
                type: String,
                required: false
            },
            labeledBy: {
                type: String,
                required: false
            },
            options: {
                type: Array,
                required: false
            },
            value: {
                required: false,
                type: Array,
            },
            className: {
                type: String,
                required: false
            },
            showAll: {
                type: Boolean,
                required: false,
                default: false
            },
            placeholder: {
                type: String,
                required: false,
                default: ''
            },
            idField: {
                type: String,
                required: false
            },
            labelField: {
                type: String,
                required: false
            }
        }
    }


</script>
