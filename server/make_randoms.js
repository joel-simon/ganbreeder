const request = require('request-promise')
const save_results = require('./save_results.js')
const secrets = require('./secrets.js')

async function main() {
    const [ imgs, vectors, labels ] = await request({
        url: secrets.ganurl+'/random',
        method: 'POST',
        json: true,
        form: { num: '24' }
    })
    await save_results({ imgs, vectors, labels })
    console.log('all done')
}

main().catch(e => {
    console.log(e)
    process.exit()
}).then(process.exit)
