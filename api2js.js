const Axios = require('axios')

const {
    assign, clone, compact, isArray, isEmpty, omit, pick, isString, isFunction
} = require('lodash')

const Form = require('form-data')

const {
    sleep
} = require('vz-utils')

const allMethods = 'get post put patch delete'.split(' ')
const methodsWithData = 'post put patch'.split(' ')


function awaken(api, stem, path = '') {

    if (!stem) {
        stem = api
        stem._axios = Axios.create(stem._defaults)
        // api = api.methods
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

                    let subPath = compact([path, _deep.skipName ? null :  branch, _deep.url]).join('/')

                    awaken(schema, stem, subPath)

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

                        if (args.skipDeep) {
                            path = ''
                        }

                        let url = path + (args.skipName ? '' : `/${branch}`)
    
                        let additionalUrl = args.url
                        if (additionalUrl) {
                            if (!isArray(additionalUrl)) additionalUrl = [additionalUrl]
                            url += (args.skipDeep ? '' : '/') + additionalUrl.join('/')
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
    
                            assign(request, pick(args, ['data', 'params', 'headers']))
        
                        }
                        
                        function tryExecute(resolve, reject) {
                            let {rateLimit} = stem._options || {}
                            let {lastCalled} = stem._state || {}
                            let timestamp = new Date()
                            console.log(timestamp)
                            if (rateLimit) {
                                if (lastCalled) {
                                    let delta = timestamp - lastCalled
                                    if (delta < rateLimit) {
                                        setTimeout(
                                            () => tryExecute(resolve, reject), 
                                            rateLimit - delta
                                        )
                                        return
                                    }
                                }
                                stem._state.lastCalled = timestamp
                            }
                            console.log(request)
                            stem._axios.request(request).then(response => {
                                let {status, data, headers} = response
                                response = assign(new class Response{}, {status, data, headers})
                                console.log(new Date())
                                console.log(response)
                                let {whatToReturn} = args
                                if (whatToReturn) {
                                    if (isString(whatToReturn)) {
                                        resolve(response[whatToReturn])
                                    } else if (isFunction(whatToReturn)) {
                                        resolve(whatToReturn(response))
                                    }
                                } else {
                                    resolve(data)
                                }
                            }).catch(error => {
                                error = assign(new class Error{}, error)
                                console.log(new Date())
                                console.log(error)
                                let {_onError} = stem
                                if (_onError)
                                    resolve(_onError({tryExecute, stem, error, resolve, reject}))
                                // resolve(stem._errorHandler(error))
                                // let {response, code} = error
                                // if (response && response.status == 500) return
                                // if (response && response.status == 403)
                                // if (response) reject(error)
                                // if (code == 'ETIMEDOUT') {
                                //     resolve(new Promise(tryExecute))
                                // }
                            })
                        }

                        return new Promise(tryExecute)

                    }



                }


            }

        } else {
            awaken(leaf, stem, [path, branch].join('/'))
        }

    }

    return api

}


module.exports = {awaken}