// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v4.8.3

// Main File
import script from "./data/datapoint/point/script";
import packet from "./data/course/packets";
import * as schedule from 'node-schedule';
import { confirmationChat, supportChat, devChat, versionBot, eugeneChat } from './data/datapoint/point/chats';
import { CheckException } from "./base/handlers/check";
import arch from './base/main/architecture';
import getCourses, { Course, Courses, courseNumbersToSkip } from "./data/course/coursesAndTopics";
import Key from "./base/handlersdb/changeKeyValue";
import Role, { ConvertRole } from "./base/handlersdb/changeRoleValue";
import keyboards from "./base/handlers/keyboards";
import { inlineApprovePayment, inlineAcceptTrialPayment, inlineAcceptPacketPayment, inlineAcceptClubWithPacketPayment } from "./data/datapoint/function/paymentButtons";
import formattedName from "./data/datapoint/function/nameFormatt";
import MongoDBReturnType from "./data/datapoint/point/mongoDBType";
import { Markup } from "telegraf";
import axios from "axios";
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { userInfo } from "os";

async function main() {
  const [ onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, db, app, token, dbProcess ] = await arch();

  app.post('/api/sendToTelegram', async (req: Request, res: Response) => {
    try {
      const {
        'Ваше імʼя': UserName,
        'Ваш телефон': PhoneNumber,
        'Нік в телеграмі': TGUserName,
        'Email': Email,
        'Рівень': Level,
        'Час занять': LessonTime,
        'День занять': LessonDay,
        'Date': Date,
        'Time': Time
      } = req.body;

      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: confirmationChat,
        text: script.apiReport(UserName, PhoneNumber, TGUserName, Email, Level, LessonTime, LessonDay, Date, Time),
        parse_mode: "HTML"
      });

      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: supportChat,
        text: script.apiReport(UserName, PhoneNumber, TGUserName, Email, Level, LessonTime, LessonDay, Date, Time),
        parse_mode: "HTML"
      });

      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: devChat,
        text: script.apiReport(UserName, PhoneNumber, TGUserName, Email, Level, LessonTime, LessonDay, Date, Time),
        parse_mode: "HTML"
      });
      
      console.log("\n\nNew Request For API was sent\n\n");
      res.status(200).json({ message: 'Message successfully sent to Telegram' });
    } catch (error) {
      console.error('Error, detail:', error);
      res.status(500).json({ error: 'Error to Sent message, Check Console for Detail' });
    }
  });

  //Begin bot work, collecting user data (his telegram name) set up state_1
  bot.start( (ctx) => {
    console.log('STARTED');
    ctx.reply(script.entire.greeting, {reply_markup: { remove_keyboard: true }});

    const username = ctx.chat.type === "private" ? ctx.chat.username ?? null : null;
    db.set(ctx.chat.id)('username')(username ?? 'unknown')
    db.set(ctx.chat.id)('state')('WaitingForName')

  });
  
  bot.command('menu', async (ctx) => {
    console.log('menu tapped');
    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    ctx.reply(script.entire.chooseFunction, {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
      }
    })

    await set('state')('FunctionRoot');
  });

  schedule.scheduleJob('0 */2 * * *', async () => {
    await dbProcess.DeleteExpiredClubs();
  });

  //Get real user name and root to get phone number with this.function
  onTextMessage('WaitingForName', async (ctx, user, data) => {
    if (CheckException.TextException(data)){
      const name = formattedName(data.text),
        set = db.set(ctx?.chat?.id ?? -1);
      
      console.log(`Name: ${name}`)
      await set('state')('AskingForPhoneNumber');
  
      await set('name')(name);
  
      ctx.reply(script.entire.niceNameAndGetPhone(name), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.entire.shareYourPhone,
                request_contact: true,
              },
            ],
          ],
        },
      });
      await set('state')('AskingForPhoneNumber')
    }
    else{
      ctx.reply(script.errorException.nameGettingError);
    }
  })

  //Get user phone number with using funciion of getting
  onContactMessage('AskingForPhoneNumber', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.greeting, {reply_markup: { remove_keyboard: true }});
      await set('state')('WaitingForName');
    }
    else if (!CheckException.PhoneException(data)){
      ctx.reply(script.errorException.phoneGettingError.defaultException, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.entire.shareYourPhone,
                request_contact: true,
              },
            ],
          ],
        },
      });
    }
    else{
      set('phone_number')(data.phone_number);

      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

      if (userObject){
        await dbProcess.UpdateUserData(userObject._id, user['name'], data.phone_number, user['username']);
      }
      else dbProcess.AddUser({ id: ctx?.chat?.id ?? -1, name: user['name'], number: data.phone_number, username: user['username'], role: 'student', count: 0 });

      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject!.role)
        }
      })


      await set('state')('FunctionRoot');
    }
  });

  onTextMessage('FunctionRoot', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    await set('sc_request_torecord_usertoclub')('');

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.niceNameAndGetPhone(user['name']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.entire.shareYourPhone,
                request_contact: true,
              },
            ],
          ],
        },
      });
      await set('state')('AskingForPhoneNumber');
    }
    else if (data.text === 'Індивідуальні заняття'){
      ctx.reply('text', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu()
        }
      })

      await set('state')('IndividualHandler');
    }
    else if (data.text === "Вчитель на годину"){
      ctx.reply(script.teacherOnHour.whatsTheProblem, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      });
      await set('state')('ChoosingCourses');
    }
    else if (data.text === "Шпрах-Клуби"){
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        line = user!.haveTrialLessonClub;
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(line)
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (data.text === "Адмін Панель"){
      ctx.reply("З поверненням, Меркель! :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Шпрах-Клуби"
              },
              {
                text: "Особові справи студентів"
              }
            ],[
              {
                text: "В МЕНЮ"
              }
            ]
          ],
        },
      })

      await set('state')('AdminRootHandler');
    }
    else if (data.text === 'Для Викладача'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();

      let addString = '';

      for (let i = 0; i < results.length; i++){
        if (results[i].teacher_id === ctx?.chat?.id ?? -1){
          let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
          for (let j = 0; j < users.length; j++) {
            if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
              userHaved += `- ${users[j].name} (@${users[j].username})\n📲${users[j].number}\n\n`;
            }
          }
            if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
              userHaved = '';
            }
            if (results[i].count > 0) {
              addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
            } else {
              addString = `❌ немає вільних місць ❌`;
            }
  
          await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString, userHaved), {
            parse_mode: "HTML"
          });
        }
      }
    }
    else{
      ctx.reply(script.errorException.chooseFunctionError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        },
      });
    }
  })

  onTextMessage('IndividualHandler', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === "Пробний урок"){
      ctx.reply(script.trialLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('GraphicRespondAndLevelRequest');
    }
    else if (data.text === "Оплата занять"){
      ctx.reply(script.payInvidualLesson.chooseLevelCourse, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.chooseLevelCourses()
        },
      });
      await set('state')('RespondCourseAndGetPacket');
    }
    else if (data.text === "Запис на заняття"){
      ctx.reply(script.registrationLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('_GraphicRespondAndLevelRequest');
    }
    else if (data.text === 'В МЕНЮ'){
      console.log('FunctionRoot');
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })
      await set('state')('FunctionRoot');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu()
        }
      })
    }
  })

  onTextMessage('GraphicRespondAndLevelRequest', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)) {
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })
      await set('state')('FunctionRoot'); 
    }
    else if (CheckException.TextException(data)){
      await set('graphic')(data.text);
      ctx.reply(script.trialLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('LevelRespondAndRequestQuestions');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('LevelRespondAndRequestQuestions', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.trialLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('GraphicRespondAndLevelRequest')
    }
    else if (CheckException.TextException(data)){
      await set('languagelevel')(data.text);
  
      ctx.reply(script.trialLesson.thanksAndGetQuestion(user['name']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так, є",
              },
            ],[
              {
                text: "ні, немає",
              }
            ],
          ],
        },
      });
      await set('state')('TrialLessonQuestionsManager');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('TrialLessonQuestionsManager', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.trialLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('LevelRespondAndRequestQuestions');
    }
    else if (data.text === 'так, є'){
      await set('addquesttrial')('');
      ctx.reply(script.trialLesson.question, {reply_markup: {remove_keyboard: true}});
      await set('state')('GetQuestionsAndSendData');
    }
    else if (data.text === 'ні, немає'){
      const id = ctx?.chat?.id ?? -1,
        set = db.set(id),
        date : Date = new Date(),
        monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
        dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
        formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`;

      await set('addquesttrial')(data.text);

      // For Developer
      // ctx.telegram.sendMessage(devChat,
      //   script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
      //   {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(confirmationChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(supportChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(eugeneChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'})

      ctx.reply(script.trialLesson.thanksPartTwo(user['graphic']), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              },
              // {
              //   text: '？Про Бота'
              // }
            ]
          ]
        }
      })

      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так, є",
              },
            ],[
              {
                text: "ні, немає",
              },
            ],
          ],
        }
      })
    }
  })

  onTextMessage('GetQuestionsAndSendData', async(ctx, user, data) => {
    const id = ctx?.chat?.id ?? -1,
      set = db.set(id),
      date : Date = new Date(),
      monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
      dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
      formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`;

    if (CheckException.BackRoot(data)){
      ctx.reply(script.trialLesson.thanksAndGetQuestion(user['name']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так, є",
              },
              {
                text: "ні, не має",
              },
            ],
          ],
        },
      });
      await set('state')('TrialLessonQuestionsManager')
    }
    else if (CheckException.TextException(data)){
      await set('addquesttrial')(user['addquesttrial'] ?? data.text);
  
      // For Developer
      // ctx.telegram.sendMessage(devChat, 
      //   script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
      //   {parse_mode: 'HTML'}
      // )
  
      ctx.telegram.sendMessage(confirmationChat, 
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'}
      )
  
      ctx.telegram.sendMessage(supportChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'}
      )

      ctx.telegram.sendMessage(eugeneChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'}
      )
  
      ctx.reply(script.trialLesson.thanksPartTwo(user['graphic']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ",
              },
              // {
              //   text: '？Про Бота'
              // }
            ],
          ],
        },
      })
  
      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('EndRootManager', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);
    console.log('User go to end manager');

    if (data.text === 'Замовити ще одну зустріч'){
      console.log('User Choose more meet')
      ctx.reply(script.teacherOnHour.whatsTheProblem, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      });
      await set('state')('ChoosingCourses');
    } 
    else if (data.text === 'В МЕНЮ'){
      console.log('FunctionRoot');
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })
      await set('state')('FunctionRoot');
    }
    else if (data.text === 'Назад до реєстрації'){
      const results = await dbProcess.ShowAll();
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
          if (results[i].count > 0) {
            addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString), {
          parse_mode: "HTML"
        });
      }

      await ctx.reply('виберіть номер шпраха для запису:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('GetClubToRegistrationAndCheckPayment');
    }
    else if (data.text === 'sysinfo'){
      ctx.reply(script.about(versionBot), {
        parse_mode: 'HTML',
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'В МЕНЮ'
              }
            ]
          ]
        }
      })
    }
    else{
      ctx.reply(script.errorException.chooseMenuButtonError, {
        parse_mode: 'HTML',
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'В МЕНЮ'
              }
            ]
          ]
        }
      })
    }
  })

  onTextMessage('RespondCourseAndGetPacket', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    
    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })
      await set('state')('FunctionRoot');
    }
    else if (data.text === 'Рівень С1-С2' || data.text === 'Рівень В1-В2' || data.text === 'Рівень А1-А2'){
      const showLevel = packet[data.text as keyof typeof packet];
  
      await set('courseLevel')(data.text);
  
      ctx.reply(script.payInvidualLesson.choosePacket(showLevel['🔵']['price'], showLevel['🔴']['price'], showLevel['🟢']['price'], showLevel['🟡']['price']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "🔵",
              },
              {
                text: "🔴",
              },
            ],
            [
              {
                text: "🟢",
              },
              {
                text: "🟡",
              }
            ],
          ],
        },
      });
  
      await set('state')('RespondPacketAndGetPayment');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.chooseLevelCourses()
        },
      })
    }
  })

  onTextMessage('RespondPacketAndGetPayment', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.payInvidualLesson.chooseLevelCourse, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.chooseLevelCourses()
        },
      });

      await set('state')('RespondCourseAndGetPacket');
    }
    else if (data.text === '🟡' || data.text === '🟢' || data.text === '🔴' || data.text === '🔵'){
      const answer = data.text,
      showPacket = packet[user['courseLevel'] as keyof typeof packet][answer];

      await set('choosedPacketColor')(answer);
  
      await set('choosedPacket')(`${user['courseLevel']}, ${showPacket.name} (${showPacket.countOfLessons} занять) - ${showPacket.price}`);
  
      await ctx.reply(script.payInvidualLesson.statsAboutChoosedPacket(showPacket.name, showPacket.price, showPacket.countOfLessons))
      await ctx.reply(script.payInvidualLesson.payment.require);
      await ctx.reply(script.payInvidualLesson.payment.proofRequest, {reply_markup: {remove_keyboard: true}
      });
      await set('state')('RespondPaymentAndSendData');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "🔵",
              },
              {
                text: "🔴",
              },
            ],
            [
              {
                text: "🟢",
              },
              {
                text: "🟡",
              }
            ],
          ],
        },
      })
    }
  })

  onPhotoMessage('RespondPaymentAndSendData', async(ctx, user, data) => {
    const id = ctx?.chat?.id ?? -1,
      set = db.set(id),
      get = db.get(id);
    await set('paymentStatus')('unknown');

    // Оплата занять

    if (CheckException.BackRoot(data)){
      const showLevel = packet[data.text as keyof typeof packet];

      ctx.reply(script.payInvidualLesson.choosePacket(showLevel['🔵']['price'], showLevel['🔴']['price'], showLevel['🟢']['price'], showLevel['🟡']['price']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "🔵",
              },
              {
                text: "🔴",
              },
            ],
            [
              {
                text: "🟢",
              },
              {
                text: "🟡",
              }
            ],
          ],
        },
      });
  
      await set('state')('RespondPacketAndGetPayment');
    }
    else if (CheckException.PhotoException(data)){
      const paymentStatus: string = await get('paymentStatus') ?? 'unknown',
        name = get("name") ?? "учень",
        date : Date = new Date(),
        monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
        dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
        formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`,
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.photo;
  
      // For Developer
      // ctx.telegram.sendPhoto(devChat, unique_file_id, {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord), 
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendPhoto(confirmationChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord), 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendPhoto(supportChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendPhoto(eugeneChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.reply(script.payInvidualLesson.endWork(await name ?? "учень"), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'В МЕНЮ',
              },
              // {
              //   text: '？Про Бота'
              // }
            ],
          ],
        },
      });

      set('state')('EndRootManager')
    }
    else if (CheckException.FileException(data)){
      const paymentStatus: string = await get('paymentStatus') ?? 'unknown',
        name = get("name") ?? "учень",
        date : Date = new Date(),
        monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
        dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
        formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`,
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.file;
  
      // For Developer
      // ctx.telegram.sendDocument(devChat, unique_file_id, {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord), 
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendDocument(confirmationChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord), 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendDocument(supportChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendDocument(eugeneChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], formattedDateRecord),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.reply(script.payInvidualLesson.endWork(await name ?? "учень"), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'В МЕНЮ',
              },
              // {
              //   text: '？Про Бота'
              // }
            ],
          ],
        },
      });

      set('state')('EndRootManager')
    }
    else{
      ctx.reply(script.errorException.paymentGettingError);
    }
  })

  //
  onTextMessage('HaveAdditionalQuestion', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.teacherOnHour.additionalQuestions.question, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.teacherOnHour.additionalQuestions.yes,
              },
              {
                text: script.teacherOnHour.additionalQuestions.no,
              }
            ],
          ],
        },
      });
  
      await set('state')('AnswerForAdditionalQuestions');
    }
    else if (CheckException.TextException(data)){
      set('question')(data.text);
      await ctx.reply(script.teacherOnHour.payment.thanks);
      await ctx.reply(script.teacherOnHour.payment.sendPics, {reply_markup: { remove_keyboard: true }});
      await set('state')('WaitingForPayment')
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('AnswerForAdditionalQuestions', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      const courses = getCourses(user['course'] as Courses);
      set('course')(user['course']);
  
      console.log('Courses\n' + user['course']);
      console.log(courses);
  
      //skiping process
      const keyboard = courses.map((el: Course, idx) => {
        const displayedIndex : number = idx + 1;
        if (courseNumbersToSkip[user['course']].includes(displayedIndex)) return null;
        return [{ text: `${displayedIndex}. ${el}` }];
      }).filter(buttons => buttons !== null);
  
      ctx.reply(script.teacherOnHour.whatLecture, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard.map(buttons => buttons || []),
        },
      });
      await set('state')("AdditionalQuestions");
    }
    else if (data.text === script.teacherOnHour.additionalQuestions.yes) {
      ctx.reply(script.teacherOnHour.additionalQuestions.ifYes, {reply_markup: {remove_keyboard: true}});
      await set('state')("HaveAdditionalQuestion");
    } 
    else if (data.text === script.teacherOnHour.additionalQuestions.no) {
      await ctx.reply(script.teacherOnHour.payment.thanks);
      await ctx.reply(script.teacherOnHour.payment.sendPics,  {reply_markup: {remove_keyboard: true}});
      await set('question')('немає');
      await set('state')("WaitingForPayment");
    }
    else {
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.teacherOnHour.additionalQuestions.yes,
              },
              {
                text: script.teacherOnHour.additionalQuestions.no,
              }
            ],
          ],
        },
      });
    }
  })

  onTextMessage('AdditionalQuestions', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.teacherOnHour.whatsTheProblem, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      });

      await set('state')('ChoosingCourses');
    }
    else if (getCourses(user['course'] as Courses).some((item) => data.text.includes(item))){
      set('lecture')(data.text);
      ctx.reply(script.teacherOnHour.additionalQuestions.question, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.teacherOnHour.additionalQuestions.yes,
              },
              {
                text: script.teacherOnHour.additionalQuestions.no,
              }
            ],
          ],
        },
      });
  
      await set('state')('AnswerForAdditionalQuestions');
    }
    else{
      const courses = getCourses(user['course'] as Courses);
  
      //skiping process
      const keyboard = courses.map((el: Course, idx) => {
        const displayedIndex : number = idx + 1;
        if (courseNumbersToSkip[user['course']].includes(displayedIndex)) return null;
        return [{ text: `${displayedIndex}. ${el}` }];
      }).filter(buttons => buttons !== null);

      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard.map(buttons => buttons || []),
        },
      })
    }
  })

  onTextMessage('ChoosingCourses', async (ctx, user, data) => {

    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        line = user!.haveTrialLessonClub;
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(line)
        }
      })
      await set('state')('FunctionRoot');
    }
    else if (data.text === 'A1.1' || data.text === 'A1.2' || data.text === 'A2.1' || data.text === 'A2.2'){
      const courses = getCourses(data.text as Courses);
      set('course')(data.text);
  
      console.log('Courses\n' + data.text);
      console.log(courses);
  
      //skiping process
      const keyboard = courses.map((el: Course, idx) => {
        const displayedIndex : number = idx + 1;
        if (courseNumbersToSkip[data.text].includes(displayedIndex)) return null;
        return [{ text: `${displayedIndex}. ${el}` }];
      }).filter(buttons => buttons !== null);
  
      ctx.reply(script.teacherOnHour.whatLecture, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard.map(buttons => buttons || []),
        },
      });
      await set('state')("AdditionalQuestions");
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      })
    }
  })

  onPhotoMessage('WaitingForPayment', async (ctx, user, data) => {
    const id = ctx?.chat?.id ?? -1,
      set = db.set(id),
      get = db.get(id);

    // Вчитель на годину

    if (CheckException.BackRoot(data)){
      ctx.reply(script.teacherOnHour.additionalQuestions.question, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: script.teacherOnHour.additionalQuestions.yes,
              },
              {
                text: script.teacherOnHour.additionalQuestions.no,
              }
            ],
          ],
        },
      });
      await set('state')('HaveAdditionalQuestion');
    }
    else if (CheckException.PhotoException(data)){
      await set('paymentStatus')('unknown');
      const paymentStatus: string = await get('paymentStatus') ?? 'unknown',
        name = get("name") ?? "учень",
        date : Date = new Date(),
        monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
        dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
        formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`;
  
      const inline = inlineApprovePayment(id, paymentStatus);
  
      const unique_file_id = data.photo;
      
      // For Developer
      // ctx.telegram.sendPhoto(devChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML', 
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendPhoto(confirmationChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendPhoto(supportChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendPhoto(eugeneChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.reply(script.teacherOnHour.payment.paymentSent(await name ?? 'учень'));
      ctx.reply(script.teacherOnHour.payment.waitForContact, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'Замовити ще одну зустріч',
              },
            ],[
              {
                text: 'В МЕНЮ',
              },
              // {
              //   text: '？Про Бота'
              // }
            ],
          ],
        },
      });
  
      set('state')('EndRootManager');
    }
    else if (CheckException.FileException(data)){
      await set('paymentStatus')('unknown');
      const paymentStatus: string = await get('paymentStatus') ?? 'unknown',
        name = get("name") ?? "учень",
        date : Date = new Date(),
        monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
        dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
        formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`;
  
      const inline = inlineApprovePayment(id, paymentStatus);
  
      const unique_file_id = data.file;
      
      // For Developer
      // ctx.telegram.sendDocument(devChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML', 
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendDocument(confirmationChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendDocument(supportChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendDocument(eugeneChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.reply(script.teacherOnHour.payment.paymentSent(await name ?? 'учень'));
      ctx.reply(script.teacherOnHour.payment.waitForContact, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'Замовити ще одну зустріч',
              },
            ],[
              {
                text: 'В МЕНЮ',
              },
              // {
              //   text: '？Про Бота'
              // }
            ],
          ],
        },
      });
  
      set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.paymentGettingError, {reply_markup: {remove_keyboard: true}});
    }
  })

  onTextMessage('_GraphicRespondAndLevelRequest', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
      }
    })
    await set('state')('FunctionRoot');
    }
    else if (CheckException.TextException(data)){
      await set('_graphic')(data.text);
  
      ctx.reply(script.registrationLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('_LevelRespondAndRequestQuestions');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('_LevelRespondAndRequestQuestions', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.registrationLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('_GraphicRespondAndLevelRequest');
    }
    else if (CheckException.TextException(data)){
      await set('_languagelevel')(data.text);
  
      await ctx.reply(script.registrationLesson.thanks(user['name'], user['_graphic']));
      await set('state')('_GetQuestionsAndSendData');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('_GetQuestionsAndSendData', async(ctx, user, data) => {
    const id = ctx?.chat?.id ?? -1,
      set = db.set(id),
      date : Date = new Date(),
      monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
      dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
      formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`;

    if (CheckException.BackRoot(data)){
      ctx.reply(script.registrationLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('_LevelRespondAndRequestQuestions');
    }
    else if (CheckException.TextException(data)){
      await set('_addquesttrial')(data.text);
      
      // For Developer
      // ctx.telegram.sendMessage(devChat,
      //   script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, formattedDateRecord),
      //   { parse_mode: 'HTML' });
  
      ctx.telegram.sendMessage(confirmationChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, formattedDateRecord),
        { parse_mode: 'HTML' });
  
      ctx.telegram.sendMessage(supportChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, formattedDateRecord),
        { parse_mode: 'HTML' });

      ctx.telegram.sendMessage(eugeneChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, formattedDateRecord),
        { parse_mode: 'HTML' });
  
      ctx.reply(script.registrationLesson.end, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ",
              },
              // {
              //   text: '？Про Бота'
              // }
            ],
          ],
        },
      })
  
      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  // Club Handler
  onTextMessage('ActionClubRespondAndRootAction', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      userA = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userA!.role),
        },
      });
    }
    else if (data.text === 'Пробне заняття'){
      if (userA!.role !== 'teacher'){
        ctx.reply(script.speakingClub.trialLesson.entire, {
          parse_mode: "HTML",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: "так"
                },
                {
                  text: "ні"
                }
              ]
            ],
          },
        })
  
        await set('state')('RespondChooseAndRespondGetLesson');
      }
      else{
        ctx.reply('викладачі не можуть брати пробне заняття');
      }
    }
    else if (data.text === 'Реєстрація на клуб'){
      if (userA!.role !== 'teacher'){
        const results = await dbProcess.ShowAll();
        let addString : string = '';
      
        for (let i = 0; i < results.length; i++) {
            if (results[i].count > 0) {
              addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
            } else {
              addString = `❌ немає вільних місць ❌`;
            }
  
          await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString), {
            parse_mode: "HTML"
          });
        }
  
        await ctx.reply('виберіть номер шпраха для запису:', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
              return [{ text: `${index + 1}` }];
            })
          }
        })
  
        await set('state')('GetClubToRegistrationAndCheckPayment');
      }
      else{
        ctx.reply('викладачі не можуть записатись.')
      }
    }
    else if (data.text === 'Залишок моїх занять'){
      if (userA!.role !== 'teacher'){
        if (userA!.count > 0){
          ctx.reply(script.speakingClub.lessLessons(userA!.count), {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [
                [
                  {
                    text: "В МЕНЮ"
                  },
                ]
              ],
            },
          });
          await set('state')('EndRootManager');
        }
        else{
          ctx.reply(script.speakingClub.lessLessons(userA!.count), {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [
                [
                  {
                    text: "так"
                  },
                  {
                    text: "ні"
                  }
                ]
              ],
            },
          });
          await set('state')('RespondCheckLessonsAndGetLessons');
        }
      }
      else{
        ctx.reply('викладач немає занять');
      }
    }
    else if (data.text === 'Оплатити пакет занять'){
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      if (user!.role !== 'teacher'){
        ctx.reply(script.speakingClub.payPacketLesson, {
          parse_mode: "HTML",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: "Шпрах-Клуб"
                },
                {
                  text: "Шпрах-Клуб+PLUS"
                }
              ]
            ],
          },
        });
        await set('state')('RespondTypePacketAndGetPayment');
      }
      else{
        ctx.reply('викладачі не можуть оплачувати заняття.')
      }
    }
    else if (data.text === 'Про шпрах-клаб'){
      ctx.reply(script.speakingClub.about, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              },
            ]
          ],
        },
      })

      await set('state')('EndRootManager');
    }
    else{
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        line = user!.haveTrialLessonClub;
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(line)
        },
      });
    }
  })

  // Club Trial Lesson Handler (start)
  onTextMessage('RespondChooseAndRespondGetLesson', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Пробне заняття"
              },
              {
                text: "Реєстрація на клуб"
              }
            ],[
              {
                text: "Залишок моїх занять"
              },
              {
                text: "Оплатити пакет занять"
              }
            ],[
              {
                text: "Про шпрах-клаб"
              }
            ]
          ],
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (data.text === 'так'){
      await ctx.reply(script.speakingClub.trialLesson.ifYes)
      const results = await dbProcess.ShowAll(),
        keyboard = results.map(result => result._id).map((value : ObjectId, index : number) => {
          return [{ text: `${index + 1}` }];
        });
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
          if (results[i].count > 0) {
            addString = `кількість доступних місць: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboard
          }
        });
      }

      await set('state')('RespondTrialClubAndCheckPayment');
    }
    else if (data.text === 'ні'){
      ctx.reply(script.speakingClub.trialLesson.ifNo, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              }
            ],
          ],
        },
      });

      await set('state')('EndRootManager');
    }
  })

  // Check count of lessons and pay more if it need
  onTextMessage('RespondCheckLessonsAndGetLessons', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'так'){
      ctx.reply(script.speakingClub.payPacketLesson, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Шпрах-Клуб"
              },
              {
                text: "Шпрах-Клуб+PLUS"
              }
            ]
          ],
        },
      });
      await set('state')('RespondTypePacketAndGetPayment');
    }
    else if (data.text === 'ні'){
      ctx.reply(script.speakingClub.trialLesson.ifNo, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              }
            ],
          ],
        },
      });

      await set('state')('EndRootManager');
    }
  })

  // Pay Club Type
  onTextMessage('RespondTypePacketAndGetPayment', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        line = user!.haveTrialLessonClub;
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(line)
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (data.text === 'Шпрах-Клуб'){
      ctx.reply(script.speakingClub.standartClub);
      await set('club-typeclub')(data.text);
      await set('state')('RespondPaymentAndGetCourseOrFinal');
    }
    else if (data.text === 'Шпрах-Клуб+PLUS'){
      ctx.reply(script.speakingClub.plusClub);
      await set('club-typeclub')(data.text);
      await set('state')('RespondPaymentAndGetCourseOrFinal');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Шпрах-Клуб"
              },
              {
                text: "Шпрах-Клуб+PLUS"
              }
            ]
          ],
        },
      })
    }
  })

  onPhotoMessage('RespondPaymentAndGetCourseOrFinal', async(ctx, user, data) => {
    const id = ctx?.chat?.id ?? -1,
      set = db.set(id),
      get = db.get(id),
      date : Date = new Date(),
      name = get("name") ?? "учень",
      monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
      dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate()),
      formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`,
      clubIndex = user['sc_request_torecord_usertoclub'];

    if (CheckException.PhotoException(data)){
      await set('paymentStatusClubOrPacket')('unknown');
      const paymentStatus = await get('paymentStatusClubOrPacket') ?? 'unknown';
  
      const unique_file_id = data.photo;
  
      if (user['club-typeclub'] === 'Шпрах-Клуб'){
        if (clubIndex !== ''){
          const inline = inlineAcceptClubWithPacketPayment(id, clubIndex, paymentStatus, 'standart');

          ctx.telegram.sendPhoto(devChat, unique_file_id, {
            parse_mode: "HTML",
            caption: 'ClubAndPacket',
            ...Markup.inlineKeyboard(inline)
          })
          
          //process for buttons ClubAndPacket
          // const currentClub = await dbProcess.ShowData(new ObjectId(user['sc_request_torecord_usertoclub']));
          // await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, new ObjectId(user['sc_request_torecord_usertoclub']));
          // await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
          // await set('sc_request_torecord_usertoclub')('');
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 'standart');
          ctx.telegram.sendPhoto(devChat, unique_file_id, {
            parse_mode: "HTML",
            caption: 'Packet',
            ...Markup.inlineKeyboard(inline)
          })
        }
        
        ctx.reply('Ваше замовлення прийнято, очікуйте на підтвердження', {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'В МЕНЮ',
                },
                {
                  text: "Назад до реєстрації"
                }
                // {
                //   text: '？Про Бота'
                // }
              ],
            ],
          },
        })

        // ctx.reply(script.speakingClub.thanksType.typeStandart(user['name']), {
        //   parse_mode: "Markdown",
        //   reply_markup: {
        //     one_time_keyboard: true,
        //     keyboard: [
        //       [
        //         {
        //           text: 'В МЕНЮ',
        //         },
        //         {
        //           text: "Назад до реєстрації"
        //         }
        //         // {
        //         //   text: '？Про Бота'
        //         // }
        //       ],
        //     ],
        //   },
        // });

        // await set('SC_TrialLessonComplet_active')('true');
        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах-Клуб+PLUS'){
        await set('sc_clubplus_proof')(data.photo);
        await set('sc_clubplus_typeproof')('photo');
        ctx.reply(script.speakingClub.thanksType.typePlus, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.coursesTeacherOnHour()
          },
        });
        await set('state')('RespondCourseAndGetMail')
      }
      else{
        ctx.reply(user['club-typeclub']);
      }
    }
    else if (CheckException.FileException(data)){
      await set('paymentStatusClubOrPacket')('unknown');
      const paymentStatus = await get('paymentStatusClubOrPacket') ?? 'unknown';

      if (user['club-typeclub'] === 'Шпрах-Клуб'){
        if (clubIndex !== ''){
          const inline = inlineAcceptClubWithPacketPayment(id, clubIndex, paymentStatus, "standart");

          ctx.telegram.sendDocument(devChat, data.file, {
            parse_mode: "HTML",
            caption: 'ClubAndPacket',
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 'standart');
          ctx.telegram.sendPhoto(devChat, data.file, {
            parse_mode: "HTML",
            caption: 'Packet',
            ...Markup.inlineKeyboard(inline)
          })
        }

        ctx.reply('Ваше замовлення прийнято, очікуйте на підтвердження', {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'В МЕНЮ',
                },
                {
                  text: "Назад до реєстрації"
                }
                // {
                //   text: '？Про Бота'
                // }
              ],
            ],
          },
        })
        // await set('SC_TrialLessonComplet_active')('true');
        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах-Клуб+PLUS'){
        await set('sc_clubplus_proof')(data.file);
        await set('sc_clubplus_typeproof')('file');
        ctx.reply(script.speakingClub.thanksType.typePlus, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.coursesTeacherOnHour()
          },
        });
        await set('state')('RespondCourseAndGetMail')
      }
      else{
        ctx.reply(user['club-typeclub']);
      }
    }
    else{
      ctx.reply(script.errorException.paymentGettingError, {reply_markup: {remove_keyboard: true}});
    }
  })

  onTextMessage('RespondCourseAndGetMail', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'A1.1' || data.text === 'A1.2' || data.text === 'A2.1' || data.text === 'A2.2'){
      await set('club-coursename')(data.text);

      ctx.reply(script.speakingClub.getMail, {reply_markup: {remove_keyboard: true}});
      await set('state')('RespondMailAndFinal');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      });
    }
  })

  onTextMessage('RespondMailAndFinal', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      get = db.get(ctx?.chat?.id ?? -1);
    //set mail

    if (CheckException.TextException(data)){
      await set('paymentStatusClubOrPacket')('unknown');
      const paymentStatus = await get('paymentStatusClubOrPacket') ?? 'unknown';
      const typeOfProof = user['sc_clubplus_typeproof'];

      if (await dbProcess.SetMailForUser(ctx?.chat?.id ?? -1, data.text)){
        await set('sc_local_user_mail')(data.text);
        if (user['sc_request_torecord_usertoclub'] !== ''){
          if (typeOfProof === 'photo'){
            const inline = inlineAcceptClubWithPacketPayment(ctx?.chat?.id ?? -1, user['sc_request_torecord_usertoclub'], paymentStatus, 'plus');
  
            ctx.telegram.sendPhoto(devChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: 'ClubAndPacket',
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptClubWithPacketPayment(ctx?.chat?.id ?? -1, user['sc_request_torecord_usertoclub'], paymentStatus, 'plus');
  
            ctx.telegram.sendDocument(devChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: 'ClubAndPacket',
              ...Markup.inlineKeyboard(inline)
            })
          }

          // const index = new ObjectId(user['sc_request_torecord_usertoclub']),
          //  currentClub = await dbProcess.ShowData(index);
          // await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, new ObjectId(user['sc_request_torecord_usertoclub']));
          // await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
          // await set('sc_request_torecord_usertoclub')('');
        }
        else{
          if (typeOfProof === 'photo'){
            const inline = inlineAcceptPacketPayment(ctx?.chat?.id ?? -1, paymentStatus, 'plus');
            ctx.telegram.sendPhoto(devChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: 'Packet',
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptPacketPayment(ctx?.chat?.id ?? -1, paymentStatus, 'plus');
            ctx.telegram.sendDocument(devChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: 'Packet',
              ...Markup.inlineKeyboard(inline)
            })
          }

          // const currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
          // await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 5);
        }
  
        ctx.reply(script.speakingClub.thanksAfterMail(user['name'], user['club-coursename']), {
          parse_mode: "HTML",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: "В МЕНЮ",
                },
                {
                  text: "Назад до реєстрації",
                }
              ],
            ],
          },
        });
  
        // await set('SC_TrialLessonComplet_active')('true');
        await set('state')('EndRootManager');
      }
      else{
        ctx.reply(script.errorException.textGettingError.mailException, {reply_markup: {remove_keyboard: true}});
      }
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException, {reply_markup: {remove_keyboard: true}});
    }
  })

  // Trial Club Handler with checking payment status
  onTextMessage('RespondTrialClubAndCheckPayment', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll();

    if (CheckException.BackRoot(data)){
      ctx.reply(script.speakingClub.trialLesson.entire, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так"
              },
              {
                text: "ні"
              }
            ]
          ],
        },
      })

      await set('state')('RespondChooseAndRespondGetLesson');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length + 1){
      const currentItemIndex = results.map(item => item._id)[parseInt(data.text) - 1],
        currentClub = await dbProcess.ShowData(currentItemIndex);

      if (currentClub!.count > 0){
        if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, currentItemIndex)){
          await set('sc_triallesson_clubindex')(currentItemIndex.toString());
    
          await ctx.reply(script.speakingClub.report.showClubToUser(currentClub!.title, currentClub!.teacher, 
            currentClub!.date, currentClub!.time));
  
          await ctx.reply(script.speakingClub.trialLesson.getPayment, {reply_markup: {remove_keyboard: true}});
  
          await set('state')('CheckPaymentAndReturn');
        }
        else{
          ctx.reply('ви вже зареєстровані на цей шпрах! виберіть інший');
        }
      }
      else{
        ctx.reply('у цього шпраху відсутні місця! оберіть, будь ласка, інший', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
              return [{ text: `${index + 1}` }];
            })
          }
        })
      }
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })
    }
  })

  // Waiting Payment for Trial Lesson Club
  onPhotoMessage('CheckPaymentAndReturn', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      get = db.get(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){

    }
    else if (CheckException.PhotoException(data)){
      await set('paymentStatusTrialLesson')('unknown');
      const paymentStatus: string = await get('paymentStatusTrialLesson') ?? 'unknown',
        inline = inlineAcceptTrialPayment(ctx?.chat?.id ?? -1, user['sc_triallesson_clubindex'], paymentStatus);
      
      ctx.telegram.sendPhoto(devChat, data.photo, {
        parse_mode: "HTML",
        caption: 'Work',
        ...Markup.inlineKeyboard(inline)
      });

      await ctx.reply('Ваше замовлення прийнято, очікуйте на підтвердження', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              }
            ]
          ]
        }
      });

      await set('state')('EndRootManager');
    }
    else if (CheckException.FileException(data)){
      ctx.telegram.sendDocument(devChat, data.file, {
        parse_mode: "HTML",
        caption: 'Work'
      })
    }
    else{
      ctx.reply(script.errorException.paymentGettingError);
    }
  })

  //Club Registration (start)
  onTextMessage('GetClubToRegistrationAndCheckPayment', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll(),
      currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        line = user!.haveTrialLessonClub;
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(line)
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (currentUser!.count > 0){
      if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length + 1){
        const currentItemIndex = results.map(item => item._id)[parseInt(data.text) - 1],
          currentClub = await dbProcess.ShowData(currentItemIndex),
          users = await dbProcess.ShowAllUsers();

        let recordedUsers = '';
  
        if (currentClub!.count > 0){
          if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, currentItemIndex)){
            await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count - 1);
            await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
            await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, currentClub!._id);

            for(let i = 0; i < users.length; i++){
              recordedUsers != `${users[i].name} (@${users[i].username})\n${users[i].number}`;
            }
        
            await ctx.telegram.sendMessage(currentClub!.teacher_id, script.speakingClub.report.showClubTypeAdmin(1, currentClub!.title, currentClub!.teacher_name, 
              dbProcess.getDateClub(new Date(currentClub!.date)), currentClub!.time, currentClub!.count > 0 ? currentClub!.count : "Немає місць", recordedUsers));

            if (currentUser!.count === 1){
              await ctx.telegram.sendMessage(devChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
              
              await ctx.telegram.sendMessage(confirmationChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
            }

            ctx.reply(script.speakingClub.registrationLesson.acceptedRegistration(user['name'], currentClub!.date, 
            currentClub!.time, currentClub!.link));
          }
          else{
            ctx.reply('ви вже зареєстровані на цей шпрах! виберіть інший');
          }
        }
        else{
          ctx.reply('у цього шпраху відсутні місця! оберіть, будь ласка, інший', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
                return [{ text: `${index + 1}` }];
              })
            }
          })
        }
      }
      else{
        ctx.reply(script.errorException.chooseButtonError, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
              return [{ text: `${index + 1}` }];
            })
          }
        })
      }
    }
    else{
      if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length + 1){
        const currentItemIndex = results.map(item => item._id)[parseInt(data.text) - 1],
          currentClub = await dbProcess.ShowData(currentItemIndex);
  
        if (currentClub!.count > 0){
          if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, currentItemIndex)){
            await set('sc_request_torecord_usertoclub')(currentItemIndex!.toString());
            ctx.reply(script.speakingClub.registrationLesson.paymentRequest(user['name']), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: [
                  [
                    {
                      text: "так"
                    },
                    {
                      text: "ні"
                    }
                  ]
                ]
              }
            })

            await set('state')('RegistrationChooseHandlerPayment');
          }
          else{
            ctx.reply('ви вже зареєстровані на цей шпрах! виберіть інший');
          }
        }
        else{
          ctx.reply('у цього шпраху відсутні місця! оберіть, будь ласка, інший', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
                return [{ text: `${index + 1}` }];
              })
            }
          })
        }
      }
      else{
        ctx.reply(script.errorException.chooseButtonError, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
              return [{ text: `${index + 1}` }];
            })
          }
        })
      }
    }
  })

  onTextMessage('RegistrationChooseHandlerPayment', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'так'){
      ctx.reply(script.speakingClub.payPacketLesson, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Шпрах-Клуб"
              },
              {
                text: "Шпрах-Клуб+PLUS"
              }
            ]
          ],
        },
      });
      await set('state')('RespondTypePacketAndGetPayment');
    }
    else if (data.text === 'ні'){
      ctx.reply(script.speakingClub.defaultDecline, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              }
            ]
          ]
        }
      });

      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  // Admin Root Handler
  onTextMessage('AdminRootHandler', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'Шпрах-Клуби'){
      ctx.reply("З поверненням, Меркель! :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (data.text === 'Особові справи студентів'){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (data.text === 'В МЕНЮ'){
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  // Admin Panel (start)
  onTextMessage('RespondAdminActionAndRootChoose', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'Додати'){
      ctx.reply("Тема:");
      await set('state')('ADD_RespondTitleAndGetTeacher');
    }
    else if (data.text === 'Видалити'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username})\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }
          if (results[i].count > 0) {
            addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher_name, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved), {
          parse_mode: "HTML"
        });
      }

      const keyboard = results.map(result => result._id).map((value : ObjectId, index : number) => {
        return [{ text: `${index + 1}` }];
      });

      await ctx.reply('Виберіть номер шпраха для видалення:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
        }
      })

      await set('state')('DeleteClubAndCheckAction');
    }
    else if (data.text === 'Редагувати'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username})\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }
          if (results[i].count > 0) {
            addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString, userHaved), {
          parse_mode: "HTML"
        });
      }

      await ctx.reply('Виберіть номер шпраха для редагування:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('RespondKeyDataAndGetChanges');
    }
    else if (data.text === 'Показати всі'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username})\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }
          if (results[i].count > 0) {
            addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, results[i].documentation, {
          parse_mode: "HTML",
          caption: script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved)
        });
      }
    }
    else if (data.text === 'В МЕНЮ'){
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Додати"
              },
              {
                text: "Редагувати"
              }
            ],[
              {
                text: "Видалити"
              },
              {
                text: "Показати всі"
              }
            ],[
              {
                text: "Особові справи студентів"
              },
              {
                text: "В МЕНЮ"
              }
            ]
          ],
        },
      })
    }
  });

  //Add Method
  onTextMessage('ADD_RespondTitleAndGetTeacher', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      await set('AP_title')(data.text);

      const users = await dbProcess.ShowAllUsers();
      let keyboard = [];

      for (let i = 0; i < users.length; i++){
        if (users[i].role === 'teacher'){
          keyboard.push([{ text: users[i].name }]);
        }
      }

      ctx.reply('Вчитель:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
        }
      });
      await set('state')('ADD_RespondTeacherAndGetDate');
    }
  })

  onTextMessage('ADD_RespondTeacherAndGetDate', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      if (await dbProcess.GetTeacherBool(data.text)){
        const teacher = await dbProcess.GetTeacherNameAndID(data.text, true);
        await set("AP_teacher_name")(teacher[0]);
        await set("AP_teacher_id")(teacher[1]);
  
        ctx.reply('Коли (день):');
        await set('state')('ADD_RespondDateDayAndGetDateMonth');
      }
      else{
        const users = await dbProcess.ShowAllUsers();
        let keyboard = [];

        for (let i = 0; i < users.length; i++){
          if (users[i].role === 'teacher'){
            keyboard.push([{ text: users[i].name }]);
          }
        }
          ctx.reply('виберіть, будь ласка вчителя', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboard
          }
        })
      }
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  onTextMessage('ADD_RespondDateDayAndGetDateMonth', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);
    
    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, false)){
      await set('AP_date_day')(data.text);

      ctx.reply('Коли (місяць):');
      await set('state')('ADD_RespondDateMonthAndGetDateYear');
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondDateMonthAndGetDateYear', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);
    
    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, false)){
      await set('AP_date_month')(data.text);

      ctx.reply('Коли (рік):');
      await set('state')('ADD_RespondDateAndGetTime');
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondDateAndGetTime', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, true)){
      await set('AP_date_year')(data.text);

      ctx.reply('Час (години):');
      await set('state')('ADD_RespondTimeHourAndGetMinute');
    }
    else{
      ctx.reply('Це повинна бути чотрьохзначна цифра');
    }
  })

  onTextMessage('ADD_RespondTimeHourAndGetMinute', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, false)){
      await set('AP_time_hour')(data.text);

      ctx.reply('Час (хвилини):');
      await set('state')('ADD_RespondTimeAndGetCount');
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondTimeAndGetCount', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      await set('AP_time_minute')(data.text);

      ctx.reply('Кількість місць:');
      await set('state')('ADD_RespondCountAndGetLink');
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondCountAndGetLink', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      if (parseInt(data.text) <= 5 && parseInt(data.text) > 0){
        await set('AP_count')(data.text);
  
        ctx.reply('Документація:');
        await set('state')('ADD_RespondDocumentationAndGetLink');
      }
      else{
        ctx.reply('Кількість місць не може бути більше 5-ти і менше або 0');
      }
    }
  })

  onDocumentationMessage('ADD_RespondDocumentationAndGetLink', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.FileException(data)){
      await set('AP_documentation')(data.file);

      ctx.reply('Посилання:');
      await set('state')('ADD_RespondLinkAndCheckRight');
    }
    else{
      ctx.reply('Це не схоже на файл типу PDF');
    }
  })

  onTextMessage('ADD_RespondLinkAndCheckRight', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      datePart = `${user['AP_date_day']}-${user['AP_date_month']}-${user['AP_date_year']} (${dbProcess.getDateClub(new Date(`
        ${user['AP_date_year']}-${user['AP_date_month']}-${user['AP_date_day']}`))})`;

    if (CheckException.TextException(data)){
      await set('AP_link')(data.text);

      await ctx.reply(script.speakingClub.report.checkClub(user['AP_title'], user['AP_teacher_name'], datePart, `${user['AP_time_hour']}:${user['AP_time_minute']}`, data.text, parseInt(user['AP_count'])))
      await ctx.reply("Все вірно?", {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так",
              },
              {
                text: "ні",
              }
            ],
          ],
        },
      })

      await set('state')('ADD_CheckHandlerAndRoot');
    }
  })

  onTextMessage('ADD_CheckHandlerAndRoot', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'так'){
      const toWrite = {
        title: user['AP_title'],
        teacher: user['AP_teacher_name'],
        teacher_id: user['AP_teacher_id'],
        date: `${user['AP_date_year']}-${user['AP_date_month']}-${user['AP_date_day']}`,
        time: `${user['AP_time_hour']}:${user['AP_time_minute']}`,
        count: parseInt(user['AP_count']),
        link: user['AP_link'],
        documentation: user['AP_documentation']
      }
      await dbProcess.AddData(toWrite);
      await ctx.reply('Успішно додано!', {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ",
              }
            ],
          ],
        },
      })
      
      await set('state')('EndRootManager');
    }
    else if (data.text === 'ні'){
      ctx.reply("Тема:");
      await set('state')('ADD_RespondTitleAndGetTeacher')
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так",
              },
              {
                text: "ні",
              },
            ],
          ],
        },
      })
    }
  })

  // Delete Handler
  onTextMessage('DeleteClubAndCheckAction', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll();

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length) {
      await set('AP_DeleteHandler_indextodelete')(data.text);

      await ctx.reply(`Ви впевнені, що хочете видалити клаб №${data.text}?`, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так"
              },
              {
                text: "ні"
              }
            ]
          ],
        },
      });

      await set('state')('CheckingActionDeleteAndReturn');
    } 
    else {
      await ctx.reply('Помилка, видалення неможливе, так як цього елементу не існує.', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: (await dbProcess.ShowAll()).map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }]})
        }
      });
    }
  })

  onTextMessage('CheckingActionDeleteAndReturn', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll(),
      users = await dbProcess.ShowAllUsers(),
      deleteItem = results.map(result => result._id),
      indexToDelete = user['AP_DeleteHandler_indextodelete'];

    if (data.text === 'так'){
      dbProcess.DeleteData(deleteItem[parseInt(indexToDelete) - 1]);

      for (let i = 0; i < users.length; i++){
        await dbProcess.DeleteClubFromUser(users[i].id, deleteItem[parseInt(indexToDelete) - 1]);
      }

      await ctx.reply(`Шпрах клаб №${data.text} успішно видалений.`, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      });

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (data.text === 'ні'){
      await ctx.reply(`Поточна операція відмінена.`, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      });

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  // Change Key Data
  onTextMessage('RespondKeyDataAndGetChanges', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll();

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
      await set('AP_respondkeydata_clubid')(data.text);
      console.log(results[parseInt(data.text) - 1].title);

      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })


  // Change Process
  onTextMessage('GetChangesAndChangeThis', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (Key(data.text) !== null){
      await set('AP_keyforchange')(Key(data.text)!);

      if (data.text === 'Документація'){
        ctx.reply("Завантажте файл");
        await set('state')('ChangeThisDocAndCheckThis');
      }
      else if (data.text === 'Дата'){
        ctx.reply("Введіть день:");
        await set('state')('ChangeDateDayAndGetChangeMonth');
      }
      else if (data.text === 'Час'){
        ctx.reply('Введіть години');
        await set('state')('ChangeTimeHourAndGetChangeMinute');
      }
      else if (data.text === 'Викладач'){
        const users = await dbProcess.ShowAllUsers();
        let teachers = [];

        for(let i = 0; i < users.length; i++){
          if (users[i].role === 'teacher'){
            teachers.push([{text: users[i].name}])
          }
        }

        ctx.reply('Виберіть викладача', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: teachers
          }
        })

        await set('state')('ChangeTeacherAndSubmit');
      }
      else{
        ctx.reply("Введіть нові дані");
        await set('state')('ChangeThisAndCheckThis');
      }
    }
    else{
      ctx.reply("Помилка", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });
    }
  })

  onTextMessage('ChangeThisAndCheckThis', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll(),
      currentItem = results.map(result => result._id);

    if (CheckException.TextException(data)){
      if (user['AP_keyforchange'] === 'count'){
        if (parseInt(data.text) > 5){
          ctx.reply('Кількість можливих місць не може бути більше 5-ти');
        }
        else if (parseInt(data.text) < 0){
          ctx.reply('Кількість можливих місць не може бути менше 0-я');
        }
        else{
          const getCurrentClub: (MongoDBReturnType | Object | null)[] = [
            await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]),
            dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1])
          ], keyForChange = user['AP_keyforchange'];
    
          await set('AP_prev_keyvalue(backup)')(Array(getCurrentClub[0]).filter((club): club is MongoDBReturnType => typeof club === 'object')
          .map((club) => club[keyForChange as keyof MongoDBReturnType].toString()).join(''));
    
          await set('AP_keydatatochange')(data.text);
    
          await dbProcess.ChangeKeyData(dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid'])]), keyForChange, data.text);
          ctx.reply('Успішно виконана операція!', {
            parse_mode: "Markdown",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.spekingClubAdminPanel()
            },
          });

          await set('state')('RespondAdminActionAndRootChoose');
        }
      }
      else{
        const getCurrentClub: (MongoDBReturnType | Object | null)[] = [
          await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]),
          dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1])
        ], keyForChange = user['AP_keyforchange'];
  
        await set('AP_prev_keyvalue(backup)')(Array(getCurrentClub[0]).filter((club): club is MongoDBReturnType => typeof club === 'object')
        .map((club) => club[keyForChange as keyof MongoDBReturnType].toString()).join(''));
  
        await set('AP_keydatatochange')(data.text);
  
        await dbProcess.ChangeKeyData(dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]), keyForChange, data.text);
        ctx.reply('Успішно виконана операція!', {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.spekingClubAdminPanel()
          },
        });

        await set('state')('RespondAdminActionAndRootChoose');
      }
    }
    else{
      ctx.reply('це не підтримується');
    }
  })

  onDocumentationMessage('ChangeThisDocAndCheckThis', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAll();

    if (CheckException.FileException(data)){
      const keyForChange = user['AP_keyforchange'];

      await set('AP_keydatatochange')(data.text);

      console.log(results[parseInt(user['AP_respondkeydata_clubid']) - 1].title);

      await dbProcess.ChangeKeyData(results[parseInt(user['AP_respondkeydata_clubid']) - 1], keyForChange, data.file);
      ctx.reply('Успішно виконана операція!', {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      });

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else{
      ctx.reply('Формат файлу не є PDF');
    }
  })

  onTextMessage('ChangeDateDayAndGetChangeMonth', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false)){
      await set('change_date_day')(data.text);

      ctx.reply("А тепер введіть місяць");
      await set('state')('ChangeDateMonthAndGetChangeYear');
    }
    else{
      ctx.reply('Це не схоже на день');
    }
  })

  onTextMessage('ChangeDateMonthAndGetChangeYear', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false)){
      await set('change_date_month')(data.text);

      ctx.reply('І звісно рік:');
      await set('state')('ChangeDateYearAndSubmit');
    }
    else{
      ctx.reply('Це не схоже на місяць');
    }
  })

  onTextMessage('ChangeDateYearAndSubmit', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, true)){
      await set('change_date_year')(data.text);
      const currentItem = (await dbProcess.ShowAll()).map(result => result._id),
        object = await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1])

      await dbProcess.ChangeKeyData(object!, 'date', `${data.text}-${user['change_date_month']}-${user['change_date_day']}`)
      ctx.reply('Операція успішна!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      });

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else{
      ctx.reply('Це не схоже на рік');
    }
  })

  onTextMessage('ChangeTimeHourAndGetChangeMinute', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);
    
    if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false) && parseInt(data.text) < 24){
      await set('change_time_hour')(data.text);

      ctx.reply('А тепер, будь ласка, хвилини');
      await set('state')('ChangeTimeMinuteAndSubmit');
    }
    else{
      ctx.reply('Це не схоже на час');
    }
  })

  onTextMessage('ChangeTimeMinuteAndSubmit', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false) && parseInt(data.text) < 60){
      await set('change_time_minute')(data.text);
      const currentItem = (await dbProcess.ShowAll()).map(result => result._id),
        object = await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1])

      await dbProcess.ChangeKeyData(object!, 'time', `${user['change_time_hour']}:${data.text}`);
      ctx.reply('Операція успішна!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      });

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else{
      ctx.reply('не схоже на хвилини');
    }
  })

  onTextMessage('ChangeTeacherAndSubmit', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      const users = await dbProcess.ShowAllUsers();
      let allTeachers = [];

      for(let i = 0; i < users.length; i++){
        if (users[i].role === 'teacher'){
          allTeachers.push(users[i].name);
        }
      }

      if (allTeachers.includes(data.text)){
        const currentItem = (await dbProcess.ShowAll()).map(result => result._id),
          object = await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]),
          teacher = await dbProcess.GetTeacherNameAndID(data.text, true);

        await dbProcess.ChangeKeyData(object!, 'teacher_name', teacher[0]);
        await dbProcess.ChangeKeyData(object!, 'teacher_id', teacher[1]);

        ctx.reply('Успішно виконана операція!', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.spekingClubAdminPanel()
          }
        })

        await set('state')('ActionClubRespondAndRootAction');
      }
      else{
        const users = await dbProcess.ShowAllUsers();
        let teachers = [];

        for(let i = 0; i < users.length; i++){
          if (users[i].role === 'teacher'){
            teachers.push([{text: users[i].name}])
          }
        }
        ctx.reply('Такого викладача не існує', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: teachers
          }
        })
      }
    }
    else{
      const users = await dbProcess.ShowAllUsers();
        let teachers = [];

        for(let i = 0; i < users.length; i++){
          if (users[i].role === 'teacher'){
            teachers.push([{text: users[i].name}])
          }
        }
        ctx.reply('Такого викладача не існує', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: teachers
          }
        })
    }
  })

  //Personal Student Handler
  onTextMessage('PeronalStudentHandler', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'Показати всіх користувачів'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
      }
    }
    else if (data.text === 'Показати студентів'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        if (results[i].role === 'student'){
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
        }
      }
    }
    else if (data.text === 'Показати викладачів'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        if (results[i].role === 'teacher'){
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
        }
      }
    }
    else if (data.text === 'Показати Адмінів та Розробника'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        if (results[i].role === 'admin' || results[i].role === 'developer'){
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
        }
      }
    }
    else if (data.text === 'Додати заняття студенту'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
      }

      await ctx.reply('Виберіть номер студента, якому потрібно додати заняття', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('AddLessonForStudent');
    }
    else if (data.text === 'Видалити студента'){
      const results = await dbProcess.ShowAllUsers();
  
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
      }

      await ctx.reply('Виберіть номер студента, якого потрібно видалити', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('DeleteStudentAndCheckAction');
    }
    else if (data.text === 'Змінити роль користувача'){
      const results = await dbProcess.ShowAllUsers();
  
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()));
      }

      await ctx.reply('Виберіть номер студента, якого потрібно видалити', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('RespondUserToActionAndGetRole');
    }
    else if (data.text === 'В МЕНЮ'){
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })
    }
  })

  // Add Lessons Student
  onTextMessage('AddLessonForStudent', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = (await dbProcess.ShowAllUsers()).map(result => result._id);

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
      await set('AP_student_id')(data.text);

      await ctx.reply('Скільки додамо?');
      await set('state')('ChangeCountLessonHandlerAndReturn');
    }
  })

  onTextMessage('ChangeCountLessonHandlerAndReturn', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      userID: ObjectId = (await dbProcess.ShowAllUsers()).map(item => item._id)[parseInt(user['AP_student_id'] ) - 1],
      userIDWithoutProcessing = parseInt(user['AP_student_id']),
      getCurrentUserCount = (await dbProcess.ShowAllUsers()).map(item => item.count)[userIDWithoutProcessing - 1],
      getUserActualName = (await dbProcess.ShowAllUsers()).map(item => item.name)[userIDWithoutProcessing - 1];
      
    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1){
      const toWrite: number = getCurrentUserCount + parseInt(data.text);
      await dbProcess.ChangeCountUser(userID, toWrite);

      await ctx.reply(`Успішно! На рахунку у студента ${getUserActualName}: ${toWrite} занять`, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
  })

  // Delete Student Handler
  onTextMessage('DeleteStudentAndCheckAction', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAllUsers();

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
      await set('AP_DeleteStudentHandler_deleteindex')(data.text)

      ctx.reply(`Ви впевнені, що хочете видалити користувача №${data.text}`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "так"
              },
              {
                text: "ні"
              }
            ]
          ]
        }
      })

      await set('state')('DeleteStudentHandlerAndReturn');
    }
    else{
      ctx.reply('Помилка', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })
    }
  })

  onTextMessage('DeleteStudentHandlerAndReturn', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAllUsers(),
      indexToDelete = user['AP_DeleteStudentHandler_deleteindex'];

    if (data.text === 'так'){
      await dbProcess.DeleteUser(results.map(item => item.id)[parseInt(indexToDelete) - 1]);

      ctx.reply(`Успішно видалено студента №${indexToDelete}`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (data.text === 'ні'){
      ctx.reply(`Поточну операцію відмінено.`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  // Change user role
  onTextMessage('RespondUserToActionAndGetRole', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAllUsers();

    if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
      const getUserActualName = (await dbProcess.ShowAllUsers()).map(item => item.name)[parseInt(data.text) - 1];
      await set('AP_StudentHandler_idToChange')(data.text);

      ctx.reply(`Виберіть нову роль для ${getUserActualName}`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.roleChange()
        }
      })

      await set('state')('RespondRoleAndReturn');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  onTextMessage('RespondRoleAndReturn', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1),
      results = await dbProcess.ShowAllUsers(),
      currentUserObjectID = results.map(item => item.id)[parseInt(user['AP_StudentHandler_idToChange']) - 1];

    if (CheckException.TextException(data) && Role(data.text)){
      await dbProcess.ChangeUserRole(currentUserObjectID, Role(data.text).toString());

      ctx.reply(`Успішно виконана операція!`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.roleChange()
        }
      })
    }
  })

  // const updatePaymentStatusInGoogleSheets = async (
  //   id: number,
  //   status: boolean
  // ) => {
  //   const idRows = await sheets.get("Sheet1!A:A");

  //   const rowIndex = idRows.data.values?.findIndex((arr) => {
  //     console.log(arr[0], id);
  //     return arr[0] == id;
  //   });

  //   const rowNumberString = rowIndex ? `${rowIndex + 1}` : "";
  //   sheets.updateRow(`Sheet1!H${rowNumberString}:H${rowNumberString}`, [status ? "Заплатив" : "Ні :C"]);
  // };


  // Payment Main Bot Function Action
  bot.action(/^approvePayment:(\d+)$/, async (ctx) => {
    const id = Number.parseInt(ctx.match[1]);

    // db.set(id)('paymentConfirmed')(`true`);
    // try {
    //   updatePaymentStatusInGoogleSheets(id, true);
    // } catch (e) { console.log(e); }
    // return ctx.answerCbQuery(`Param: ${id}`);

    try {
      // set up payment status "paid"
      await db.set(id)('paymentStatus')('paid');
      const newInlineKeyboardButtons = inlineApprovePayment(id, 'paid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Встановлений статус "ОПЛАЧЕНО" для користувача: ${id}`);
  });

  bot.action(/^rejectPayment:(\d+)$/, async (ctx) => {
    const id = Number.parseInt(ctx.match[1]);

    // db.set(id)('paymentConfirmed')('false');
    // try {
    //   updatePaymentStatusInGoogleSheets(id, false);
    // } catch (e) { console.log(e); }

    // return ctx.answerCbQuery(`Param: ${id}`);

    try {
      // set up payment status "no paid"
      await db.set(id)('paymentStatus')('nopaid');
      const newInlineKeyboardButtons = inlineApprovePayment(id, 'nopaid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Встановлений статус "НЕ ОПЛАЧЕНО" для користувача: ${id}`);
  });

  bot.action(/^resetPaymentStatus:(\d+)$/, async (ctx) => {
    const id = Number.parseInt(ctx.match[1]);

    try {
      // set up payment status "unknown"
      await db.set(id)('paymentStatus')('unknown');
      const newInlineKeyboardButtons = inlineApprovePayment(id, 'unknown'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Встановлений статус "НЕ ВИЗНАЧЕНИЙ" для користувача: ${id}`);
  });

  bot.action(/^paidCheck:(\d+)$/, (ctx) => {
    const id = Number.parseInt(ctx.match[1]);
    return ctx.answerCbQuery(`Користувач: ${id}, стан: ОПЛАЧЕНО`);
  });

  bot.action(/^nopaidCheck:(\d+)$/, (ctx) => {
    const id = Number.parseInt(ctx.match[1]);
    return ctx.answerCbQuery(`Користувач: ${id}, стан: НЕ ОПЛАЧЕНО`);
  });

  // Club trial lesson payment action
  bot.action(/^acceptPayment:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));
    const users = await dbProcess.ShowAllUsers();

    await dbProcess.WriteNewClubToUser(idUser, idClub!._id)
    await dbProcess.ChangeKeyData(idClub!, 'count', idClub!.count - 1);
    await dbProcess.SwitchToCompletTrialLesson(idUser, 'true');

    let recordedUsers = '';

    for(let i = 0; i < users.length; i++){
      recordedUsers != `${users[i].name} (@${users[i].username})\n${users[i].number}`;
    }

    await ctx.telegram.sendMessage(idClub!.teacher_id, script.speakingClub.report.showClubTypeAdmin(1, idClub!.title, idClub!.teacher_name, 
      dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, idClub!.count > 0 ? idClub!.count : "Немає місць", recordedUsers));

    await ctx.telegram.sendMessage(idUser, script.speakingClub.report.acceptedTrialLesson((await db.get(idUser)('name'))!.toString(), dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, idClub!.link));

    await db.set(idUser)('SC_TrialLessonComplet_active')('true');

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptTrialPayment(idUser, ctx.match[2], 'paid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}`);
  })

  bot.action(/^declinePayment:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptTrialPayment(idUser, ctx.match[2], 'nopaid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}`);
  })

  bot.action(/^paidCheckT:(\d+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    return ctx.answerCbQuery(`Користувач: ${await db.get(idUser)('name')}, стан: ОПЛАЧЕНО`);
  });

  bot.action(/^nopaidCheckT:(\d+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    return ctx.answerCbQuery(`Користувач: ${await db.get(idUser)('name')}, стан: НЕ ОПЛАЧЕНО`);
  });

  // Club Packet Payment
  bot.action(/^acceptPaymentP:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const packetName = ctx.match[2] === 'standart' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS';

    const currentUser = await dbProcess.ShowOneUser(idUser);
    await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 5);

    await ctx.telegram.sendMessage(idUser, script.speakingClub.report.acceptedPacketPayment((await db.get(idUser)('name'))!.toString(), packetName));

    await db.set(idUser)('SC_TrialLessonComplet_active')('true');

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptTrialPayment(idUser, ctx.match[2], 'paid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Пакет: ${packetName}`);
  })

  bot.action(/^declinePaymentP:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const packetName = ctx.match[2] === 'standart' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS';

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptTrialPayment(idUser, ctx.match[2], 'nopaid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Пакет: ${packetName}`);
  })

  // Club PacketAndClub Payment
  bot.action(/^acceptPaymentCP:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));
    const packetName = ctx.match[3] === 'standart' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS',
      users = await dbProcess.ShowAllUsers();
    let recordedUsers = '';

    const currentUser = await dbProcess.ShowOneUser(idUser);
    await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 4);
    await dbProcess.WriteNewClubToUser(idUser, idClub!._id)
    await dbProcess.ChangeKeyData(idClub!, 'count', idClub!.count - 1);
    await dbProcess.SwitchToCompletTrialLesson(idUser, 'true');

    for(let i = 0; i < users.length; i++){
      recordedUsers != `${users[i].name} (@${users[i].username})\n${users[i].number}`;
    }

    await ctx.telegram.sendMessage(idClub!.teacher_id, script.speakingClub.report.showClubTypeAdmin(1, idClub!.title, idClub!.teacher_name, 
      idClub!.date, idClub!.time, (idClub!.count > 0 ? idClub!.count : "Немає місць"), recordedUsers));

    await ctx.telegram.sendMessage(idUser, script.speakingClub.report.acceptedTrialLesson((await db.get(idUser)('name'))!.toString(), idClub!.date, idClub!.time, idClub!.link));

    await db.set(idUser)('SC_TrialLessonComplet_active')('true');

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptTrialPayment(idUser, ctx.match[2], 'paid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}, Пакет: ${packetName}`);
  })

  bot.action(/^declinePaymentCP:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));
    const packetName = ctx.match[3] === 'standart' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS';

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptTrialPayment(idUser, ctx.match[2], 'nopaid'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}, Пакет: ${packetName}`);
  })

  // bot.command('menu', (ctx) => {
  //   console.log('menu tapped');
  //   // const set = db.set(ctx?.chat?.id ?? -1),
  //   //   userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

  //   // ctx.reply(script.entire.chooseFunction, {
  //   //   parse_mode: "Markdown",
  //   //   reply_markup: {
  //   //     one_time_keyboard: true,
  //   //     keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
  //   //   }
  //   // })

  //   // await set('state')('FunctionRoot');
  // });

  bot.launch();
}

main();