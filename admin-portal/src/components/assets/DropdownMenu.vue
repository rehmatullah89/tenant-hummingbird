<template>


    <div class="listbox-area" :style="styleProps" :class="className" >

        <div id="exp_wrapper">
            <div aria-haspopup="listbox"
                    ref="toggle"
                    class="exp_button"
                    @click="toggleListbox"
                    @keyup="checkShow"
                    @keydown="checkKeyPress"
            >
                <slot name="trigger">
                    Menu
                </slot>
            </div>

            <div
                class="dropdown-area"
                v-if="showList"
                ref="list"
                @blur="hideListbox"
                :style="styles"
            >
                <slot name="dropdown" :away="away" ></slot>
            </div>

        </div>

    </div>
</template>



<script type="text/babel">


    export default{
        data(){
            return {
                styles:{
                    width: 'auto',
                    position: 'absolute',
                    left: 'auto',
                    right: 0,
                    marginLeft:'auto',
                    maxWidth: 0,
                    'text-align': 'left'
                },
                showList: false,
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
                moveUpDownEnabled: false,
                focused: null
            }
        },
        computed:{
            chosen(){
                if(!this.focused) return null;
                if(this.label && this.focused[this.label]){
                    return this.focused[this.label]
                }
                return this.focused;
            },



        },
        filters:{},
        created(){
            if(this.value){
                this.focused = this.value;
            }
            this.updateStyle();
            window.addEventListener('resize', this.updateStyle)

        },
        methods: {
            updateStyle(){

                this.styles.maxWidth = window.innerWidth - 20 + 'px';

                if(this.width){
                    this.styles.width = this.width + 'px';
                    if(window.innerWidth  > 767) {
                        this.styles.position = 'absolute';
                        this.styles.left = 'auto';
                        this.styles.right = '0';
                    } else if(window.innerWidth  >= this.width - 20){
                        this.styles.position= 'fixed';
                        this.styles.left= '50%';
                        this.styles.marginLeft= "-" + (this.width/2) + 'px';
                    } else {
                        this.styles.position= 'fixed';
                        this.styles.marginLeft = 'auto';
                        this.styles.left= "10px";
                        this.styles.right= "10px";
                    }

                }

                if(this.align){
                    this.styles['text-align'] = this.align
                }

            },
            slugify(text){
                return text.toString().toLowerCase()
                        .replace(/\s+/g, '-')           // Replace spaces with -
                        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                        .replace(/^-+/, '')             // Trim - from start of text
                        .replace(/-+$/, '');            // Trim - from end of text
            },


            checkKeyPress(evt){


                var key = evt.which || evt.keyCode;

                //var nextItem = document.getElementById(this.activeDescendant);
                var nextItem = this.options.indexOf(this.focused);
                nextItem = nextItem || 0;

                switch (key) {
                    case this.KeyCode.PAGE_UP:
                    case this.KeyCode.PAGE_DOWN:
                        if (this.moveUpDownEnabled) {
                            evt.preventDefault();

                            if (key === this.KeyCode.PAGE_UP) {
                                this.moveUpItems();
                            }
                            else {
                                this.moveDownItems();
                            }
                        }

                        break;
                    case this.KeyCode.UP:
                    case this.KeyCode.DOWN:
                        evt.preventDefault();

                        if (this.moveUpDownEnabled && evt.altKey) {
                            if (key === this.KeyCode.UP) {
                                this.moveUpItems();
                            }
                            else {
                                this.moveDownItems();
                            }
                            return;
                        }



                        if (key === this.KeyCode.UP) {
                            nextItem--;
                        }
                        else {
                            nextItem++;
                        }

                        if (nextItem < 0) {
                            nextItem = 0;
                        }
                        if (nextItem >= this.options.length) {
                            nextItem = this.options.length - 1;
                        }
                        this.focusItem(this.options[nextItem]);

                        break;
                    case this.KeyCode.HOME:
                        evt.preventDefault();
                        this.focusFirstItem();
                        break;
                    case this.KeyCode.END:
                        evt.preventDefault();
                        this.focusLastItem();
                        break;
                    case this.KeyCode.RETURN:
                    case this.KeyCode.SPACE:
                        evt.preventDefault();

                        this.focusItem(this.options[nextItem]);
                        this.hideListbox();

                        //this.toggleSelectItem(nextItem);
                        break;
                    case this.KeyCode.BACKSPACE:
                    case this.KeyCode.DELETE:
                        if (!this.moveButton) {
                            return;
                        }
                        var keyshortcuts = this.moveButton.getAttribute('aria-keyshortcuts');
                        if (key === this.KeyCode.RETURN && keyshortcuts.indexOf('Enter') === -1) {
                            return;
                        }
                        if (
                                (key === this.KeyCode.BACKSPACE || key === this.KeyCode.DELETE) &&
                                keyshortcuts.indexOf('Delete') === -1
                        ) {
                            return;
                        }

                        evt.preventDefault();

                        var nextUnselected = nextItem.nextElementSibling;
                        while (nextUnselected) {
                            if (nextUnselected.getAttribute('aria-selected') != 'true') {
                                break;
                            }
                            nextUnselected = nextUnselected.nextElementSibling;
                        }
                        if (!nextUnselected) {
                            nextUnselected = nextItem.previousElementSibling;
                            while (nextUnselected) {
                                if (nextUnselected.getAttribute('aria-selected') != 'true') {
                                    break;
                                }
                                nextUnselected = nextUnselected.previousElementSibling;
                            }
                        }

                        this.moveItems();

                        if (!this.activeDescendant && nextUnselected) {
                            this.focusItem(nextUnselected);
                        }
                        break;
                    default:
                        //        var itemToFocus = this.findItemToFocus(key);
                        //        if (itemToFocus) {
                        //            this.focusItem(itemToFocus);
                        //        }
                        break;

                }
            },


            findItemToFocus(key){
                var itemList = this.listboxNode.querySelectorAll('[role="option"]');
                var character = String.fromCharCode(key);

                if (!this.keysSoFar) {
                    for (var i = 0; i < itemList.length; i++) {
                        if (itemList[i].getAttribute('id') == this.activeDescendant) {
                            this.searchIndex = i;
                        }
                    }
                }
                this.keysSoFar += character;
                this.clearKeysSoFarAfterDelay();

                var nextMatch = this.findMatchInRange(
                        itemList,
                        this.searchIndex + 1,
                        itemList.length
                );
                if (!nextMatch) {
                    nextMatch = this.findMatchInRange(
                            itemList,
                            0,
                            this.searchIndex
                    );
                }
                return nextMatch;
            },

            clearKeysSoFarAfterDelay(){
                if (this.keyClear) {
                    clearTimeout(this.keyClear);
                    this.keyClear = null;
                }
                this.keyClear = setTimeout((function () {
                    this.keysSoFar = '';
                    this.keyClear = null;
                }).bind(this), 500);
            },
            findMatchInRange(list, startIndex, endIndex){
                // Find the first item starting with the keysSoFar substring, searching in
                // the specified range of items
                for (var n = startIndex; n < endIndex; n++) {
                    var label = list[n].innerText;
                    if (label && label.toUpperCase().indexOf(this.keysSoFar) === 0) {
                        return list[n];
                    }
                }
                return null;

            },


            checkShow(evt){
                var key = evt.which || evt.keyCode;
                switch (key) {
                    case this.KeyCode.UP:
                    case this.KeyCode.DOWN:
                        evt.preventDefault();
                        this.showListbox();
                        //  this.checkKeyPress(evt);
                        break;
                }
            },
            checkHide(evt){
                var key = evt.which || evt.keyCode;

                switch (key) {
                    case this.KeyCode.RETURN:
                    case this.KeyCode.ESC:
                        evt.preventDefault();
                        this.hideListbox();
                        //this.button.focus();
                        break;
                }
            },
            toggleListbox() {
                if(this.showList) {
                    this.hideListbox();
                } else {
                    this.showListbox();
                }

            },
            showListbox() {
                this.showList = true;
                this.$nextTick(() => {
                    this.$refs.list.focus();
                })
            },

            hideListbox () {
                this.showList = false;

                this.$nextTick(() => {
                    this.$refs.toggle.focus();
                })
            },
            away(){

                if(!this.keepalive){
                    this.hideListbox();
                }
            }
        },

        mounted (){},
        props: {
            width: {
                type: String,
                required: false
            },
            align:{
                type: String,
                required: false,
                default: 'right'
            },
            styleProps: {
                type: Object,
                required: false
            },
            className: {
                type: String,
                required: false
            },

            keepalive: {
                type: Boolean,
                default: false
            }
        },

    }
