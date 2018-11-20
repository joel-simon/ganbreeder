// Update with your config settings.
module.exports = {
    ganurl: "",
    database: {
        client: 'postgresql',
        connection: {
            host: "",
            database: '',
            user:     '',
            password: ''
        },
        pool: {
            min: 2,
            max: 20
        },
        migrations: {
            tableName: 'knex_migrations'
        }
    },
    aws: {
        accessKeyId: '',
        secretAccessKey: ''
    }
};
