let Axios = require('axios')
let _ = require('lodash')

module.exports = function(schema) {

    let axiosInit = _.pick(schema, ['baseUrl'])
    let axios = Axios.create(axiosInit)

    let {credentials} = schema

    if (credentials) {
        
    }

    let out = {}

    for (let str of schema.methods) {
        let feed = str.split(/\s+/)
        let method = feed.shift()
        let url = feed.shift()
        let breadcrumbs = url.split('/')
        
        let edge = out
        let item

        while (breadcrumbs.length > 0) {
            item = breadcrumbs.shift()
            if (breadcrumbs.length == 0) {
                break
            }
            if (!edge[item]) {
                edge[item] = {}
            }
            edge = edge[item]
        }
        
        let parameters = []

        for (let item of feed) {
            switch(item) {
                case '?': 
                    kind = 'params'
                    continue
                case '+':
                    kind = 'data'
                    continue
                default:
                    let matches = item.match(/^(.+?)(!)?$/)
                    let name = matches[1]
                    let passedVia = 'options'
                    if (matches[2]) {
                        passedVia = 'args'
                    }
                    parameters.push({kind, name, passedVia})
            }    
        }


        edge[item] = async function() {
            let i = 0

            let options = _.last(arguments)

            for (let parameter of parameters) {
                if (parameter.passedVia == 'args') {
                    parameter.value = arguments[i]
                    i++
                } else {
                    parameter.value = options[parameter.name]
                }
            }

            let parametersByKind = {data: {}, params: {}}

            for (let parameter of parameters) {
                let {name} = parameter
                parametersByKind[parameter.kind][name] = parameter.value
            }

            let {data, params} = parametersByKind

            try {
                let response = await axios.request({method, url, data, params})
            } catch(error) {
                throw error
            }

            return response.data

        }
    }
    
    return out
}