const xml2js = require('xml2js')
const Axios = require('axios')
const _ = require('lodash')

function readSchema(xml) {
    let js
    let out = {}

    let attrkey = 'attributes'
    let childkey = 'children'

    xml2js.parseString(xml, {
        explicitArray: false,
        explicitChildren: true,        
        charkey: '_text',
        childkey, attrkey
    }, (err, result) => {
        js = result
    })

    crawl(js.schema.children.api, [], {}, out)

    function crawl(parent, parentPath, parentOptions, out) {
        let children = parent.children

        for (let key in children) {
            let path = parentPath.slice()

            let item = children[key]

            if (_.isArray(item)) {
                let siblings = item
                for (let sibling of siblings) {
                    crawl(sibling, path, parentOptions, out)
                }
            }

            let child = item

            let options = _.assign({}, parentOptions)
            _.assign(options, child.attributes)

            if (key != '_') {
                path.push(key)
            }

            if (child.children) {
                crawl(child, path, options, out)
            } else {
                let url = _.flatten([options.version, path]).join('/')
                let obj = out
                let lastProperty = path.pop()

                for (property of path) {
                    if (!obj[property]) {
                        obj[property] = {}
                    }
                    obj = obj[property]
                }

                obj[lastProperty] = function(args) {
                    let allParameters = args[options.args.length]
                }

                return out
            }
        }
    }

    return out
}

module.exports = readSchema