main() 

async function main() {
    let rest2js = require('./rest2js')
    let schema = require('./testSchema.json')
    let credentials = require('./credentials.json')

    let smartcat = rest2js(schema, {
        credentials: credentials.smartcat
    })

    console.log(await smartcat.account.searchMyTeam())

    return
}