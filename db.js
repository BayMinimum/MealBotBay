module.exports=function db(action, user_id, callback) {
    'use strict';
    let pg = require('pg');
    console.log('Reached db func');
    pg.defaults.ssl = true;

    let client = new pg.Client(process.env.DATABASE_URL);

    client.connect(function (err) {
        if (err) {
            console.log('Error connecting to messenger id DB, retrying');
            console.log(err);

            setTimeout(()=>{db(action, user_id, callback)}, 100);
            return;
        }
        console.log('Connected to postgres!');
        client.query('create table if not exists id_table (key serial primary key, messenger_id VARCHAR(128) UNIQUE NOT NULL);', function (err, res) {
            if(err) console.log(err);
            console.log('Reached create_table');
            client.query(`select messenger_id from id_table where messenger_id=\'${user_id}\';`, function (err, res) {
                let exists=true;
                console.log(res);
                if(res === undefined || res.rowCount===0){
                    exists=false;
                }
                if(action===1 && !exists){
                    client.query(`INSERT INTO id_table (messenger_id) VALUES(\'${user_id}\');`, (err, res)=>{
                        if(err) {
                            console.log("Err on insert!");
                            console.log(err);
                            callback(err, undefined);
                            client.end((err)=>{
                                if(err) console.log(err);
                            });
                        }else{
                            console.log(res);
                            callback(false, false);
                        }
                    });
                }else if(action===-1 && exists){
                    client.query(`DELETE FROM id_table WHERE messenger_id=\'${user_id}\'`, (err, res)=>{
                        if(err) {
                            console.log("Err on delete!");
                            console.log(err);
                            callback(err, undefined);
                            client.end((err)=>{
                                if(err) console.log(err);
                            });
                        }else{
                            console.log(res);
                            callback(false, true);
                        }
                    });
                }else{
                    callback(false, exists);
                    client.end((err)=>{
                        if(err) console.log(err);
                    })
                }
                client.end();

            });

        });
        client.on('end', ()=>{
            console.log('Client end!');
            client.removeAllListeners('error');
            client.removeAllListeners('end');
        });
    });
    pg.on('error', (err)=>{
        console.log(err);
    })

};