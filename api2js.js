const Axios = require('axios')
const _ = require('lodash')
const {
    assign, pick
} = _
const allMethods = 'get post put patch delete'.split(' ')
const methodsWithData = 'post put patch'.split(' ')

function prepare(api, stem, path = '') {

    if (!stem) {
        stem = api
        api.axios = Axios.create(api.defaults)
        api = api.methods
    }

    for (let branch in api) {

        let leaf = api[branch]

        if (typeof leaf == 'function') {

            api[branch] = async function () {
                let schema = leaf(... arguments)
                for (let method in pick(schema, allMethods)) {

                    let args = schema[method]
                    
                    if (!Array.isArray(args)) args = [args]

                    let url = `${path}/${branch}`

                    if (typeof args[0] == 'string') {
                        url = `${url}/${args.shift()}`
                    }

                    let data = methodsWithData.includes(method) && args.shift()
                    let params = args.shift()

                    let config = {url, method}
                    if (data) assign(config, {data})
                    if (params) assign(config, {params})
                    
                    try {
                        let response = await stem.axios.request(config)
                        let {_header} = response.request
                        let {status, data} = response
                        console.log({_header, status, data})
                        return data
                    } catch(error) {
                        throw(error)
                    }
                }    
            }

        } else {

            prepare(leaf, stem, `${path}/${branch}`)

        }

    }

    return api

}


module.exports = {prepare}