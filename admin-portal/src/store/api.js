import Vue from 'vue';

// Simple API wrapper
class API {
    constructor(root, base, version, context, id, headers, endpoints, isSecure){
        this.state = {            
            isSecure: isSecure,
            id: id,
            root: root,
            base: base,
            version: version,
            headers: headers,
            context: context,
            endpoints: endpoints
        }
    }
    uri(context){
        return this.state.root +
               (this.state.isSecure?'s':'') + '://' +
               this.state.base + '/' +
               (context?this.state.version: this.state.version + '/') +
               (context? context:this.state.context + '/') 
    }    
    url(context){
        let uri = this.uri();
        let endpoints = this.state.endpoints;
        let endpoint = endpoints.find(point => {
            return point.context === context.target;
        });
        
        let url = uri + 
            this.state.id + '/' +
            context.version + '/' +
            context.context + '/' +
            context.id + '/' + 
            endpoint.context + '/' +
            (endpoint.id ? endpoint.id + '/': '');                
        return url;
    }
    get(context){
        // NOTE: Example url for e2e POC, to be made dynamic once stable. 
        let _url = 'https://uat.tenantapi.com/v3/applications/app1782cc28efda463d885fed247e7dc2a9/v1/platform/owners/owna75dac1ee5af4b7383ac3ea195e0df77/website/theme/';        
        // NOTE: Below is for dyamic context once end to end proof of concept established.
        // let url = this.uri() + this.id + context;        
        
        return Vue.http.get(
            _url,
            { headers:this.state.headers }
        );
    }
    getBy(context){
        let url = this.url(context);
        return Vue.http.get(
            url,
            { headers:this.state.headers }
        );
    }
    subscribe(endpoint){
        this.state.endpoints.push(endpoint)
    }
  }

  export default API;