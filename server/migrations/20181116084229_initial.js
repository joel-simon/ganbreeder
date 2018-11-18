
exports.up = async function(knex, Promise) {
    return knex.schema
        .createTable('image', function(t) {
            t.increments('id').primary().notNullable()
            t.string('key').notNullable()
            t.integer('times_selected').unsigned().default(0).notNullable()
            t.specificType('label', 'float[1000]')
            t.specificType('vector', 'float[140]')

            t.integer('parent1')
            t.foreign('parent1').references('id').inTable('image')
            t.integer('parent2')
            t.foreign('parent2').references('id').inTable('image')
        })
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTableIfExists('image')
};
