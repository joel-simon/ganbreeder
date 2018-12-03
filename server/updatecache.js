const secrets = require('./secrets.js')
const knex = require('knex')(secrets.database)
const fs = require('fs')

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}


async function main() {
    console.time('updatecache')
    const cache = {}

    const [ q1, q2, count ] = await Promise.all([
        knex.raw('select key from image where parent1 is null and size=256'),
        knex.raw('select key from image where stars>0 and size=256'),
        knex.raw('select count(*) from image where state=1')
    ])
    cache['raw'] = q1.rows.map(({ key }) => key)
    cache['starred'] = q2.rows.map(({ key }) => key)
    cache['count'] = parseInt(count.rows[0].count)
    console.log(cache['raw'].length)
    console.log(cache['starred'].length)
    shuffle(cache['raw'])
    shuffle(cache['starred'])
    console.timeEnd('updatecache')
    fs.writeFileSync('cache.json', JSON.stringify(cache), 'utf8')
}

main().catch(e => {
    console.log(e)
    process.exit()
}).then(process.exit)
