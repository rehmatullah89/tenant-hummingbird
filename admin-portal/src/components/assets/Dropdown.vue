<template>

    <div
            v-on-clickaway="away"
            class="combobox-wrapper"
            :class="className"

    >

        <div role="combobox"
             :aria-expanded="showList"
             :aria-owns="id"
             :aria-haspopup="id + '-listbox'"
             :id="id + '-combobox'"
        >

            <div class="combobox-input-wrapper">
                <button
                    type="text"
                    :name="name"
                    :id="id"
                    role="button"
                    @click="onArrowClick"
                    @keydown="onKeyDown"
                    @focus="onFocus"
                    aria-autocomplete="both"
                    :aria-controls="id + '-listbox'"
                    :aria-labelledby="labeledBy"
                    ref="button"
                    class="combo-button"
                    v-model="search"
                    :placeholder="placeholder"
                    :aria-activedescendant="activeDecendant"
                >
                    <slot name="display">
                        {{ display }}
                    </slot>
                </button>

                <div

                    v-show="search && search.length && !forceChoice"
                    class="combobox-remove icon"
                    @click.stop="unset()"
                >
                    
                </div>
            </div>

                <span class="combobox-dropdown" @click="onArrowClick">
                    <span class="icon" v-show="!showList"></span>
                    <span class="icon" v-show="showList"></span>
                </span>
        </div>
        <ul
                :aria-labelledby="labeledBy"
                role="listbox"
                :id="id + '-listbox'"
                class="listbox"
                :aria-expanded="showList"
                v-show="showList"
                ref="list"
        >
            <li
                @click.stop="$emit('add')"
                class="result add-text"
                role="option"
                v-show="add"
            >{{ addText || 'Add Option' }}</li>
            <li
                    v-for="result, i in results"
                    class="result"
                    role="option"
                    :id="id + 'result-item-' + i"
                    :aria-selected="i == activeIndex"
                    :class="{focused: i == activeIndex}"
                    @click.stop="selectItem(result, i)"
                    :ref="'element_' + optionString(result) "
            >
                <slot name="option" :data="result">
                    {{ optionLabel(result) }}
                </slot>
            </li>
        </ul>
    </div>



</template>


