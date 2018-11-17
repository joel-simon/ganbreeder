
exports.up = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.integer('state').default(0).notNullable()
    })
}

exports.down = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.dropColumn('state')
    })
}
