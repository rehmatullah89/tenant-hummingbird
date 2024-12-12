<template>
  <div class="dropdown confirmation" >

    <button class="btn" :class="triggerBtnClass" type="button" @click="visible = !visible" v-html="triggerBtnHtml" >

    </button>

    <div class="dropdown-menu " :class="[getDirection, size]" aria-labelledby="dropdownMenuButton" v-show="visible">
      <slot>
        <strong>{{ title }}</strong>
      </slot>

      <div class="confirmation-footer">
        <button class="btn btn-sm btn-clear" @click="close">Cancel</button>
        <button
            v-if="!alertMode"
            @click="$emit('confirm'); visible = false;"
            class="btn btn-sm"
            :class="confirmBtnClass"
            v-html="confirmBtnHtml">
        </button>
      </div>
    </div>
  </div>
</template>


<script type="text/babel">


  export default{
    data(){
      return{
        visible: false,
        dropdownMessage: ''
      }
    },
    computed:{
      //The flag
      openSuggestion () {
        return this.open === true;
      },
      getDirection(){
        switch(this.direction.toLowerCase()){
          case "right":
              return 'dropdown-menu-right';
              break;
          case "left":
              return 'dropdown-menu-left';
              break;
        }
      }
    },
    created(){
    },

    methods:{
      away(){

        if(!this.keepalive){
          this.visible = false;
          this.$emit('cancel');
        }


      },
      close(){
        this.visible = false;
        this.$emit('cancel');
      }

    },
    props: {
      title: {
        type: String,
        required: false,
        default: 'Are you sure you want to delete this item?'
      },

      keepalive: {
        type: Boolean,
        required: false,
        default: false
      },
      triggerBtnClass: {
        type: String,
        required: false,
        default: "btn-sm btn-delete"
      },
      triggerBtnHtml: {
        type: String,
        required: false,
        default: '<i class="fa fa-trash"></i>'
      },
      confirmBtnClass: {
        type: String,
        required: false,
        default: "btn-danger"
      },
      confirmBtnHtml: {
        type: String,
        required: false,
        default: "Delete"
      },
      btnSize: {
        type: String,
        required: false,
        default: "btn-sm"
      },
      direction: {
        type: String,
        required: false,
        default: "right"
      },
      size: {
        type: String,
        required: false,
        default: "sm"
      },
      alertMode:{
        type: Boolean,
        required: false,
        default: false
      }
    },

  }
</script>
<style scoped>
  .dropdown.confirmation {
    display: inline-block;
  }
  .dropdown-menu {
    padding: 20px;
    font-size: 12px;

  }

  .confirmation-footer {
    margin-top: 30px;
    text-align: right;
  }
  .dropdown-menu{
    display:block;
  }
  .dropdown.confirmation > .dropdown-menu {
    padding: 20px;
    font-size: 12px;

  }
  .dropdown.confirmation > .dropdown-menu.sm {
    width: 250px;
  }

  .dropdown.confirmation > .dropdown-menu.lg {
    width: 400px;
  }

  .dropdown .dropdown-menu.dropdown-menu-left:before,
  .dropdown .dropdown-menu.dropdown-menu-right:before {
    position: absolute;
    top: -7px;
    left: auto;
    right: 9px;
    display: inline-block;
    border-right: 7px solid transparent;
    border-bottom: 7px solid #ccc;
    border-left: 7px solid transparent;
    border-bottom-color: rgba(0, 0, 0, 0.2);
    content: '';
  }

  .dropdown .dropdown-menu.dropdown-menu-left:before {
    left: 9px;
    right: auto;
  }

  .dropdown .dropdown-menu.dropdown-menu-left:after,
  .dropdown .dropdown-menu.dropdown-menu-right:after {
    position: absolute;
    top: -6px;
    left: auto;
    right: 10px;
    display: inline-block;
    border-right: 6px solid transparent;
    border-bottom: 6px solid #ffffff;
    border-left: 6px solid transparent;
    content: '';
  }

  .dropdown .dropdown-menu.dropdown-menu-left:after {
    left: 10px;
    right: auto;
  }


</style>
