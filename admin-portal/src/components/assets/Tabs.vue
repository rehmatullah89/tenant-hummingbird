<template>
    <div class="tabs-holder" :class="{'show-dropdown': showDropdown}">

        <div class="chosen-section" @click="showDropdown = !showDropdown" >
            {{ displayChosen }}
            <div class="icon float-right"></div>
        </div>
        <div class="tab-list " :class="{'no-top-border':hideTopBorder}">
            <div class="tab-list-option" v-for="(o, i) in options" :class="{active: isActive(o), overflow: (!showItems || i > showItems - 1) }" @click="selectItem(o)" >
                <slot name="menu-display" :value="o" :data="options">
                    {{ display(o) }}
                </slot>
            </div>

            <div v-if="options.length > showItems" class="tab-list-option more-link" @click="showDropdown = !showDropdown">
                <div class="icon"></div>&nbsp; More
                <div class="tabs-dropdown-menu">
                    <ul>
                        <li :class="{active: isActive(o)}" v-for="(o, i) in options" @click.stop="selectItem(o)" v-if="showItems && i >= showItems">
                            <slot name="dropdown-display" :value="o" :data="options">
                                {{ display(o) }}
                            </slot>

                        </li>
                    </ul>
                </div>
            </div>
        </div>

    </div>
</template>





<script type="text/babel">
    import { EventBus } from '../../EventBus.js';

    export default{
        name: "tabList",
        data(){
            return {
                active: '',
                showDropdown: false
            }
        },
        props: [
            'options',
            'value',
            'labelField',
            'idField',
            'showItems',
            'hideTopBorder'
        ],
        created (){
            EventBus.$on('close_more_dropdown', this.closeDropdown);
        },
        destroyed(){
            EventBus.$off('close_more_dropdown', this.closeDropdown);
        },
        computed:{

            displayChosen(){
                if(!this.labelField || !this.idField) return this.value;
                var chosen = this.options.filter(o => o[this.idField] == this.value)
                if(!chosen.length) return '';
                return chosen[0][this.labelField];
            }

        },
        methods:{
            selectItem(o){
                this.showDropdown = false;

                if(this.idField && o[this.idField]){
                    this.$emit('input', o[this.idField])
                    return;
                }
                this.$emit('input', o);


                return ;


            },
            closeDropdown(){
                if(this.showDropdown = true){
                    this.showDropdown = false;
                } else {
                    return;
                }
            },
            display(o){


                if(this.labelField && o[this.labelField]){
                    return o[this.labelField]
                }
                return o;
            },
            isActive(o){

                if(this.idField && o[this.idField]){
                    return o[this.idField] == this.value;
                }

                return o == this.value;;
            }
        }
    }
</script>
<style scoped>
    .tab-list{
        width: 100%;
        display: flex;
        justify-content: stretch;
        margin-bottom: 10px;
        padding: 0;
        border: 1px solid #e2e2e2;
        border-radius: 2px;


    }
    .tab-list-option{
        display: inline-block;
        font-size: 11px;
        line-height: 18px;
        text-transform: uppercase;
        margin: 0;
        color: #798f9a;
        font-weight: 500;
        padding: 10px 30px 10px 30px;
        cursor: pointer;
        border-bottom: 2px solid #f5f7f8;
        position: relative;
        text-align: center;
        flex: 1;
        background: #f5f7f8;
    }

    .tab-list-option:hover{
        color: #00a1c8;
    }

    .tab-list-option.active{
        color: #00b2ce;
        border-bottom: 2px solid #00b2ce;
    }

    .tabs-dropdown-menu{
        right: 0;
        padding: 0;
        overflow: visible;
        box-shadow: 0 10px 15px 0 rgba(0,0,0,0.06);
        border: 1px solid #d5dce0;
        z-index: 100;
        background: white;
        position: absolute;
        margin: 0;
        width: 300px;
        display:none;
    }


    .show-dropdown .tab-list-option .tabs-dropdown-menu {
        display: block;
    }

    .tab-list-option:hover ul{
        color: #798f9a;
    }



    .tabs-dropdown-menu ul{
        margin: 0;
        padding: 0;
        list-style: none;

    }
    .tabs-dropdown-menu ul li{
        padding: 10px;
        border-bottom: 1px solid #e2e2e2;

    }

    .tabs-dropdown-menu ul li.active{
        color: #00b2ce;

    }

    .tab-list-option:hover ul li:hover{
        color: #00b2ce;
    }

    .tabs-dropdown-menu ul li:last-child{
        border-bottom: 0;
    }
    .chosen-section{
        display:none;
        padding: 10px;
        border: 1px solid #e2e2e2;
    }

    .overflow{
        display: none;
    }

    .no-top-border{
        border-top: none;
    }

    @media (max-width: 768px) {
        .tabs-holder{
            margin: 0 10px;
            position: relative;
        }
        .tab-list{
            display:none;
            flex-direction: column;
            box-shadow: 0 10px 15px 0 rgba(0,0,0,0.06);
            border: 1px solid #d5dce0;
            z-index: 100;
            background: white;
            position: absolute;
            margin: 0;
            padding: 0;
            box-sizing: border-box;


        }
        .tab-list-option.more-link{
            display:none;
        }
        .chosen-section{
            display: block;
        }
        .overflow{
            display: block;
        }
        .tab-list-option{
            padding-top: 10px;
            padding-bottom: 10px;
        }

        .show-dropdown .tab-list{
            display:flex;
        }

    }


</style>