const Axios = require('axios')
const _ = require('lodash')
const {
    assign, clone, compact, isArray, isEmpty, omit, pick
} = _

const Form = require('form-data')

const {
    sleep
} = require('vz-utils')


const allMethods = 'get post put patch delete'.split(' ')
const methodsWithData = 'post put patch'.split(' ')


function prepare(api, stem, path = '') {

    if (!stem) {
        stem = api
        api.axios = Axios.create(api.defaults)
        api = api.methods
    }

    for (let branch in api) {

        // Todo: think of a better way to skip
        if (branch[0] == '_') continue

        let leaf = api[branch]

        // Todo: functions that have further properties
        if (typeof leaf == 'function') {

            api[branch] = function () {

                let schema = leaf(... arguments)

                let {_deep} = schema
                if (_deep) {

                    let subPath = compact([path, branch, _deep.url]).join('/')

                    prepare(schema, stem, subPath)

                    return schema
                    
                } else {

                    if (typeof schema == 'string') {
                        let method = schema
                        schema = {}
                        schema[method] = {}
                        let placeForArguments = methodsWithData.includes(method) ? 'data' : 'params'
                        schema[method][placeForArguments] = arguments[0]
                    }
    
                    // Todo: Make this the default approach
                    let methods = pick(schema, allMethods)
                    if (isEmpty(methods)) {
                        let {method} = schema
                        if (!method) method = 'get'
                        methods[method] = schema
                    }

                    for (let method in methods) {
    
                        let args = methods[method]
    
                        let url = path + (args.skipName ? '' : `/${branch}`)
    
                        let additionalUrl = args.url
                        if (additionalUrl) {
                            if (!isArray(additionalUrl)) additionalUrl = [additionalUrl]
                            url += '/' + additionalUrl.join('/')
                        }
    
                        let request = assign(new class Request{}, {url, method})    
    
                        let {formData} = args
    
                        if (formData) {
    
                            let form = new Form()
                            
                            for (let key in formData) {
                                let part = formData[key]
    
                                let {data, contentType} = part
    
                                if (contentType == 'application/json') data = JSON.stringify(data)
    
                                form.append(key, data, omit(part, 'data'))
                            }
    
                            request.data = form
                            request.headers = form.getHeaders()
    
                        } else if (args !== true) {
    
                            assign(request, pick(args, ['data', 'params']))
        
                        }
                                            
                        var tryExecute = new Promise((resolve, reject) => {
                            console.log(request)
                            stem.axios.request(request).then(response => {

                                let {status, data} = response
                                response = assign(new class Response{}, {status, data})
                                console.log(response)
                                resolve(data)    
                            }).catch(error => {
                                error = assign(new class Error{}, error)
                                console.log(error)
                                // let {response} = error
                                // if (response && response.status == 500) return
                                if (error.response) reject(error)
                                if (error.code == 'ETIMEDOUT')
                                {
                                    process.nextTick(() => {
                                        sleep(3000).then(() => {
                                            resolve(tryExecute)
                                        })
                                    })
                                }
                            })
                        })

                        return tryExecute

                    }



                }


            }

        } else {
            prepare(leaf, stem, [path, branch].join('/'))
        }

    }

    return api

}


module.exports = {prepare}