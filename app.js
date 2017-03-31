'use strict';

const http = require('http');
const Bot = require('messenger-bot');
let db_query = require('./db');

let bot = new Bot({
    token: process.env.PAGE_TOKEN,
    verify: process.env.VERIFY_TOKEN,
    app_secret: process.env.APP_SECRET
});

bot.on('error', (err) => {
    console.log(err.message)
});

bot.on('message', (payload, reply) => {
    let text = payload.message.text;
    let user_id = payload.sender.id;
    if(text.indexOf("등록")>=0){
        db_query(1, user_id, function cb(err, exists) {
            if(err) reply({text: "오류가 발생했습니다. 다시 시도해 주시겠어요?"}, (err)=>{
                if(err) console.log(err);
            });
            else if(exists) reply({text: "이미 등록하셨습니다."}, (err)=>{
                if(err) console.log(err);
            });
            else reply({text: "등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err)=>{
                if(err) console.log(err)
            });
        });
    }else if(text.indexOf("해지")>=0){
        db_query(-1, user_id, function cb(err, exists) {
            if(err) reply({text: "오류가 발생했습니다. 다시 시도해 주시겠어요?"}, (err)=>{
                if(err) console.log(err);
            });
            else if(exists) reply({text: "해지되었습니다. 그동안 이용해 주셔서 감사합니다."}, (err)=>{
                if(err) console.log(err);
            });
            else reply({text: "음...등록하시지 않으셨는데요?"}, (err)=>{
                if(err) console.log(err)
            });
        });

    }
});

http.createServer(bot.middleware()).listen(process.env.PORT || 8080);
console.log('KSA meal bot subscription server running');