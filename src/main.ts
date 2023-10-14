// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v3.5.3

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
import { time } from "console";
const confirmationChat = '437316791',
  supportChat = '6081848014',
  devChat = '740129506',
  versionBot = '3.5.3';

async function main() {
  const [ onTextMessage, onContactMessage, onPhotoMessage, bot, db, app, token, clubdb, dbProcess ] = await arch();

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
  
  //Get real user name and root to get phone number with this.function
  onTextMessage('WaitingForName', async (ctx, user, data) => {

    if (CheckException.TextException(data)){
      const formattedName = (name : String) => {
        const words = name.split(' ');
  
        const formattedWords = words.map(word => {
          const firstLetter = word.charAt(0).toUpperCase(),
            restOfWord = word.slice(1).toLowerCase();
          return firstLetter + restOfWord;
        });
  
        return formattedWords.join(' ');
      },
  
        name = formattedName(data.text),
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

    if (!CheckException.PhoneException(data)){
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

      await set('state')('FunctionRoot');
    }
  });

  // onTextMessage('FunctionRequest', async(ctx, user, data) => {
  //   const set = db.set(ctx?.chat?.id ?? -1);

  //   ctx.reply(script.entire.chooseFunction, {
  //     parse_mode: "Markdown",
  //     reply_markup: {
  //       one_time_keyboard: true,
  //       keyboard: [
  //         [
  //           {
  //             text: "Вчитель на годину",
  //           },
  //         ],[
  //           {
  //             text: "Пробний урок",
  //           },
  //         ],[
  //           {
  //             text: "Оплата занять",
  //           },
  //         ],[
  //           {
  //             text: "Запис на заняття"
  //           }
  //         ]
  //       ]
  //     }
  //   })
  //   await set('state')('FunctionRoot');
  // })

  onTextMessage('FunctionRoot', async (ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);
    if (data.text === "Вчитель на годину"){
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
              // {
              //   text: "Назад"
              // }
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
      ctx.reply("Виберіть одну із запропонованих кнопок(В розробці...)", {
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
      ctx.reply("В розробці...", {
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
                text: "Показати всі"
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
    if (data.text === 'Назад') {
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
    if (data.text === 'Назад'){
      ctx.reply(script.trialLesson.niceWhatATime, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Назад"
              }
            ]
          ]
        }
      });
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
              },
              // {
              //   text: "Назад"
              // }
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

    if (data.text === 'так, є'){
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
    else if (data.text === 'Назад'){
      ctx.reply(script.trialLesson.levelLanguageRequest, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Назад"
              }
            ]
          ]
        }
      });
      await set('state')('LevelRespondAndRequestQuestions');
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

    if (data.text === 'Назад'){
      ctx.reply(script.trialLesson.thanksAndGetQuestion(user['name']), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "маю",
              },
              {
                text: "не маю",
              },
              // {
              //   text: "Назад"
              // }
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
    else if (data.text === 'Назад до реєстрації'){
      ctx.reply("В розробці...", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "В МЕНЮ"
              },
              {
                text: "Назад до реєстрації"
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
    
    if (data.text === 'Рівень С1-С2' || data.text === 'Рівень В1-В2' || data.text === 'Рівень А1-А2'){
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
              },
              // {
              //   text: "Назад"
              // }
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

    if (data.text === 'Назад'){
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
              }
            ],
            [
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

    if (CheckException.PhotoException(data)){
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
    if (data.text === 'Назад'){
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
              },
              // {
              //   text: "Назад"
              // }
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
    if (data.text === 'Назад'){
      const courses = getCourses(user['course'] as Courses);
      set('course')(user['course']);
  
      console.log('Courses\n' + user['course']);
      console.log(courses);

      // const newButton = [
      //   {
      //     text: 'Назад',
      //   }
      // ];
  
      //skiping process
      const keyboard = courses.map((el: Course, idx) => {
        const displayedIndex : number = idx + 1;
        if (courseNumbersToSkip[user['course']].includes(displayedIndex)) return null;
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

    if (data.text === 'Назад'){
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
              // {
              //   text: "Назад"
              // }
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
              },
              // {
              //   text: "Назад"
              // }
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

    if (data.text === 'Назад'){
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

    if (data.text === 'Назад'){
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
              },
              {
                text: "Назад"
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

  // onTextMessage('MoreOrderTeacher', async (ctx, user, data) => {
  //   const set = db.set(ctx?.chat?.id ?? -1);
  //   console.log('MoreOrderTeacher');

  //   if(data.text != 'Замовити ще одну зустріч') return;
    
  //   ctx.reply(script.teacherOnHour.whatsTheProblem, {
  //     parse_mode: "Markdown",
  //     reply_markup: {
  //       one_time_keyboard: true,
  //       keyboard: [
  //         [
  //           {
  //             text: "A1.1",
  //           },
  //           {
  //             text: "A1.2",
  //           },
  //           {
  //             text: "A2.1", //Added text
  //           },
  //           {
  //             text: "A2.2", //Added text
  //           },
  //         ],
  //       ],
  //     },
  //   });
  //   await set('state')('ChoosingCourses');
  // });

  onTextMessage('_GraphicRespondAndLevelRequest', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    if (data.text === 'Назад'){
      ctx.reply(script.entire.chooseFunction, {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: [
          [
            {
              text: "Вчитель на годину",
            },
            {
              text: "Пробний урок",
            },
            {
              text: "Оплата занять",
            },
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

    if (data.text === 'Назад'){
      ctx.reply(script.registrationLesson.niceWhatATime, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              // {
              //   text: "Назад"
              // }
            ]
          ]
        }
      });
      await set('state')('_GraphicRespondAndLevelRequest');
    }
    else if (CheckException.TextException(data)){
      await set('_languagelevel')(data.text);
  
      await ctx.reply(script.registrationLesson.thanks(user['name'], user['_graphic']));
      // await ctx.reply(script.registrationLesson.getQuestion, {reply_markup: {remove_keyboard: true}});
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

    if (data.text === 'Назад'){
      ctx.reply(script.registrationLesson.levelLanguageRequest, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Назад"
              }
            ]
          ]
        }});
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

    if (data.text === 'Пробне заняття'){
      ctx.reply(script.speakingClub.trialLesson, {
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
      //process
    }
    else if (data.text === 'Залишок моїх занять'){
      let number : number = 0
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

    if (data.text === 'так'){
      ctx.reply('В розробці', {
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
      //process
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

    if (data.text === 'Шпрах-Клуб'){
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
                },
                // {
                //   text: "Назад"
                // }
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
                },
                // {
                //   text: "Назад"
                // }
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

  onTextMessage('RespondMailAndFinal', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    //set mail

    if (CheckException.TextException(data)){
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
              },
              // {
              //   text: "Назад"
              // }
            ],
          ],
        },
      });

      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException, {reply_markup: {remove_keyboard: true}});
    }
  })


  // Admin Panel (start)
  onTextMessage('RespondAdminActionAndRootChoose', async(ctx, user, data) => {
    const set = db.set(ctx?.chat?.id ?? -1);

    // [
    //   {
    //     text: "Додати"
    //   },
    //   {
    //     text: "Редагувати"
    //   }
    // ],[
    //   {
    //     text: "Показати всі"
    //   }
    // ]

    if (data.text === 'Додати'){
      const toWrite = {
        title: "Bio-Lebensmittel",
        teacher: "Марія Безчасна",
        date: "21 жовтня (сб)",
        time: "11:00 🇺🇦",
        count: 0,
        link: "Join Zoom Meeting\nhttps://us05web.zoom.us/j/5772747295?pwd=LFYDZrwERokE6KRwKyRTCx1wIazWp7.1\n\nMeeting ID:  577 274 7295\nPasscode: P0iVrL"
      }
      await dbProcess.AddData(toWrite);
    }
    else if (data.text === 'Редагувати'){
  
    }
    else if (data.text === 'Показати всі'){
      (await dbProcess.ShowAll()).forEach((collect) => {
        let addString : string = '';
        if (collect.count > 0){
          addString = `кількість доступних місць: ${collect.count}`;
        }
        else{
          addString = `❌ немає вільних місць ❌`;
        }
        ctx.reply(`🗣 ШРАХ-КЛУБ
👉🏼 Тема: ${collect.title}
👉🏼 Викладач: ${collect.teacher}\n
👉🏼 Коли: ${collect.date}
👉🏼 На котру: ${collect.time}\n
${addString}`
      )});
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