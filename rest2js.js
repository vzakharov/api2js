let axios = require('axios')

module.exports = function(schema) {

    let out = {}

    for (let str of schema) {
        let feed = str.split(/\s+/)
        let method = feed.shift()
        let url = feed.shift()
        let breadcrumbs = url.split('/')
        
        let edge = out

        for (let item of breadcrumbs) {
            if (!edge[item]) {
                edge[item] = {}
            }
            edge = edge[item]
        }
        
        let kindOfParameter
        let args = []
        let options = []

        for (let item of feed) {
            switch(item) {
                case '?': 
                    kindOfParameter = 'params'
                    break
                case '+':
                    kindofParameter = 'data'
                    break
                default:
                    let matches = item.match(/(.+?)(!)?/)
                    let parameterName = matches[1]
                    let parameterArray = options
                    if (matches[2]) {
                        parameterArray = args
                    }
                    parameterArray.push(parameterName)

            }    
        }


        edge = async function() {
            for (let i = 0; i < args.length; i++) {
                parameters[args[i]].value = arguments[i]
            }

            let {data, params} = parameters

            try {
                let response = await axios({method, url, data, params})
            } catch(error) {
                throw error
            }

            return response.data

        }
    }
    
}