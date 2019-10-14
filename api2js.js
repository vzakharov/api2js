const Axios = require('axios')

const {
    assign, clone, compact, isArray, isBoolean, isEmpty, isString, isFunction, isUndefined,
    omit, pick, 
} = require('lodash')

const Form = require('form-data')

const {
    sleep
} = require('vz-utils')

const allMethods = 'get post put patch delete'.split(' ')
const methodsWithData = 'post put patch'.split(' ')


function awaken(api, stem, path = '', passOn = {}) {

    if (!stem) {
        stem = api
        stem._axios = Axios.create(stem._defaults)
        stem._state = {}
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

                let { defaults } = schema
                if (defaults) {
                    arguments[0] = assign(defaults, arguments[0])
                    schema = leaf(... arguments)
                }

                let {_deep} = schema
                if (_deep) {

                    let subPath = compact([path, _deep.skipName ? null :  branch, _deep.url]).join('/')
                    let {passOn} = _deep

                    awaken(schema, stem, subPath, passOn)

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

                        let thisPath = path
                        if (args.skipDeep) {
                            thisPath = ''
                        }

                        let url = thisPath + (args.skipName ? '' : `/${branch}`)
    
                        let additionalUrl = args.url
                        if (additionalUrl) {
                            if (!isArray(additionalUrl)) additionalUrl = [additionalUrl]
                            url += (args.skipDeep ? '' : '/') + additionalUrl.join('/')
                        }
    
                        let request = new class Request{}
                        
                        assign(request, passOn)
                        assign(request, {url, method})    
    
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
    
                            assign(request, pick(args, ['data', 'params', 'headers', 'baseURL']))
        
                        }
                        
                        async function execute(executeArgs = {}) {
                            let { rateLimit, maxSimultaneousRequests } = stem._options || {}

                            if (rateLimit) {
                                while(true) {
                                    let {lastCalled} = stem._state || {}
                                    if (!lastCalled) 
                                        break
                                    let delta = new Date() - lastCalled
                                    if (delta < rateLimit) {
                                        await sleep(delta)
                                    } else {
                                        break
                                    }
                                }
                                stem._state.lastCalled = new Date()
                            }

                            if ( maxSimultaneousRequests ) {
                                while (stem._state.nSimultaneousRequests >= maxSimultaneousRequests) {
                                    // Todo: fix to proper await promise 👇
                                    await stem._state.promise
                                }
                            }

                            // console.log(new Date())
                            console.log(request)
                            try {
                                if ( isUndefined(stem._state.nSimultaneousRequests) )
                                    stem._state.nSimultaneousRequests = 0
                                stem._state.nSimultaneousRequests++
                                console.log(pick(stem._state, 'nSimultaneousRequests'))
                                let promise = stem._axios.request(request) 
                                assign(stem._state, {promise})
                                let response = await promise
                                stem._state.nSimultaneousRequests--
                                let {status, data, headers} = response
                                response = assign(new class Response{}, {request, status, data, headers})
                                // console.log(new Date())
                                console.log(response)

                                let { whatToReturn } = args
                                let result = (() => {
                                    if (whatToReturn) {
                                        if (isString(whatToReturn)) {
                                            return data[whatToReturn]
                                        } else if (isFunction(whatToReturn)) {
                                            return whatToReturn(response)
                                        }
                                    } else {
                                        return data
                                    }    
                                })()

                                let { pagination } = args
                                if ( pagination === true ) pagination = {}

                                if (pagination) {
                                    let { 
                                        startKey, limitKey, keyLocation, callback
                                    } = { 
                                        startKey: 'start', limitKey: 'limit', keyLocation: 'data',
                                        ... pagination 
                                    }
    
                                    let state = request[keyLocation]

                                    if ( !callback ) { // startKey && limitKey ) {
                                        callback = () =>
                                            state[startKey] += state[limitKey]
                                    }
    
                                    if (!executeArgs.results)
                                        executeArgs.results = []
                                    let { results } = executeArgs
                                    results.push(... result)
                                    let paginationFinished = () => {
                                        if ( isBoolean(pagination.criterion) )
                                            return data[pagination.key] == pagination.criterion
                                        else //if ( pagination.criterion == 'length' )
                                            return result.length < state[limitKey]
                                        // throw(new Error('No pagination criterion defined!'))
                                    }
                                    if (paginationFinished()) {
                                        return results
                                    } else {
                                        callback(request, response)
                                        return await execute(executeArgs)
                                    }
                                } else {
                                    return result
                                }
                            } catch (error) {
                                stem._state.nSimultaneousRequests--
                                error = assign(new class Error{}, error)
                                error._request = request
                                // console.log(new Date())
                                console.error(error)
                                let {_onError} = stem
                                if (_onError)
                                    return await _onError({execute, executeArgs, stem, error})
                                else
                                    throw(error)
                            }
                        }

                        return execute()

                    }



                }


            }

        } else {
            awaken(leaf, stem, [path, branch].join('/'), passOn)
        }

    }

    return api

}


module.exports = {awaken}