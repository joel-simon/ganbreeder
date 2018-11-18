
exports.up = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.integer('stars').default(0).notNullable()
    })
}

exports.down = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.dropColumn('stars')
    })
}
