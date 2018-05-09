const fs = require('fs')

main() 

async function main() {
    let api2js = require('./api2js')
    let schema = fs.readFileSync('./smartcatSchema.xml', 'utf-8')

    return api2js(schema)
}