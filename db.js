module.exports=function db(action, user_id, callback) {

    let pg = require('pg');

    pg.defaults.ssl = true;
    pg.connect(process.env.DATABASE_URL, function (err, client) {
        if (err) {
            console.log('Error connecting to messenger id DB, retrying');
            console.log(err);
            return db(callback);
        }
        console.log('Connected to postgres! Getting schemas...');

        client
            .query(`select exists (select messenger_id from bay_schema.id_table where messenger_id=\'${user_id}\');`, function (err, res) {
                let exists=true;
                if(res == undefined){
                    exists=false;
                }
                if(action==1 && !exists){
                    client.query(`INSERT INTO bay_schema.id_table values(\'${user_id}\');`, [], (err, res)=>{
                        if(err) {
                            console.log(err);
                            callback(err, undefined);
                            client.end((err)=>{
                                console.log(err);
                            });
                        }else{
                            callback(false, false);
                        }
                    });
                }else if(action==-1 && exists){
                    client.query(`DELETE FROM bay_schema.id_table WHERE messenger_id=${user_id}`, [], (err, res)=>{
                        if(err) {
                            console.log(err);
                            callback(err, undefined);
                            client.end((err)=>{
                                console.log(err);
                            });
                        }else{
                            callback(false, true);
                        }
                    });
                }else callback(false, exists);

                client.end((err)=>{
                    console.log(err);
                })

            });
    });

};