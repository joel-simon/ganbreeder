
exports.up = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.timestamp('created_at').defaultTo(knex.fn.now())
    })
};

exports.down = function(knex, Promise) {
    return knex.schema.table('image', table => {
        table.dropColumn('created_at')
    })
};
