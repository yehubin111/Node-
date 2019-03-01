var express = require('express');
var router = express.Router();
var superagent = require('superagent');
var cheerio = require('cheerio');
var path = require('path');
var fs = require('fs');
var ejs = require('ejs');
var nodemailer = require('nodemailer');
// 定时任务
var schedule = require('node-schedule');

class infoCatch {
  constructor() {
    this.HtmlData = {};
    this.OneUrl = "http://wufazhuce.com/";
    this.local = 'hangzhou';
    this.WeatherUrl = 'https://tianqi.moji.com/weather/china/zhejiang/' + this.local;

    this.initCatch();
  }

  initCatch() {
    return Promise.all([this.getOneData(), this.getWeatherData()]).then((data) => {
      // how long with
      let today = new Date();
      // let initDay = new Date(startDay);
      // let lastDay = Math.floor((today - initDay) / 1000 / 60 / 60 / 24);
      let todaystr =
        today.getFullYear() +
        " / " +
        (today.getMonth() + 1) +
        " / " +
        today.getDate();

      this.HtmlData["lastDay"] = today;
      this.HtmlData["date"] = {
        todaystr,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate()
      };

      this.HtmlData["todayOneData"] = data[0];
      this.HtmlData["weatherTip"] = data[1]['weatherTip'];
      this.HtmlData["threeDaysData"] = data[1]['threeDaysData'];

      return this.HtmlData;
    })
  }

  // 获取天气预报
  getWeatherData() {
    return new Promise((resolve, reject) => {
      superagent.get(this.WeatherUrl).end(function (err, res) {
        if (err) {
          reject(err);
        }
        let threeDaysData = [];
        let $ = cheerio.load(res.text);
        let weatherTip = $(".wea_tips").find("em").text();

        $(".forecast .days").each(function (i, elem) {
          const SingleDay = $(elem).find("li");
          threeDaysData.push({
            Day: $(SingleDay[0])
              .text()
              .replace(/(^\s*)|(\s*$)/g, ""),
            WeatherImgUrl: $(SingleDay[1])
              .find("img")
              .attr("src"),
            WeatherText: $(SingleDay[1])
              .text()
              .replace(/(^\s*)|(\s*$)/g, ""),
            Temperature: $(SingleDay[2])
              .text()
              .replace(/(^\s*)|(\s*$)/g, ""),
            WindDirection: $(SingleDay[3])
              .find("em")
              .text()
              .replace(/(^\s*)|(\s*$)/g, ""),
            WindLevel: $(SingleDay[3])
              .find("b")
              .text()
              .replace(/(^\s*)|(\s*$)/g, ""),
            Pollution: $(SingleDay[4])
              .text()
              .replace(/(^\s*)|(\s*$)/g, ""),
            PollutionLevel: $(SingleDay[4])
              .find("strong")
              .attr("class")
          });
        });
        resolve({ weatherTip, threeDaysData })
      });
    });
  }

  getOneData() {
    return new Promise((resolve, reject) => {
      superagent.get(this.OneUrl).end((err, rs) => {
        if (err) {
          reject(err);
        }
        let $ = cheerio.load(rs.text);
        let selectItem = $('#carousel-one .carousel-inner .item');
        let todayOne = selectItem[0]; //获取轮播图第一个页面，也就是当天更新的内容

        let data = {  //保存到一个json中
          imgUrl: $(todayOne).find('.fp-one-imagen').attr('src'),
          type: $(todayOne).find('.fp-one-imagen-footer').text().replace(/(^\s*)|(\s*$)/g, ""),
          text: $(todayOne).find('.fp-one-cita').text().replace(/(^\s*)|(\s*$)/g, "")
        };

        resolve(data);
      })
    })
  }
}

let info = new infoCatch();

function sendEmail(HtmlData) {
  let template = ejs.compile(
    fs.readFileSync(path.resolve(__dirname, "../views/email.ejs"), 'utf8')
  );
  let html = template(HtmlData);

  let transporter = nodemailer.createTransport({
    service: 'QQ',
    port: 465,
    secureConnection: true,
    auth: {
      user: '542084894@qq.com',
      pass: 'dyixopbmfadqbbed'
    }
  })
  let mailOptions = {
    from: 'yehubin <542084894@qq.com>',
    to: 'brian.ye@jollycorp.com',
    subject: '测试邮件',
    html: html
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('邮件发送成功 ID：', info.messageId);
  })
}

/**
 *  * * * * * *
 *  second(0-59)
 *  minute(0-59)
 *  hour(0-23)
 *  day of month(1-31)
 *  month(1-12)
 *  day of week(0-7)
 *  每分钟的第30秒触发： '30 * * * * *' dayOfWeek
 *  每小时的1分30秒触发 ：'30 1 * * * *' month
 *  每天的凌晨1点1分30秒触发 ：'30 1 1 * * *' dayOfMonth
 *  每月的1日1点1分30秒触发 ：'30 1 1 1 * *' hour
 *  2016年的1月1日1点1分30秒触发 ：'30 1 1 1 2016 *' minute
 *  每周1的1点1分30秒触发 ：'30 1 1 * * 1' second
 */
let timeJob;
function scheduleRun() {
  console.log('schedule start');
  let rule = new schedule.RecurrenceRule();
  rule.second = 30; // == 30 * * * * *
  timeJob = schedule.scheduleJob(rule, () => {
    console.log('schedule：' + new Date());
    info.initCatch().then((data) => {
      sendEmail(data);
    })
  })
}


/* GET home page. */
router.get('/', function (req, res, next) {
  if (!info.HtmlData['lastDay']) {
    info.initCatch().then((data) => {
      console.log('promise.all2');
      res.render('email', { title: 'Express', ...data });
    })
  } else {
    console.log('promise.all3');
    res.render('email', { title: 'Express', ...info.HtmlData });
  }
  // 启动定时任务，取消老的定时任务
  if (timeJob)
    timeJob.cancel();
  scheduleRun();
});



module.exports = router;
