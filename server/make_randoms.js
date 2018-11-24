const request = require('request-promise')
const save_results = require('./save_results.js')
const secrets = require('./secrets.js')

async function main() {
    const size = 256
    const [ imgs, vectors, labels ] = await request({
        url: secrets.ganurl256+'/random',
        method: 'POST',
        json: true,
        form: { num: '24' }
    })
    await save_results({ imgs, vectors, labels, size })
    console.log('all done')
}

main().catch(e => {
    console.log(e)
    process.exit()
}).then(process.exit)
