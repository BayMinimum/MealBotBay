'use strict';

const http = require('http');
const Bot = require('messenger-bot');
let db_query = require('./db');

let bot = new Bot({
    token: process.env.PAGE_TOKEN
});

bot.on('error', (err) => {
    console.log(err)
});

bot.on('message', (payload, reply) => {
    let text = payload.message.text;
    let user_id = payload.sender.id;
    console.log(`Command: ${text}`);
    try {
        if (text.indexOf("등록") >= 0) {
            console.log('Querying...');
            db_query(1, user_id, function cb(err, exists) {
                console.log('Reached callback!');
                if (err) reply({text: "오류가 발생했습니다. 다시 시도해 주시겠어요?"}, (err) => {
                    if (err) console.log(err);
                });
                else if (exists) reply({text: "이미 등록하셨습니다."}, (err) => {
                    if (err) console.log(err);
                });
                else{
                    let https = require('https');
                    let data = '';
                    let request = https.request({
                            host: 'graph.facebook.com',
                            path: `/v2.6/${payload.sender.id}?fields=first_name&access_token=${process.env.PAGE_TOKEN}`,
                            method: 'GET',
                            headers: {
                                'Content-Type': "application/json"
                            }
                        }, (res)=>{
                            res.setEncoding('utf8');
                            res.on('data', function (chunk) {
                                data += chunk;
                            });
                            res.on('end', ()=>{
                                let additional_greeting = '';
                                data = JSON.parse(data);
                                if(data.first_name) additional_greeting = `안녕하세요, ${data.first_name}님! `;
                                reply({text: additional_greeting+"등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err) => {
                                        if (err) console.log(err);
                                });
                            });
                            res.on('error', (err)=>{
                                console.log(err);
                                reply({text: "등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err) => {
                                    if (err) console.log(err);
                                });
                            });
                    });
                    request.on('error', (err)=>{
                        console.log(err);
                        reply({text: "등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err) => {
                            if (err) console.log(err);
                        });
                    });
                    request.end();
                }
            });
        } else if (text.indexOf("해지") >= 0) {
            db_query(-1, user_id, function cb(err, exists) {
                if (err) reply({text: "오류가 발생했습니다. 다시 시도해 주시겠어요?"}, (err) => {
                    if (err) console.log(err);
                });
                else if (exists) reply({text: "해지되었습니다. 그동안 이용해 주셔서 감사합니다."}, (err) => {
                    if (err) console.log(err);
                });
                else reply({text: "음...등록하시지 않으셨는데요?"}, (err) => {
                    if (err) console.log(err)
                });
            });

        }
    }catch (exception){
        console.log(exception);
        reply({text: "꾸?"}, (err) => {
            if (err) console.log(err);
        });
    }
});

http.createServer(bot.middleware()).listen(process.env.PORT || 8080);
console.log('KSA meal bot subscription server running');