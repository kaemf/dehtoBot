// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v4.5.3

// Main File
import script from "./data/script";
import packet from "./data/packets";
import { Markup } from "telegraf";
import axios from "axios";
import { CheckException } from "./base/check";
type HideableIKBtn = ReturnType<typeof Markup.button.callback>;
import arch from './base/architecture';
import { Request, Response } from 'express';
import getCourses, { Course, Courses } from "./data/coursesAndTopics";
import { Key } from "./base/changeKeyValue";
import { ObjectId } from 'mongodb';
const confirmationChat = '437316791',
  supportChat = '6081848014',
  devChat = '740129506',
  versionBot = '4.5.3';

async function main() {
  const [ onTextMessage, onContactMessage, onPhotoMessage, bot, db, app, token, dbProcess ] = await arch();

  //Begin bot work, collecting user data (his telegram name) set up state_1
  bot.start((ctx) => {
    console.log('STARTED');
    ctx.reply(script.entire.greeting, {reply_markup: { remove_keyboard: true }});

    const username = ctx.chat.type === "private" ? ctx.chat.username ?? null : null;
    db.set(ctx.chat.id)('username')(username ?? 'unknown')
    db.set(ctx.chat.id)('state')('WaitingForName') 
  });

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

  interface MongoDBReturnType {
    _id: ObjectId;
    title: string;
    teacher: string;
    date: string;
    time: string;
    count: number;
    link: string;
  }

  const formattedName = (name : String) => {
    const words = name.split(' ');

    const formattedWords = words.map(word => {
      const firstLetter = word.charAt(0).toUpperCase(),
        restOfWord = word.slice(1).toLowerCase();
      return firstLetter + restOfWord;
    });

    return formattedWords.join(' ');
  }
  
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

      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ]
        }
      })

      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

      if (userObject){
        await dbProcess.UpdateUserData(userObject._id, user['name'], data.phone_number, user['username']);
      }
      else{
        dbProcess.AddUser({ id: ctx?.chat?.id ?? -1, name: user['name'], number: data.phone_number, username: user['username'], count: 0 });
      }

      await set('state')('FunctionRoot');
    }
  });

  onTextMessage('FunctionRoot', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

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
    else if (data.text === "Вчитель на годину"){
      ctx.reply(script.teacherOnHour.whatsTheProblem, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "A1.1",
              },
              {
                text: "A1.2",
              },
            ],[
              {
                text: "A2.1", //Added text
              },
              {
                text: "A2.2", //Added text
              }
            ],
          ],
        },
      });
      await set('state')('ChoosingCourses');
    }
    else if (data.text === "Пробний урок"){
      ctx.reply(script.trialLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('GraphicRespondAndLevelRequest');
    }
    else if (data.text === "Оплата занять"){
      ctx.reply(script.payInvidualLesson.chooseLevelCourse, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Рівень А1-А2",
              },
            ],[
              {
                text: "Рівень В1-В2",
              },
              {
                text: "Рівень С1-С2",
              },
            ],
          ],
        },
      });
      await set('state')('RespondCourseAndGetPacket');
    }
    else if (data.text === "Запис на заняття"){
      ctx.reply(script.registrationLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('_GraphicRespondAndLevelRequest');
    }
    else if (data.text === "Шпрах-Клуби"){
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
    else if (data.text === "Адмін Панель"){
      ctx.reply("З поверненням, Меркель! :)", {
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

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else{
      ctx.reply(script.errorException.chooseFunctionError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ],
        },
      });
    }
  })

  onTextMessage('GraphicRespondAndLevelRequest', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)) {
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ]
          ]
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
      // ctx.reply(script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
      //   {parse_mode: 'HTML'});

      ctx.telegram.sendMessage(confirmationChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(supportChat,
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
      // ctx.reply(script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
      //   {parse_mode: 'HTML'});
  
      ctx.telegram.sendMessage(confirmationChat, 
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, formattedDateRecord),
        {parse_mode: 'HTML'}
      )
  
      ctx.telegram.sendMessage(supportChat,
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
          keyboard: [
            [
              {
                text: "A1.1",
              },
              {
                text: "A1.2",
              },
            ],[
              {
                text: "A2.1", //Added text
              },
              {
                text: "A2.2", //Added text
              },
            ],
          ],
        },
      });
      await set('state')('ChoosingCourses');
    } 
    else if (data.text === 'В МЕНЮ'){
      console.log('FunctionRoot');
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ]
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

      const keyboard = results.map(result => result._id).map((value : ObjectId, index : number) => {
        return [{ text: `${index + 1}` }];
      });

      await ctx.reply('виберіть номер шпраха для запису:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
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
    const set = db.set(ctx?.chat?.id ?? -1);
    
    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ]
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
          keyboard: [
            [
              {
                text: "Рівень А1-А2",
              },
            ],[
              {
                text: "Рівень В1-В2",
              },
              {
                text: "Рівень С1-С2",
              },
            ],
          ],
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
          keyboard: [
            [
              {
                text: "Рівень А1-А2",
              },
            ],[
              {
                text: "Рівень В1-В2",
              },
              {
                text: "Рівень С1-С2",
              },
            ],
          ],
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
              },
              // {
              //   text: "Назад"
              // }
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
      // ctx.telegram.sendPhoto(id, unique_file_id, {
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
      // ctx.telegram.sendDocument(id, unique_file_id, {
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
              },
              // {
              //   text: "Назад"
              // }
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
          keyboard: [
            [
              {
                text: "A1.1",
              },
              {
                text: "A1.2",
              },
            ],[
              {
                text: "A2.1", //Added text
              },
              {
                text: "A2.2", //Added text
              }
            ],
          ],
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
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard:[
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
          ]
        }
      })
      await set('state')('FunctionRoot');
    }
    else if (data.text === 'A1.1' || data.text === 'A1.2' || data.text === 'A2.1' || data.text === 'A2.2'){
      const courses = getCourses(data.text as Courses);
      set('course')(data.text);
  
      console.log('Courses\n' + data.text);
      console.log(courses);

      // const newButton = [
      //   {
      //     text: 'Назад',
      //   }
      // ];
  
      //skiping process
      const keyboard = courses.map((el: Course, idx) => {
        const displayedIndex : number = idx + 1;
        if (courseNumbersToSkip[data.text].includes(displayedIndex)) return null;
        return [{ text: `${displayedIndex}. ${el}` }];
      }).filter(buttons => buttons !== null);

      // keyboard.unshift(newButton);
  
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
          keyboard: [
            [
              {
                text: "A1.1",
              },
              {
                text: "A1.2",
              },
            ],[
              {
                text: "A2.1", //Added text
              },
              {
                text: "A2.2", //Added text
              },
              // {
              //   text: "Назад"
              // }
            ],
          ],
        },
      })
    }
  })

  //Generate button for payment status (change when paymentStatus changed)
  const inlineApprovePayment = (id: number, paymentStatus: string): HideableIKBtn[][] => {
    if (paymentStatus === 'unknown') {
        return [
            [
                Markup.button.callback("👌", `approvePayment:${id}`),
                Markup.button.callback("❌", `rejectPayment:${id}`),
            ]
        ];
    } else if (paymentStatus === 'paid') {
        return [
            [
                Markup.button.callback("🟢 Оплачено", `paidCheck:${id}`),
                Markup.button.callback("❌", `resetPaymentStatus:${id}`),
            ]
        ];
    } else if (paymentStatus === 'nopaid') {
        return [
            [
                Markup.button.callback("🔴 Не оплачено", `nopaidCheck:${id}`),
                Markup.button.callback("❌", `resetPaymentStatus:${id}`),
            ]
        ];
    }
    return [];
  };

  //For formating MarkedownV2 function escaping special symbols
  // function text: string) {
  //   return text.replace(/[*_~`=#.{}[\]()+<>|!\\-]/g, "\\$&");
  // }

  const courseNumbersToSkip = {
    "A1.1": [10, 16, 21, 27, 35, 43, 47],
    "A1.2": [10, 14, 21, 29, 34, 37, 42, 48],
    "A2.1": [7, 10, 14, 19, 23, 28, 32, 36],
    "A2.2": [7, 14, 18, 24, 29, 33, 38]
  } as {[key : string] : number[]}

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
      // ctx.telegram.sendPhoto(id, unique_file_id, {
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
      // ctx.telegram.sendDocument(id, unique_file_id, {
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
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: [
          [
            {
              text: "Вчитель на годину",
            },
          ],[
            {
              text: "Пробний урок",
            },
          ],[
            {
              text: "Оплата занять",
            },
          ],[
            {
              text: "Запис на заняття"
            }
          ],[
            {
              text: "Шпрах-Клуби"
            }
          ],[
            {
              text: "Адмін Панель"
            }
          ]
        ]
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
      // ctx.reply(script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, formattedDateRecord),
      //   { parse_mode: 'HTML' });
  
      ctx.telegram.sendMessage(confirmationChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, formattedDateRecord),
        { parse_mode: 'HTML' });
  
      ctx.telegram.sendMessage(supportChat,
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
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ],
        },
      });
    }
    else if (data.text === 'Пробне заняття'){
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
    else if (data.text === 'Реєстрація на клуб'){
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

      const keyboard = results.map(result => result._id).map((value : ObjectId, index : number) => {
        return [{ text: `${index + 1}` }];
      });

      await ctx.reply('виберіть номер шпраха для запису:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
        }
      })

      await set('state')('GetClubToRegistrationAndCheckPayment');
    }
    else if (data.text === 'Залишок моїх занять'){
      const currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        number : number = currentUser!.count;
      if (number > 0){
        ctx.reply(script.speakingClub.lessLessons(number), {
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
        ctx.reply(script.speakingClub.lessLessons(number), {
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
    else if (data.text === 'Оплатити пакет занять'){
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
      ctx.reply(script.errorException.chooseButtonError, {
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
      formattedDateRecord = `${dateFormat}.${monthFormat}.${date.getFullYear()}`;

    if (CheckException.PhotoException(data)){
      //await set('paymentStatus')('unknown');
  
      // const inline = inlineApprovePayment(id, paymentStatus);
  
      const unique_file_id = data.photo;
      
      // For Developer
      // ctx.telegram.sendPhoto(id, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      // ctx.telegram.sendPhoto(confirmationChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML', 
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
  
      // ctx.telegram.sendPhoto(supportChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
  
      if (user['club-typeclub'] === 'Шпрах-Клуб'){
        if (user['sc_request_torecord_usertoclub'] !== ''){
          const currentClub = await dbProcess.ShowData(new ObjectId(user['sc_request_torecord_usertoclub']));
          await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, new ObjectId(user['sc_request_torecord_usertoclub']));
          await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
          await set('sc_request_torecord_usertoclub')('');
        }
        else{
          const currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
          await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 5);
        }

        ctx.reply(script.speakingClub.thanksType.typeStandart(user['name']), {
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
        });
        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах-Клуб+PLUS'){
        ctx.reply(script.speakingClub.thanksType.typePlus, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: "A1.1",
                },
                {
                  text: "A1.2",
                },
              ],[
                {
                  text: "A2.1", //Added text
                },
                {
                  text: "A2.2", //Added text
                }
              ],
            ],
          },
        });
        await set('state')('RespondCourseAndGetMail')
      }
      else{
        ctx.reply(user['club-typeclub']);
      }
    }
    else if (CheckException.FileException(data)){
  
      // const inline = inlineApprovePayment(id, paymentStatus);
  
      const unique_file_id = data.file;
      
      // For Developer
      // ctx.telegram.sendDocument(id, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      // ctx.telegram.sendDocument(confirmationChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML', 
      //   //...Markup.inlineKeyboard(inline)
      //   }
      // )
  
      // ctx.telegram.sendDocument(supportChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], formattedDateRecord),
      //   parse_mode: 'HTML',
      //   //...Markup.inlineKeyboard(inline)
      //   }
      // )

      if (user['club-typeclub'] === 'Шпрах-Клуб'){
        if (user['sc_request_torecord_usertoclub'] !== ''){
          const currentClub = await dbProcess.ShowData(new ObjectId(user['sc_request_torecord_usertoclub']));
          await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, new ObjectId(user['sc_request_torecord_usertoclub']));
          await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
          await set('sc_request_torecord_usertoclub')('');
        }
        else{
          const currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
          await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 5);
        }

        ctx.reply(script.speakingClub.thanksType.typeStandart(user['name']), {
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
        });
        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах-Клуб+PLUS'){
        ctx.reply(script.speakingClub.thanksType.typePlus, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: "A1.1",
                },
                {
                  text: "A1.2",
                },
              ],[
                {
                  text: "A2.1", //Added text
                },
                {
                  text: "A2.2", //Added text
                }
              ],
            ],
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
          keyboard: [
            [
              {
                text: "A1.1",
              },
              {
                text: "A1.2",
              },
            ],[
              {
                text: "A2.1", //Added text
              },
              {
                text: "A2.2", //Added text
              }
            ],
          ],
        },
      });
    }
  })

  onTextMessage('RespondMailAndFinal', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);
    //set mail

    if (CheckException.TextException(data)){
      if (await dbProcess.SetMailForUser(ctx?.chat?.id ?? -1, data.text)){
        await set('sc_local_user_mail')(data.text);
        if (user['sc_request_torecord_usertoclub'] !== ''){
          const index = new ObjectId(user['sc_request_torecord_usertoclub']),
           currentClub = await dbProcess.ShowData(index);
          await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, new ObjectId(user['sc_request_torecord_usertoclub']));
          await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
          await set('sc_request_torecord_usertoclub')('');
        }
        else{
          const currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
          await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 5);
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
      paymentApprovedSeccussfully : boolean = true;

    if (CheckException.BackRoot(data)){

    }
    else if (CheckException.PhotoException(data)){
      ctx.telegram.sendPhoto(devChat, data.photo, {
        parse_mode: "HTML",
        caption: 'Work'
      });

      const club = await dbProcess.ShowData(new ObjectId(user['sc_triallesson_clubindex']));

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

      if (paymentApprovedSeccussfully){
        await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, new ObjectId(user['sc_triallesson_clubindex']))
        await dbProcess.ChangeKeyData(club!, 'count', club!.count - 1);

        await ctx.reply(script.speakingClub.report.acceptedTrialLesson(user['name'], club!.date, club!.time, club!.link), {
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
      }

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
    else if (currentUser!.count > 0){
      if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length + 1){
        const currentItemIndex = results.map(item => item._id)[parseInt(data.text) - 1],
          currentClub = await dbProcess.ShowData(currentItemIndex);
  
        if (currentClub!.count > 0){
          if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, currentItemIndex)){
            await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count - 1);
            await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
            await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, currentClub!._id);

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

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString, userHaved), {
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

      const keyboard = results.map(result => result._id).map((value : ObjectId, index : number) => {
        return [{ text: `${index + 1}` }];
      });

      await ctx.reply('Виберіть номер шпраха для редагування:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
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

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, results[i].date, results[i].time, addString, userHaved), {
          parse_mode: "HTML"
        });
      }
    }
    else if (data.text === 'Особові справи студентів'){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Показати всіх студентів"
              },
              {
                text: "Додати заняття студенту"
              }
            ],[
              {
                text: "Видалити студента"
              },
              {
                text: "Оновити дані студенту"
              }
            ],
            [
              {
                text: "В МЕНЮ"
              }
            ]
          ]
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (data.text === 'В МЕНЮ'){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ]
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

      ctx.reply('Вчитель:');
      await set('state')('ADD_RespondTeacherAndGetDate');
    }
  })

  onTextMessage('ADD_RespondTeacherAndGetDate', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      await set("AP_teacher")(data.text);

      ctx.reply('Коли (дата):');
      await set('state')('ADD_RespondDateAndGetTime');
    }
  })

  onTextMessage('ADD_RespondDateAndGetTime', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      await set('AP_date')(data.text);

      ctx.reply('Час:');
      await set('state')('ADD_RespondTimeAndGetCount');
    }
  })

  onTextMessage('ADD_RespondTimeAndGetCount', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      await set('AP_time')(data.text);

      ctx.reply('Кількість місць:');
      await set('state')('ADD_RespondCountAndGetLink');
    }
  })

  onTextMessage('ADD_RespondCountAndGetLink', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      if (parseInt(data.text) <= 5 && parseInt(data.text) > 0){
        await set('AP_count')(data.text);
  
        ctx.reply('Посилання:');
        await set('state')('ADD_RespondLinkAndCheckRight');
      }
      else{
        ctx.reply('Кількість місць не може бути більше 5-ти і менше або 0');
      }
    }
  })

  onTextMessage('ADD_RespondLinkAndCheckRight', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (CheckException.TextException(data)){
      await set('AP_link')(data.text);

      await ctx.reply(script.speakingClub.report.checkClub(user['AP_title'], user['AP_teacher'], user['AP_date'], user['AP_time'], data.text, parseInt(user['AP_count'])))
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
        teacher: user['AP_teacher'],
        date: user['AP_date'],
        time: user['AP_time'],
        count: parseInt(user['AP_count']),
        link: user['AP_link']
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
      const results = await dbProcess.ShowAll(),
        keyboard = results.map(result => result._id).map((value : ObjectId, index : number) => {
        return [{ text: `${index + 1}` }];
      });
      await ctx.reply('Помилка, видалення неможливе, так як цього елементу не існує.', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
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
            ]
          ],
        },
      });

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (data.text === 'ні'){
      await ctx.reply(`Поточна операція відмінена.`, {
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
            ]
          ],
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

      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Тема"
              },
              {
                text: "Викладач"
              },
            ],[
              {
                text: "Дата"
              },
              {
                text: "Час"
              },
            ],[
              {
                text: "Місця"
              },
              {
                text: "Посилання"
              }
            ]
          ]
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
    }
  })

  onTextMessage('GetChangesAndChangeThis', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (Key(data.text) !== null){
      await set('AP_keyforchange')(Key(data.text)!);

      ctx.reply("Введіть нові дані");
      await set('state')('ChangeThisAndCheckThis');
    }
    else{
      ctx.reply("Помилка", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Тема"
              },
              {
                text: "Викладач"
              },
            ],[
              {
                text: "Дата"
              },
              {
                text: "Час"
              },
            ],[
              {
                text: "Місця"
              },
              {
                text: "Посилання"
              }
            ]
          ]
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
    
          await dbProcess.ChangeKeyData(dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]), keyForChange, data.text);
          ctx.reply('Успішно виконана операція!', {
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
                ]
              ],
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
              ]
            ],
          },
        });

        await set('state')('RespondAdminActionAndRootChoose');
      }
    }
  })

  //Personal Student Handler
  onTextMessage('PeronalStudentHandler', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'Показати всіх студентів'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count));
      }
    }
    else if (data.text === 'Додати заняття студенту'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count));
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
        await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count));
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
    else if (data.text === 'В МЕНЮ'){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Пробний урок",
              },
            ],[
              {
                text: "Оплата занять",
              },
            ],[
              {
                text: "Запис на заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Адмін Панель"
              }
            ]
          ]
        }
      })

      await set('state')('FunctionRoot');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Показати всіх студентів"
              },
              {
                text: "Додати заняття студенту"
              }
            ],[
              {
                text: "Видалити студента"
              },
              {
                text: "В МЕНЮ"
              }
            ]
          ]
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
          keyboard: [
            [
              {
                text: "Показати всіх студентів"
              },
              {
                text: "Додати заняття студенту"
              }
            ],[
              {
                text: "Видалити студента"
              },
              {
                text: "В МЕНЮ"
              }
            ]
          ]
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (data.text === 'ні'){
      ctx.reply(`Поточну операцію відмінено.`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Показати всіх студентів"
              },
              {
                text: "Додати заняття студенту"
              }
            ],[
              {
                text: "Видалити студента"
              },
              {
                text: "В МЕНЮ"
              }
            ]
          ]
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError);
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

  bot.launch();
}

main();