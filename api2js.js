const Axios = require('axios')
const _ = require('lodash')
const {
    assign, clone, compact, isArray, map, omit, pick
} = _

const Form = require('form-data')

const {
    sleep
} = require('vz-utils')


const allMethods = 'get post put patch delete'.split(' ')
const methodsWithData = 'post put patch'.split(' ')

function prepare(api, stem, path = '', defaults = {}) {

    defaults = clone(defaults)

    if (!stem) {
        stem = api
        api.axios = Axios.create(api.defaults)
        api = api.methods
    }

    let {_defaults} = api
    if (_defaults) {
        assign(defaults, _defaults)
    }

    for (let branch in api) {

        // Todo: think of a better way to skip
        if (branch[0] == '_') continue

        let leaf = api[branch]

        if (typeof leaf == 'function') {

            api[branch] = function () {

                let schema = leaf(... arguments)

                let {_deep} = schema
                if (_deep) {

                    // let subApi = {
                    //     methods: schema,
                    //     defaults: assign({}, stem.defaults, defaults)
                    // }

                    let subPath = compact([path, branch, _deep.url]).join('/')

                    prepare(schema, stem, subPath, clone(defaults))

                    return schema
                    
                } else {

                    if (typeof schema == 'string') {
                        let method = schema
                        schema = {}
                        schema[method] = {}
                        let placeForArguments = methodsWithData.includes(method) ? 'data' : 'params'
                        schema[method][placeForArguments] = arguments[0]
                    }
    
                    for (let method in pick(schema, allMethods)) {
    
                        let args = assign(defaults, schema[method])
    
                        let url = path + (args.skipName ? '' : `/${branch}`)
    
                        let additionalUrl = args.url
                        if (additionalUrl) {
                            if (!isArray(additionalUrl)) additionalUrl = [additionalUrl]
                            url += '/' + additionalUrl.join('/')
                        }
    
                        let config = {url, method}
    
    
                        let {formData} = args
    
                        if (formData) {
    
                            let form = new Form()
                            
                            for (let key in formData) {
                                let part = formData[key]
    
                                let {data, contentType} = part
    
                                if (contentType == 'application/json') data = JSON.stringify(data)
    
                                form.append(key, data, omit(part, 'data'))
                            }
    
                            config.data = form
                            config.headers = form.getHeaders()
    
                        } else if (args !== true) {
    
                            assign(config, pick(args, ['data', 'params']))
        
                        }
                                            
                        var tryExecute = new Promise((resolve, reject) => {
                            console.log(config)
                            stem.axios.request(config).then(response => {
                                let {_header} = response.request
                                let {status, data} = response
                                console.log({status, data})
                                resolve(data)    
                            }).catch(error => {
                                console.log(error)
                                // let {response} = error
                                // if (response && response.status == 500) return
                                if (error.response) throw (error)
                                sleep(10000).then(() => {
                                    resolve(tryExecute)
                                })
                            })
                        })
    
                    }

                    return tryExecute

                }


            }

        } else {
            prepare(leaf, stem, `${path}/${branch}`, clone(defaults))
        }

    }

    return api

}


module.exports = {prepare}