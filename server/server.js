const express = require('express')
const bodyParser = require('body-parser')
const request = require('request-promise')
const { Pool, Client } = require('pg')
const save_results = require('./save_results.js')
const port = process.argv[2] || 8888
const app = express()
const secrets= require('./secrets.js')
const knex = require('knex')(secrets.database)
const { performance } = require('perf_hooks')

const IMAGE_STATE = {
    INITIAL: 0,
    SELECTED: 1
}

app.use(express.static('public'))
app.use(bodyParser.json())
app.set('view engine', 'pug')
app.set('views', 'public')

app.get('/i', async (req, res) => {
    const key = req.query.k
    if (!key) return res.sendStatus(404)
    const { id, vector, label, parent1 } = await knex.from('image').where({ key }).first()
    let pkey = null
    if (parent1 != null) {
        let res = await knex.select('key').from('image').where({ id: parent1 }).first()
        pkey = res.key
    }
    res.render('image.pug', { key, pkey, vector, label })
})

app.get('/info', async (req, res) => {
    const key = req.query.k
    if (!key) return res.sendStatus(404)
    const { vector, label } = await knex.from('image').where({ key }).first()
    res.json({ vector, label })
})

app.get('/', async (req, res) => {
    try {
        /* PSQL random isnt perfect. Manually ensure a mix of evovled and raw images.
        */
        const q1 = 'select key from image where parent1 is null order by random() limit 7'
        const q2 = 'select key from image where stars>0 order by random() limit 5'
        const d1 = (await knex.raw(q1)).rows
        const d2 = (await knex.raw(q2)).rows
        const keys = d1.concat(d2).map(({ key }) => key)

        // Show off some numbers.
        let count = await knex('image').count('*').where({'state': 1})
            // whereRaw("created_at > current_timestamp - interval '2 day'")
        count = count[0].count
        res.render('random.pug', { keys, count })
    } catch(err) {
        console.log('Error: /', { err })
        return res.sendStatus(500)
    }
})

// app.get('/', (req, res) => res.redirect('/random'))

app.get('/starred', (req, res) => res.render('starred'))
app.get('/mix', (req, res) => res.render('mix'))

app.get('/latest', async (req, res) => {
    const page = req.query.page || 0
    try {
        const images = await knex.
            select('key', 'created_at').
            from('image').
            where({'state': IMAGE_STATE.SELECTED}).
            orderBy('created_at', 'desc').
            offset(48 * page).
            limit(48)

        res.render('latest.pug', { images, page, count })
    } catch(err) {
        console.log('Error: /latest', err)
        return res.sendStatus(500)
    }
})

app.post('/image_children', async (req, res) => {
    const key = req.body.key
    if (!key) return res.sendStatus(404)
    try {
        const { id, state, vector, label } = await knex.from('image').where({ key }).first()
        if (state == IMAGE_STATE.INITIAL) {
            const t = performance.now()
            const [ imgs, vectors, labels ] = await request({
                url: secrets.ganurl+'/children',
                method: 'POST',
                json: true,
                form: {
                    label: JSON.stringify(label),
                    vector: JSON.stringify(vector)
                }
            })
            console.log(`Made children in: ${performance.now() - t}`)
            await knex('image').where({ id }).update({ state: 1 })
            const children = await save_results({ imgs, vectors, labels, parent1: id })
            return res.json(children)
        } else if (state == 1) {
            const children = await knex.from('image').select('key').where({ parent1: id, parent2:null })
            if (children.length) {
                return res.json(children)
            }
            // Children are being processed, do not request more.
            return res.json([])
        }
    } catch(err) {
        console.log('Error: /image_children', err)
        return res.sendStatus(500)
    }
})

app.post('/mix_images', async (req, res) => {
    const key1 = req.body.key1
    const key2 = req.body.key2
    if (!key1 || !key2) return res.sendStatus(400)
    try {
        const image1 = await knex.from('image').where({ key:key1 }).first()
        const image2 = await knex.from('image').where({ key:key2 }).first()

        const [ imgs, vectors, labels ] = await request({
            url: secrets.ganurl+'/mix_images',
            method: 'POST',
            json: true,
            form: {
                label1: JSON.stringify(image1.label),
                label2: JSON.stringify(image2.label),
                vector1: JSON.stringify(image1.vector),
                vector2: JSON.stringify(image2.vector)
            }
        })
        const children = await save_results({ imgs, vectors, labels,
                                              parent1: image1.id,
                                              parent2: image2.id })
        return res.json(children)
    } catch(err) {
        console.log('Error: /mix', err)
        return res.sendStatus(500)
    }
})

app.post('/star', async (req, res) => {
    const key = req.body.key
    if (!key) return res.sendStatus(400)
    try {
        const { stars, id } = await knex.select('stars', 'id').from('image').where({ key }).first()
        await knex('image').update({stars: stars+1}).where({ id })
        res.sendStatus(200)
    } catch(err) {
        console.log('Error: /star', err)
        res.sendStatus(500)
    }
})

app.listen(port, () => console.log('Server running on', port))