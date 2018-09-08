'use strict';

const http = require('http');
const https = require('https');
const Bot = require('messenger-bot');
const time = require('time');
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
        else {
          let https = require('https');
          let data = '';
          let request = https.request({
            host: 'graph.facebook.com',
            path: `/v2.6/${payload.sender.id}?fields=first_name&access_token=${process.env.PAGE_TOKEN}`,
            method: 'GET',
            headers: {
              'Content-Type': "application/json"
            }
          }, (res) => {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
              data += chunk;
            });
            res.on('end', () => {
              let additional_greeting = '';
              data = JSON.parse(data);
              if (data.first_name) additional_greeting = `안녕하세요, ${data.first_name}님! `;
              reply({text: additional_greeting + "등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err) => {
                if (err) console.log(err);
              });
            });
            res.on('error', (err) => {
              console.log(err);
              reply({text: "등록해주셔서 감사합니다. 앞으로 급식/간식 정보를 보내드릴게요!"}, (err) => {
                if (err) console.log(err);
              });
            });
          });
          request.on('error', (err) => {
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
    } else {
      let requestedMeal = -1;
      if (text.indexOf('아침') >= 0 || text.indexOf('조식') >= 0) requestedMeal = 0;
      else if (text.indexOf('점심') >= 0 || text.indexOf('중식') >= 0) requestedMeal = 1;
      else if (text.indexOf('저녁') >= 0 || text.indexOf('석식') >= 0) requestedMeal = 2;
      else if (text.indexOf('간식') >= 0) requestedMeal = 4;
      else if (text.indexOf('급식') >= 0 || text.indexOf('밥') >= 0) requestedMeal = 3;
      if (requestedMeal >= 0) {
        let requestedDay = 0;
        if (text.indexOf('내일') >= 0) requestedDay = 1;

        let now = new time.Date();
        now.setTimezone("Asia/Seoul");
        const yyyy = now.getFullYear();
        const mm = now.getMonth() + 1;
        const dd = now.getDate();
        if (isLastDay(yyyy, mm, dd) && requestedDay === 1) {
          reply({text: "한 달의 마지막 날에는 다음날 급식을 잘 몰라요ㅠㅠ"}, (err) => {
            if (err) console.log(err);
          });
        }
        else if (requestedDay === 1 && requestedMeal === 4) {
          reply({text: "저는 오늘 간식만 알고 있어요...ㅎ"}, (err) => {
            if (err) console.log(err);
          });
        }
        else {
          let prefix = `${yyyy}/${mm}/${dd + requestedDay}`;
          if (requestedMeal === 4) replySnack(prefix, reply);
          else replyMeal(prefix, requestedMeal, requestedDay, reply);
        }
      }
    }
  } catch (exception) {
    console.log(exception);
    replyCute(reply);
  }
});

let meals = undefined;
let snack = undefined;

function getFromCore(type, callback) {
  let data = ""
  let req = https.request({
    host: "us-central1-meal-bot-core.cloudfunctions.net",
    path: "/meal-bot-core",
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST",
    agent: false
  }, function (res) {
    res.setEncoding("utf8")
    res.on("data", function (chunk) {
      data += chunk
      console.log("received chunk")
    })
    res.on("end", function () {
      callback(data)
    })
  })
  req.write(
    `{"type":"${type}"}`
  )
  req.on("error", (err) => {
    console.log(err)
  })
  req.end()
}

const mealTypeStr = ['조식', '중식', '석식', '급식'];

function isLastDay(yyyy, mm, dd) {
  if (yyyy % 4 === 0 && mm === 2) return dd === 29;
  if (mm === 2) return dd === 28;
  if ((mm < 8 && mm % 2 === 1) || (mm >= 8 && mm % 2 === 0)) return dd === 31;
  return dd === 30;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function replyCute(replyFunc) {
  let cuteList = ['꾸?', '꾸!', '헿', '힣'];
  replyFunc({text: cuteList[randInt(0, 4)]}, (err) => {
    if (err) console.log(err);
  });
}

function replyMeal(pre, type, day, replyFunc) {
  if (meals === undefined) {
    replyFunc({text: "학교 홈페이지에서 급식정보를 가져오는 중이에요! 잠시만 기다려주세요..."}, (err) => {
      console.log(err);
    });
    getFromCore("meal", (receivedMeals) => {
      meals = JSON.parse(receivedMeals);
      replyMeal(pre, type, day, replyFunc);
    });
  } else {
    let textToSend = pre;
    textToSend += ' ' + mealTypeStr[type] + '\n';
    if (type < 3) {
      if (meals[day][type] === "") {
        replyFunc({text: "학교 홈페이지에 급식이 업로드되지 않았어요...ㅠ"}, (err) => {
          if (err) console.log(err);
        });
        return;
      }
      else textToSend += meals[day][type];
    }
    else for (let i = 0; i < 3; i += 1) {
      textToSend += `\n[${mealTypeStr[i]}]\n`;
      if (meals[day][i] === "") {
        textToSend += `학교 홈페이지에 업로드되지 않았어요...ㅠ`
      }
      else textToSend += meals[day][i];
    }
    replyFunc({text: textToSend}, (err) => {
      if (err) console.log(err);
    });
  }
}

function replySnack(pre, replyFunc) {
  if (snack === undefined) {
    replyFunc({text: "가온누리에서 간식정보를 가져오는 중이에요! 잠시만 기다려주세요..."}, (err) => {
      if (err) console.log(err);
    });
    getFromCore("snack", (receivedSnack) => {
      snack = receivedSnack;
      replySnack(pre, replyFunc);
    });
  }
  else if (snack === "") {
    replyFunc({text: '가온누리에 간식 정보가 없었던 것 같은데...다시 한 번 찾아보고 올게요!'}, (err) => {
      if (err) console.log(err);
    });
    getFromCore("snack", (receivedSnack) => {
      snack = receivedSnack;
      let replyText;
      if (snack === "") replyText = '가온누리에 간식 정보가 없어요...ㅠ';
      else replyText = pre + ' 간식\n' + snack;
      replyFunc({text: replyText}, (err) => {
        if (err) console.log(err);
      });
    });
  } else replyFunc({text: pre + ' 간식\n' + snack}, (err) => {
    if (err) console.log(err);
  });
}

http.createServer(bot.middleware()).listen(process.env.PORT || 8080);
console.log('KSA meal bot subscription server running');