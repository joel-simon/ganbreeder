const crypto = require('crypto')
const bucket = 'ganbreederpublic'
const AWS = require('aws-sdk')
const secrets = require('./secrets.js')
const knex = require('knex')(secrets.database)
AWS.config.update(secrets.aws)
const s3 = new AWS.S3()

const randomString = (n) => crypto.randomBytes(n).toString('hex')

module.exports = async function({ imgs, vectors, labels, parent1=null, parent2=null}) {
    const insert = []
    for (var i = 0; i < imgs.length; i++) {
        insert.push({
            parent1, parent2,
            key: randomString(12),
            label: labels[i],
            vector: vectors[i],
        })
    }
    const ids = await knex('image').insert(insert).returning('id')
    const uploads = []
    for (let i = 0; i < imgs.length; i++) {
        const buf = new Buffer(imgs[i].replace(/^data:image\/\w+;base64,/, ""),'base64')
        uploads.push(s3.upload({
            Bucket: bucket,
            Key: `imgs/${insert[i].key}.jpeg`,
            Body: buf,
            ACL: 'public-read',
            ContentEncoding: 'base64',
            ContentType: 'image/jpeg'
        }).promise())
    }
    await Promise.all(uploads)
    return insert.map(({ key }) => ({ key }))
}