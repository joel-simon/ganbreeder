
exports.up = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.integer('size').default(128).notNullable()
    })
}

exports.down = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.dropColumn('size')
    })
}
