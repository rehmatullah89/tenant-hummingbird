const  StatusMessages = {
	install (Vue) {
		Vue.mixin({
			data() {
				return {
					errorList: {},
					successList: {}
				}
			},
			methods:{
				errorSet(name, msg){
					Vue.set(this.errorList, name, msg);
				},
				errorClear(name){
					return Vue.delete(this.errorList, name);
				},
				errorClearAll(){
					return this.errorList = {};
				},

				errorHas(name){
					return name in this.errorList;
				},
				errorGet(name){
					return this.errorList[name];
				},

				successSet(name, msg){
					Vue.set(this.successList, name, msg);
				},
				successClear(name){
					return Vue.delete(this.successList, name);
				},
				successClearAll(){
					return this.successList = {};
				},
				successHas(name){
					return name in this.successList;
				},
				successGet(name){
					return this.successList[name];
				}
			}
		})
	}
};

export default StatusMessages;