</script>
<style scoped>





    .listbox-area {

        position: relative;

    }

    .listbox-area li{
        display: block;
        padding: 10px 12px;
        position: relative;
        line-height: 18px;
    }

    li:hover{
        background-color: #f5f7f8;
    }

    li.focused,
    li.focused:hover{
        background: #e5f3fa;
    }

    button[aria-disabled="true"] {
        opacity: 0.5;
    }


    .dropdown-area {
        z-index: 100;
        padding: 0px;
        background: white;
        width: auto;
        position: absolute;
        margin: 0;
        right: 0;
    }


    .offscreen {
        clip: rect(1px 1px 1px 1px);
        clip: rect(1px, 1px, 1px, 1px);
        font-size: 14px;
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
    }


    .listbox-area{
        max-width: 100%;
    }

    .listbox-area .dropdown-area{
        min-height: auto;
        height: auto;

    }

    .listbox-area .left-area {
        width: 100%;
        max-width: 100%;
    }

    .listbox-area li{
        padding: 8px 12px;
        width: 100%;
    }

    .listbox-area.blank .exp_button[aria-expanded="true"] + ul{
        width: auto;
        min-width: 150px;
        top: 24px;
        border: 1px solid #e2e2e2;
    }

    .listbox-area button::focus{
        border: none;
    }


    .dropdown-area{
        right: 0;
        padding: 0;
        background-color: #fff;
        box-shadow: 1px 1px 3px 0px #dee5e7;
        overflow: visible;
        border: 2px solid #00b2ce;

    }
    .dropdown-area > ul > li{
        width: 100%;
        font-size: 13px;
    }
    .dropdown-area > ul {
        padding: 0;
        margin: 0;
    }
    .dropdown-area::before{
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid #00b2ce;
        position: absolute;
        top: -8px;
        right: 16px;
        content: " ";
        z-index: 100;
    }


    .dropdown-area ul li{
        padding: 10px;
        border-bottom: 1px solid #e2e2e2;
    }


    @media (max-width: 767px) {

        body .listbox-area .dropdown-area::before{
            content: none
        }
    }



</style>
