main() 

async function main() {
    let rest2js = require('./rest2js')
    let schema = require('./testSchema.json')

    let obj = rest2js(schema)

    await obj.document.assignFreelancers(1, 2, [3])
}