<script type="text/babel">


    import Loader from './CircleSpinner.vue';
    export default{
        name: "Dropdown",
        data(){
            return {
                hasSearched: false,
                showList: false,
                search: '',
                activeIndex: -1,
                results: [],
                shouldAutoSelect: false,
                isInitial: true,
                KeyCode: {
                    BACKSPACE: 8,
                    TAB: 9,
                    RETURN: 13,
                    ESC: 27,
                    SPACE: 32,
                    PAGE_UP: 33,
                    PAGE_DOWN: 34,
                    END: 35,
                    HOME: 36,
                    LEFT: 37,
                    UP: 38,
                    RIGHT: 39,
                    DOWN: 40,
                    DELETE: 46
                },
                focused: null
            }
        },
        components:{
            Loader
        },
        computed:{
            display(){
                if(this.search) return this.search;
                if(this.placeholder) return this.placeholder;
                return "Choose One";
            },
            activeDecendant(){
                if(!this.activeIndex) return null;
                return 'result-item-' + this.activeIndex;
            },
            idSlug(){
                if(!this.id) return '';
                return this.slugify(this.id);
            }
        },
        mounted(){
            this.results = this.options;
            this.setSearch(this.value);
        },

        methods:{
            setSearch(value){
                if(value){
                    if(this.idField){
                        var found = this.options.filter(o => o[this.idField] == value );
                        if(!found.length) return;
                        this.search = found[0][this.labelField];
                        return;
                    } else if (this.labelField) {
                        this.search = value[this.labelField];
                        return;
                    }
                    this.search = value;
                }
                this.search = value;
            },


            slugify(text){
                return text.toString().toLowerCase()
                        .replace(/\s+/g, '-')           // Replace spaces with -
                        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                        .replace(/^-+/, '')             // Trim - from start of text
                        .replace(/-+$/, '');            // Trim - from end of text
            },
            onArrowClick(){

                this.showList = !this.showList;

            },


            onKeyDown(evt){
                this.handleKeyDownPress(evt);
            },
            onKeyUp(evt){
               // this.handleKeyUpPress(evt);
            },


            onFocus(){
                //this.showList = true;
            },


            away(){
                this.showList = false;
                this.$emit('off');
            },

            unset(){
                this.search = '';
                this.setVal('');
                this.hideList();
            },

            selectItem(item){
                if(item){
                    this.setVal(item);
                    this.hideList();
                }
            },
            handleKeyDownPress(evt){
                var key = evt.which || evt.keyCode;
                if (key === this.KeyCode.ESC) {
                    this.hideList();
                    this.setVal('');
                    return;
                }


                switch (key) {
                    case this.KeyCode.UP:

                        if (this.activeIndex <= 0) {
                            this.activeIndex = this.results.length - 1;
                        } else {
                            this.activeIndex--;
                        }
                        this.moveWindow();
                        evt.preventDefault();
                        break;
                    case this.KeyCode.DOWN:

                        if (this.activeIndex === -1 || this.activeIndex >= this.results.length - 1) {
                            this.activeIndex = 0;
                        } else {
                            this.activeIndex++;
                        }
                        this.showList = true;
                        this.moveWindow();
                        evt.preventDefault();
                        break;
                    case this.KeyCode.SPACE:
                        this.showList = !this.showList;
                        evt.preventDefault();
                        break;
                    case this.KeyCode.RETURN:
                        evt.preventDefault();
                        this.selectItem(this.results[this.activeIndex]);
                        return;
                    case this.KeyCode.TAB:



                        if(this.activeIndex >= 0 ) {
                            this.selectItem(this.results[this.activeIndex]);
                            return;
                        }

                        var found = this.results.filter(r => {
                            if(this.labelField){
                                return r[this.labelField] == this.search;
                            } else {
                                return r == this.search;
                            }
                        });

                        if (!found.length) {
                            //this.search = '';
                            this.setVal('');
                            return;
                        }
                        this.activeIndex = this.results.indexOf(found[0]);
                        this.selectItem(found[0]);
                        return;

                        return;
                    default:

//                        this.showList = true;
                        return;
                }

                //  evt.preventDefault();



            },
            moveWindow(){

                if(!this.results.length) return;
                var element = this.$refs['element_' +  this.optionString(this.results[this.activeIndex])][0];

                // MOVE WINDOW TO PROPER POSITION

                if (this.$refs.list.scrollHeight > this.$refs.list.clientHeight) {
                    var scrollBottom = this.$refs.list.clientHeight + this.$refs.list.scrollTop;

                    var elementBottom = element.offsetTop + element.offsetHeight;
                    if (elementBottom > scrollBottom) {
                        this.$refs.list.scrollTop = elementBottom - this.$refs.list.clientHeight;
                    }
                    else if (element.offsetTop < this.$refs.list.scrollTop) {
                        this.$refs.list.scrollTop = element.offsetTop;
                    }
                }
            },

            setVal(value){


                if(this.idField && value){
                    this.$emit('input', value[this.idField]);
                } else {
                    this.$emit('input', value);
                }

//                if(this.labelField && value){
//                    this.search = value[this.labelField];
//                } else {
//                    this.search = value;
//                }


                // TODO change to handle Objects

            },
            hideList(){

                this.showList = false;
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
            optionLabel(o){
                if(this.labelField && o[this.labelField]){
                    return o[this.labelField]
                }
                return o;
            },
        },

        props: {
            id:{
                type: String,
                required: false
            },
            name:{
                type: String,
                required: false
            },
            labeledBy:{
                type: String,
                required: false
            },
            options: {
                type: Array,
                required: false
            },
            value: {
                required: false
            },
            className: {
                type: String,
                required: false
            },
            placeholder: {
                type: String,
                required: false,
                default: ''
            },
            idField:{
                type: String,
                required: false
            },
            labelField:{
                type: String,
                required: false
            },
            forceChoice: {
                type: Boolean,
                default: false
            },
            add: {
                type: Boolean,
                default: false
            },
            addText: {
                type: String,
                default: ''
            }
        },
        watch:{
            options(o){

                this.results = o;
                if(!this.hasSearched){
                    this.setSearch(this.value)
                }
                this.hasSearched = true;
            },
            value(value){

                this.setSearch(value);
            },
        }

    }


</script>


<style scoped>

    .combobox-wrapper {
        display: block;
        position: relative;
        text-align: left;

    }


    .combobox-wrapper button.combo-button{
        display: block;
        width: 100%;
        color: #333333;
        vertical-align: middle;
        background-color: #ffffff;
        border: 1px solid #cccccc;
        text-align: left;

    }

    .combobox-wrapper .combobox-dropdown {
        position: absolute;
        right: 0;
        top: 0;
        color: #cccccc;
        height: 100%;
        cursor: default;
    }

    .combobox-wrapper .listbox{
        top: 37px;
        width: 100%;
        background: white;
        border: 1px solid #ccc;
        list-style: none;
        margin: 0;
        padding: 0;
        position: absolute;
        z-index: 1;
        max-height: 300px;
        overflow-y: auto;
    }

    .combobox-wrapper .listbox .result {
        cursor: default;
        margin: 0;
        display: block;
        position: relative;
        line-height: 18px;
        padding: 10px 12px;
    }


    li.loader {
        padding-left: 10px;
    }

    li.no-results{

    }

    /* Custom styles */
    .combobox-wrapper li:hover{
        background-color: #f5f7f8;
    }
    .combobox-wrapper button.combo-button:focus{
        border: 2px solid #00b2ce;
        outline: 0;
    }
    .combobox-wrapper li.focused,
    .combobox-wrapper li.focused:hover{
        background: #f5f7f8;
    }

    .combobox-input-wrapper{
        position: relative;

    }

    .combobox-remove.icon {
        position: absolute;
        top: 0;
        right: 0px;
        color: #cccccc;
        cursor: default;
        padding: 10px 13px;
        text-align: center;
        font-size: 10px;
    }

    .combobox-dropdown {
        display: block;
        background-color: white;
        border: 1px solid #cccccc;
        border-left: 0;
    }

    .combobox-input-wrapper{
        margin-right: 40px;
    }

    .combobox-input-wrapper button.combo-button {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }

    .add-text{
        background-color: #f5f7f8;
        font-weight: 500;
    }



</style>
