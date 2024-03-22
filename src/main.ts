// DehtoBot for dehto German Course
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v2.0 Rebirth

// Main File
import script from "./data/general/script";
import packet from "./data/course/packets";
import * as schedule from 'node-schedule';
import { confirmationChat, supportChat, devChat, versionBot, eugeneChat } from './data/general/chats';
import { CheckException } from "./base/handlers/check";
import arch from './base/main/architecture';
import getCourses, { Course, Courses, courseNumbersToSkip } from "./data/course/coursesAndTopics";
import Key from "./base/handlersdb/changeKeyValue";
import Role, { ConvertRole } from "./base/handlersdb/changeRoleValue";
import keyboards, { checkChats } from "./data/keyboard/keyboards";
import { ConvertToPrice, ConvertToPacket } from "./data/process/convertPaymentPerLesson";
import { inlineApprovePayment, inlineAcceptOncePayment, inlineAcceptOncePaymentWithoutClub, 
  inlineAcceptPacketPayment, inlineAcceptClubWithPacketPayment, inlineEventAnnouncementClub } 
  from "./data/keyboard/paymentButtons";
import formattedName from "./data/process/nameFormatt";
import DateRecord from "./base/handlers/getTime";
import MongoDBReturnType from "./data/general/mongoDBType";
import { Markup, TelegramError } from "telegraf";
import { ObjectId } from 'mongodb';

async function main() {
  const [ onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, db, dbProcess ] = await arch();

  //Begin bot work, collecting user data (his telegram name) set up state_1
  bot.start( (ctx) => {
    console.log('STARTED');

    try {
      ctx.reply(script.entire.greeting, {reply_markup: { remove_keyboard: true }});
    } catch (error) {
      if (error instanceof TelegramError && error.code === 403) {
        console.warn('\nThe user blocked the active bot, the message was not sent to one of the recipients');
      } else {
        console.error('Error sending message for user: ', error);
      }
    }
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
        keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role ?? 'guest')
      }
    })

    await set('state')('FunctionRoot');
  });

  schedule.scheduleJob('0 */2 * * *', async () => {
    await dbProcess.DeleteExpiredClubs();
  });

  //Get real user name and root to get phone number with this.function
  onTextMessage('WaitingForName', async (ctx, user, set, data) => {
    if (CheckException.TextException(data)){
      const name = formattedName(data.text);
      
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
  onContactMessage('AskingForPhoneNumber', async (ctx, user, set, data) => {
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
        await dbProcess.UpdateUserData(userObject._id, data.phone_number, user['username']);
      }
      else dbProcess.AddUser({ id: ctx?.chat?.id ?? -1, name: user['name'], number: data.phone_number, username: user['username'], role: 'guest', count: 0 });

      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
        }
      })

      await set('state')('FunctionRoot');
    }
  });

  onTextMessage('FunctionRoot', async (ctx, user, set, data) => {
    const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

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
    else if (data.text === 'Індивідуальні заняття' || data.text === 'Мої індивідуальні заняття'){
      ctx.reply(script.indivdual.entire(userI!.role), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(userI!.role)
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
    else if (data.text === "Розмовні клуби"){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu()
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (data.text === 'sysinfo'){
      ctx.reply(script.about(versionBot), {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: 'В МЕНЮ'}]]
        }
      })
    }
    else if (data.text === "Адмін Панель" && checkChats(ctx?.chat?.id ?? -1)){
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
                text: "Особові справи"
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
    else if (data.text === 'Мої Шпрах-клуби'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();

      // For Teachers
      for (let i = 0; i < results.length; i++){
        if (parseInt(results[i].teacher_id) === ctx?.chat?.id ?? -1){
          let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
          for (let j = 0; j < users.length; j++) {
            if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
              userHaved += `- ${users[j].name} (@${users[j].username})\n📲${users[j].number}\n\n`;
            }
          }
            if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
              userHaved = '';
            }

            let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;
  
          await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, results[i].documentation, { caption: script.speakingClub.report.showClubTypeTeacher(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link), 
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

  onTextMessage('IndividualHandler', async(ctx, user, set, data) => {
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else if (data.text === "Пробне заняття" && userObject!.role === 'guest'){
      ctx.reply(script.trialLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('GraphicRespondAndCountRequest');
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
    else if (data.text === 'Баланс моїх занять' && userObject!.role === 'student'){
      const count = 1;
      if (count > 0){
        ctx.reply(`✅ Баланс ваших індивідуальних занять ${count} занять (${count * 60} хв)`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.indiviualMenu(userObject!.role)
          }
        })
      }
      else{
        ctx.reply(`😢 ${user['name']} у вас немає проплачених занять, будемо продовжувати?`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo(true)
          }
        })

        await set('state')('NotEnoughIndividualLessonsHandler');
      }
    }
    else if (data.text === "Запис на заняття"){
      ctx.reply(script.registrationLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('_GraphicRespondAndLevelRequest');
    }
    else if (data.text === 'В МЕНЮ'){
      console.log('FunctionRoot');
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject!.role)
        }
      })
      await set('state')('FunctionRoot');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(userObject!.role)
        }
      })
    }
  })

  onTextMessage('GraphicRespondAndCountRequest', async(ctx, user, set, data) => {
    const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

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
      ctx.reply(script.trialLesson.countOfLessonsRequest, {reply_markup: {remove_keyboard: true}})
      await set('state')('CountRespondAndLevelRequest');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('CountRespondAndLevelRequest', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)) {
      ctx.reply(script.trialLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('GraphicRespondAndCountRequest');
    }
    else if (CheckException.TextException(data)){
      await set('countOfLessons')(data.text);
      ctx.reply(script.trialLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('LevelRespondAndRequestQuestions');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('LevelRespondAndRequestQuestions', async (ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(script.trialLesson.niceWhatATime, {reply_markup: {remove_keyboard: true}});
      await set('state')('GraphicRespondAndLevelRequest')
    }
    else if (CheckException.TextException(data)){
      await set('languagelevel')(data.text);
  
      ctx.reply(script.trialLesson.goalLearnRequest);
      await set('state')('RespondGoalAndSendData');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('RespondGoalAndSendData', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(script.trialLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('LevelRespondAndRequestQuestions');
    }
    else if (CheckException.TextException(data)){
      // For Developer
      ctx.telegram.sendMessage(devChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, DateRecord()),
        {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(confirmationChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, DateRecord()),
        {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(supportChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, DateRecord()),
        {parse_mode: 'HTML'})

      ctx.telegram.sendMessage(eugeneChat,
        script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, DateRecord()),
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

  onTextMessage('NotEnoughIndividualLessonsHandler', async(ctx, user, set, data) => {
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else{
      switch(data.text){
        case "Так":
          ctx.reply(script.payInvidualLesson.chooseLevelCourse, {
            parse_mode: "Markdown",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.chooseLevelCourses()
            },
          });
          await set('state')('RespondCourseAndGetPacket');
          break;

        case "Ні":
          ctx.reply('тоді гарного дня!🌱', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.indiviualMenu(userObject!.role)
            }
          })
          await set('state')('IndividualHandler');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo(true)
            }
          })
          break;
      }
    }
  })

  onTextMessage('EndRootManager', async(ctx, user, set, data) => {
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

        await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString), {
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

  onTextMessage('RespondCourseAndGetPacket', async(ctx, user, set, data) => {
    const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    
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

  onTextMessage('RespondPacketAndGetPayment', async(ctx, user, set, data) => {
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

  onPhotoMessage('RespondPaymentAndSendData', async(ctx, user, set, data) => {
    const id = ctx?.chat?.id ?? -1,
      get = db.get(ctx?.chat?.id ?? -1);
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
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.photo;
  
      // For Developer
      // ctx.telegram.sendPhoto(devChat, unique_file_id, {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendPhoto(confirmationChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendPhoto(supportChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendPhoto(eugeneChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
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
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.file;
  
      // For Developer
      // ctx.telegram.sendDocument(devChat, unique_file_id, {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
      //   parse_mode: 'HTML',
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendDocument(confirmationChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendDocument(supportChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendDocument(eugeneChat, unique_file_id, {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
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
  onTextMessage('HaveAdditionalQuestion', async (ctx, user, set, data) => {
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

  onTextMessage('AnswerForAdditionalQuestions', async (ctx, user, set, data) => {
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

  onTextMessage('AdditionalQuestions', async (ctx, user, set, data) => {
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

  onTextMessage('ChoosingCourses', async (ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu()
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

  onPhotoMessage('WaitingForPayment', async (ctx, user, set, data) => {
    const id = ctx?.chat?.id ?? -1,
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
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.photo;
      
      // For Developer
      // ctx.telegram.sendPhoto(devChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
      //   parse_mode: 'HTML', 
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendPhoto(confirmationChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendPhoto(supportChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendPhoto(eugeneChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
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
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.file;
      
      // For Developer
      // ctx.telegram.sendDocument(devChat, unique_file_id, {
      //   caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
      //   parse_mode: 'HTML', 
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
      
      ctx.telegram.sendDocument(confirmationChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML', 
        ...Markup.inlineKeyboard(inline)
        }
      )
  
      ctx.telegram.sendDocument(supportChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inline)
        }
      )

      ctx.telegram.sendDocument(eugeneChat, unique_file_id, {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
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

  onTextMessage('_GraphicRespondAndLevelRequest', async(ctx, user, set, data) => {
    const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

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

  onTextMessage('_LevelRespondAndRequestQuestions', async(ctx, user, set, data) => {
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

  onTextMessage('_GetQuestionsAndSendData', async(ctx, user, set, data) => {
    const id = ctx?.chat?.id ?? -1;

    if (CheckException.BackRoot(data)){
      ctx.reply(script.registrationLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('_LevelRespondAndRequestQuestions');
    }
    else if (CheckException.TextException(data)){
      await set('_addquesttrial')(data.text);
      
      // For Developer
      // ctx.telegram.sendMessage(devChat,
      //   script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
      //   { parse_mode: 'HTML' });
  
      ctx.telegram.sendMessage(confirmationChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
        { parse_mode: 'HTML' });
  
      ctx.telegram.sendMessage(supportChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
        { parse_mode: 'HTML' });

      ctx.telegram.sendMessage(eugeneChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
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
  onTextMessage('ActionClubRespondAndRootAction', async(ctx, user, set, data) => {
    const userA = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userA!.role),
        },
      });
    }
    else if (data.text === 'Реєстрація на клуб'){
      if (userA!.role !== 'teacher'){
        const results = await dbProcess.ShowAll();
      
        for (let i = 0; i < results.length; i++) {
          let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;
  
          await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString), {
            parse_mode: "HTML"
          });
        }
  
        await ctx.reply('виберіть номер клуба для запису:', {
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
    else if (data.text === 'Оплатити заняття'){
      const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      if (user!.role !== 'teacher'){
        ctx.reply(script.speakingClub.payPacketLesson, {
          parse_mode: "HTML",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.payPacketLessons()
          },
        });
        await set('temp-prev-state')('menu-state');
        await set('state')('RespondTypePacketAndGetPayment');
      }
      else{
        ctx.reply('викладачі не можуть оплачувати заняття.')
      }
    }
    else if (data.text === 'Мої Шпрах-клуби'){
      const userActiveClubs = await dbProcess.getUserActiveClubs(ctx?.chat?.id ?? -1);

      if (userActiveClubs){
        await ctx.reply(script.speakingClub.report.mySpeackingClub.ifTrue);
        for (let i = 0; i < userActiveClubs.length; i++){
          const actualClubData = await dbProcess.ShowData(new ObjectId(userActiveClubs[i]))

          await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1,
            actualClubData!.documentation,
            {caption: script.speakingClub.report.showOwnClubToUser(i + 1, actualClubData!.title, actualClubData!.teacher,
              dbProcess.getDateClub(new Date(actualClubData!.date)), actualClubData!.time, actualClubData!.link)}
          );
        }

        ctx.reply('це всі ваші клаби :)', {
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
        await ctx.reply(script.speakingClub.report.mySpeackingClub.ifFalse, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'так'
                },
                {
                  text: 'ні'
                }
              ]
            ]
          }
        })

        await set('state')('MyClubEmptyHandler');
      }
    }
    else if (data.text === 'Про шпрах-клуб'){
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
          keyboard: await keyboards.speakingClubMenu()
        },
      });
    }
  })

  // My Club Empty Handler
  onTextMessage('MyClubEmptyHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu()
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (data.text === 'так'){
      const results = await dbProcess.ShowAll();
      
      for (let i = 0; i < results.length; i++) {
        let addString : string = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;

        await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString), {
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
    else if (data.text === 'ні'){
      ctx.reply(script.speakingClub.defaultDecline, {
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

      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'так'
              },
              {
                text: 'ні'
              }
            ]
          ]
        }
      });
    }
  })

  // Check count of lessons and pay more if it need
  onTextMessage('RespondCheckLessonsAndGetLessons', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu()
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (data.text === 'так'){
      await set('temp-prev-state')('countCheck-state');
      ctx.reply(script.speakingClub.payPacketLesson, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
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
  onTextMessage('RespondTypePacketAndGetPayment', async(ctx, user, set, data) => {
    const prevState = user['temp-prev-state'],
      currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data) && prevState === 'clubList-state'){
      const results = await dbProcess.ShowAll();
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
          if (results[i].count > 0) {
            addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, dbProcess.getDateClub(new Date(results[i].teacher)), results[i].date, results[i].time, addString), {
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
    else if (CheckException.BackRoot(data) && prevState === 'menu-state'){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu()
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (CheckException.BackRoot(data) && prevState === 'countCheck-state'){
      if (currentUser!.count > 0){
        ctx.reply(script.speakingClub.lessLessons(currentUser!.count), {
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
        ctx.reply(script.speakingClub.lessLessons(currentUser!.count), {
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
    else if (data.text === 'Разове заняття'){
      ctx.reply(script.speakingClub.onceClub);
      await set('club-typeclub')('РазовеЗаняття');
      await set('state')('RespondPaymentAndGetCourseOrFinal');
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
          keyboard: keyboards.payPacketLessons()
        },
      })
    }
  })

  onPhotoMessage('RespondPaymentAndGetCourseOrFinal', async(ctx, user, set, data) => {
    const id = ctx?.chat?.id ?? -1,
      get = db.get(id),
      clubIndex = user['sc_request_torecord_usertoclub'];

    if (CheckException.BackRoot(data)){
      ctx.reply(script.speakingClub.payPacketLesson, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
        },
      });
      await set('state')('RespondTypePacketAndGetPayment');
    }
    else if (CheckException.PhotoException(data)){
      await set('paymentStatusClubOrPacket')('unknown');
      const paymentStatus = await get('paymentStatusClubOrPacket') ?? 'unknown',
        unique_file_id = data.photo;
  
      if (user['club-typeclub'] === 'РазовеЗаняття'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptOncePayment(id, clubIndex, paymentStatus, date);

          await ctx.telegram.sendPhoto(devChat, unique_file_id, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await ctx.telegram.sendPhoto(supportChat, unique_file_id, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptOncePaymentWithoutClub(id, paymentStatus, date);

          // await ctx.telegram.sendPhoto(devChat, unique_file_id, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          await ctx.telegram.sendPhoto(supportChat, unique_file_id, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }

        await ctx.reply('Ваше замовлення прийнято, очікуйте на підтвердження', {
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

        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах-Клуб'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptClubWithPacketPayment(id, clubIndex, paymentStatus, 's', date);

          // packet and club
          // For Developer
          // await ctx.telegram.sendPhoto(devChat, unique_file_id, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          await ctx.telegram.sendPhoto(supportChat, unique_file_id, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 's');

          //packet
          // For Developer
          // await ctx.telegram.sendPhoto(devChat, unique_file_id, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          await ctx.telegram.sendPhoto(supportChat, unique_file_id, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        
        await ctx.reply('Ваше замовлення прийнято, очікуйте на підтвердження', {
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

      if (user['club-typeclub'] === 'РазовеЗаняття'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptOncePayment(id, clubIndex, paymentStatus, date);

          // For Developer
          // await ctx.telegram.sendDocument(devChat, data.file, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          await ctx.telegram.sendDocument(supportChat, data.file, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptOncePaymentWithoutClub(id, paymentStatus, date);

          // For Developer
          // await ctx.telegram.sendDocument(devChat, data.file, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          await ctx.telegram.sendDocument(supportChat, data.file, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
      }
      else if (user['club-typeclub'] === 'Шпрах-Клуб'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptClubWithPacketPayment(id, clubIndex, paymentStatus, "s", DateRecord());

          // For Developer
          // ctx.telegram.sendDocument(devChat, data.file, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          ctx.telegram.sendDocument(supportChat, data.file, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 's');

          // For Developer
          // ctx.telegram.sendDocument(devChat, data.file, {
          //   parse_mode: "HTML",
          //   caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
          //   ...Markup.inlineKeyboard(inline)
          // })

          ctx.telegram.sendDocument(supportChat, data.file, {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
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

  onTextMessage('RespondCourseAndGetMail', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(script.speakingClub.plusClub, {reply_markup: {remove_keyboard: true}});
      await set('state')('RespondPaymentAndGetCourseOrFinal');
    }
    else if (data.text === 'A1.1' || data.text === 'A1.2' || data.text === 'A2.1' || data.text === 'A2.2'){
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

  onTextMessage('RespondMailAndFinal', async(ctx, user, set, data) => {
    const get = db.get(ctx?.chat?.id ?? -1);
    //set mail

    if (CheckException.BackRoot(data)){
      ctx.reply(script.speakingClub.thanksType.typePlus, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      });
      await set('state')('RespondCourseAndGetMail')
    }
    else if (CheckException.TextException(data)){
      await set('paymentStatusClubOrPacket')('unknown');
      const paymentStatus = await get('paymentStatusClubOrPacket') ?? 'unknown',
        typeOfProof = user['sc_clubplus_typeproof'],
        course = user['club-coursename'];

      if (await dbProcess.SetMailForUser(ctx?.chat?.id ?? -1, data.text)){
        await set('sc_local_user_mail')(data.text);
        const date = DateRecord();
        if (user['sc_request_torecord_usertoclub'] !== ''){
          if (typeOfProof === 'photo'){
            const inline = inlineAcceptClubWithPacketPayment(ctx?.chat?.id ?? -1, user['sc_request_torecord_usertoclub'], paymentStatus, 'p', DateRecord());
  
            // For Developer
            // ctx.telegram.sendPhoto(devChat, user['sc_clubplus_proof'], {
            //   parse_mode: "HTML",
            //   caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
            //   ...Markup.inlineKeyboard(inline)
            // })

            ctx.telegram.sendPhoto(supportChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptClubWithPacketPayment(ctx?.chat?.id ?? -1, user['sc_request_torecord_usertoclub'], paymentStatus, 'p', DateRecord());
  
            // For Developer
            // ctx.telegram.sendDocument(devChat, user['sc_clubplus_proof'], {
            //   parse_mode: "HTML",
            //   caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
            //   ...Markup.inlineKeyboard(inline)
            // })

            ctx.telegram.sendDocument(supportChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }

          await set('sc_request_torecord_usertoclub')('');
        }
        else{
          if (typeOfProof === 'photo'){
            const inline = inlineAcceptPacketPayment(ctx?.chat?.id ?? -1, paymentStatus, 'plus');

            // For Developer
            // ctx.telegram.sendPhoto(devChat, user['sc_clubplus_proof'], {
            //   parse_mode: "HTML",
            //   caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
            //   ...Markup.inlineKeyboard(inline)
            // })

            ctx.telegram.sendPhoto(supportChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptPacketPayment(ctx?.chat?.id ?? -1, paymentStatus, 'plus');

            // For Developer
            // ctx.telegram.sendDocument(devChat, user['sc_clubplus_proof'], {
            //   parse_mode: "HTML",
            //   caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
            //   ...Markup.inlineKeyboard(inline)
            // })

            ctx.telegram.sendDocument(supportChat, user['sc_clubplus_proof'], {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
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

  //Club Registration (start)
  onTextMessage('GetClubToRegistrationAndCheckPayment', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAll(),
      currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu()
        },
      });

      await set('state')('ActionClubRespondAndRootAction');
    }
    else if (currentUser!.count > 0){
      if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length + 1){
        const currentItemIndex = results.map(item => item._id)[parseInt(data.text) - 1],
          currentClub = await dbProcess.ShowData(currentItemIndex),
          currentUser = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
          users = await dbProcess.ShowAllUsers();

        let recordedUsers = '';
  
        if (currentClub!.count > 0){
          if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, currentItemIndex)){
            await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count - 1);
            await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1);
            await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, currentClub!._id);

            for(let i = 0; i < users.length; i++){
              if (await dbProcess.HasThisClubUser(users[i].id, currentClub!._id)){
                recordedUsers += `- ${users[i].name} (@${users[i].username})\n📲${users[i].number}\n\n`;
              }
            }
        
            //Send Message To Teacher
            await ctx.telegram.sendMessage(currentClub!.teacher_id, script.speakingClub.report.reportToTeacherNewOrder(currentClub!.title, currentClub!.teacher, 
              dbProcess.getDateClub(new Date(currentClub!.date)), currentClub!.time, currentClub!.count - 1, recordedUsers));
            
            await ctx.reply('Обробка, зачекайте, будь ласка...');

            if (currentUser!.count === 1){
              // For Developer
              await ctx.telegram.sendMessage(devChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
                
              await ctx.telegram.sendMessage(confirmationChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
                
              // await sheets.changeAvaibleLessonStatus(ctx?.chat?.id ?? -1, false);
            }
            
            await ctx.reply(script.speakingClub.registrationLesson.acceptedRegistration(user['name'], dbProcess.getDateClub(new Date(currentClub!.date)), 
            currentClub!.time, currentClub!.link), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: await keyboards.speakingClubMenu()
              }
            });
            
            await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, currentClub!.documentation, {
              caption: `ось файл із лексикою, яка допоможе Вам на шпрах-клубі ;)`}
            )

            // await sheets.appendLessonToUser(currentUser!.id, currentUser!.name, currentUser!.number, currentUser!.username, currentUser!.email !== undefined ? currentUser!.email : 'пошта відсутня',
            //   DateRecord(), currentClub!.title, currentClub!.teacher);

            await set('state')('ActionClubRespondAndRootAction');
          }
          else{
            ctx.reply('ви вже зареєстровані на цей шпрах! виберіть інший', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
                  return [{ text: `${index + 1}` }];
                })
              }
            });
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
            ctx.reply('ви вже зареєстровані на цей шпрах! виберіть інший', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
                  return [{ text: `${index + 1}` }];
                })
              }
            });
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

  onTextMessage('RegistrationChooseHandlerPayment', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const results = await dbProcess.ShowAll();
      let addString : string = '';
    
      for (let i = 0; i < results.length; i++) {
          if (results[i].count > 0) {
            addString = `<b>кількість доступних місць</b>: ${results[i].count}`;
          } else {
            addString = `❌ немає вільних місць ❌`;
          }

        await ctx.reply(script.speakingClub.report.showClub(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString), {
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
    else if (data.text === 'так'){
      ctx.reply(script.speakingClub.payPacketLesson, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
        },
      });
      await set('temp-prev-state')('clubList-state');
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
  onTextMessage('AdminRootHandler', async(ctx, user, set, data) => {
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else if (data.text === 'Шпрах-Клуби'){
      ctx.reply("Добренько, і що на цей раз?)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (data.text === 'Особові справи'){
      ctx.reply('Прекрасно, над ким сьогодні будемо знущатись?)', {
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
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Шпрах-Клуби"
              },
              {
                text: "Особові справи"
              }
            ],[
              {
                text: "В МЕНЮ"
              }
            ]
          ],
        }}
      );
    }
  })

  // Admin Panel (start)
  onTextMessage('RespondAdminActionAndRootChoose', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
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
                text: "Особові справи"
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
    else if (data.text === 'Додати'){
      ctx.reply("Тема:");
      await set('state')('ADD_RespondTitleAndGetTeacher');
    }
    else if (data.text === 'Видалити'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }

          let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link), {
          parse_mode: "HTML"
        });
      }

      await ctx.reply('Виберіть номер шпраха для видалення:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('DeleteClubAndCheckAction');
    }
    else if (data.text === 'Редагувати'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }

          let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link), {
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
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
        if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
          userHaved = '';
        }

        let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;

        await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, results[i].documentation, {
          parse_mode: "HTML",
          caption: script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link),
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.spekingClubAdminPanel()
          }
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
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })
    }
  });

  //Add Method
  onTextMessage('ADD_RespondTitleAndGetTeacher', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Добренько, і що на цей раз?)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (CheckException.TextException(data)){
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
    else{
      ctx.reply(script.errorException.textGettingError.defaultException, {reply_markup: {remove_keyboard: true}});
    }
  })

  onTextMessage('ADD_RespondTeacherAndGetDate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Тема:", {reply_markup: {remove_keyboard: true}});
      await set('state')('ADD_RespondTitleAndGetTeacher');
    }
    else if (CheckException.TextException(data)){
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

  onTextMessage('ADD_RespondDateDayAndGetDateMonth', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
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
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) <= 31 && parseInt(data.text) >= 1){
        await set('AP_date_day')(data.text);
  
        ctx.reply('Коли (місяць):');
        await set('state')('ADD_RespondDateMonthAndGetDateYear');
      }
      else{
        ctx.reply(`А є такий день, як ${data.text}?\n\nПовторіть, будь ласка, ще раз.`);
      }
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondDateMonthAndGetDateYear', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Коли (день):', {reply_markup: {remove_keyboard: true}});
      await set('state')('ADD_RespondDateDayAndGetDateMonth');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) <= 12 && parseInt(data.text) >=1){
        await set('AP_date_month')(data.text);
  
        ctx.reply('Коли (рік):');
        await set('state')('ADD_RespondDateAndGetTime');
      }
      else{
        ctx.reply(`Серйозно? Місяць ${data.text}?\n\nПовторіть, будь ласка, ще раз.`);
      }
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondDateAndGetTime', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Коли (місяць):');
      await set('state')('ADD_RespondDateMonthAndGetDateYear');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, true)){
      const currentDate = new Date();
      if (new Date(`${parseInt(data.text)}-${user['AP_date_month']}-${user['AP_date_day']}`) >= new Date(`${currentDate.getFullYear}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`)){
        if (currentDate.getFullYear() + 1 >= parseInt(data.text)){
          await set('AP_date_year')(data.text);
    
          ctx.reply('Час (години):');
          await set('state')('ADD_RespondTimeHourAndGetMinute');
        }
        else{
          ctx.reply(`Ого, то це такі будуть клаби в ${data.text}! Дуже цікаво!)\n\nПовторіть, будь ласка, ще раз`);
        }
      }
      else{
        ctx.reply('О то це клаб з минулого! Приємні спогади)\n\nПовторіть, будь ласка, ще раз');
      }
    }
    else{
      ctx.reply('Це повинна бути чотрьохзначна цифра');
    }
  })

  onTextMessage('ADD_RespondTimeHourAndGetMinute', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Коли (рік):');
      await set('state')('ADD_RespondDateAndGetTime');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) <= 23 && parseInt(data.text) >= 4){
        await set('AP_time_hour')(data.text);
  
        ctx.reply('Час (хвилини):');
        await set('state')('ADD_RespondTimeAndGetCount');
      }
      else{
        ctx.reply(`Скіко? Баба не чує! Як це ${data.text}\n\nПовторіть, будь ласка, ще раз`);
      }
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondTimeAndGetCount', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Час (години):');
      await set('state')('ADD_RespondTimeHourAndGetMinute'); 
    }
    else if (CheckException.TextException(data)){
      if (parseInt(data.text) >= 0 && parseInt(data.text) <= 59){
        await set('AP_time_minute')(data.text);
  
        ctx.reply('Кількість місць:');
        await set('state')('ADD_RespondCountAndGetLink');
      }
      else{
        ctx.reply('Я стільки хвилин ще не бачив...\n\nПовіторіть, будь ласка, ще раз')
      }
    }
    else{
      ctx.reply('Це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondCountAndGetLink', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Час (хвилини):');
      await set('state')('ADD_RespondTimeAndGetCount');
    }
    else if (CheckException.TextException(data)){
      if (parseInt(data.text) <= 5 && parseInt(data.text) > 0){
        await set('AP_count')(data.text);
  
        ctx.reply('Документація:');
        await set('state')('ADD_RespondDocumentationAndGetLink');
      }
      else{
        ctx.reply('Кількість місць не може бути більше 5-ти і менше або 0');
      }
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onDocumentationMessage('ADD_RespondDocumentationAndGetLink', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Кількість місць:');
      await set('state')('ADD_RespondCountAndGetLink');
    }
    else if (CheckException.FileException(data)){
      await set('AP_documentation')(data.file);

      ctx.reply('Посилання:');
      await set('state')('ADD_RespondLinkAndCheckRight');
    }
    else{
      ctx.reply('Це не схоже на файл типу PDF');
    }
  })

  onTextMessage('ADD_RespondLinkAndCheckRight', async(ctx, user, set, data) => {
    const datePart = `${user['AP_date_day']}-${user['AP_date_month']}-${user['AP_date_year']} (${dbProcess.getDateClub(new Date(`
        ${user['AP_date_year']}-${user['AP_date_month']}-${user['AP_date_day']}`))})`;

    if (CheckException.BackRoot(data)){
      ctx.reply('Документація:');
      await set('state')('ADD_RespondDocumentationAndGetLink');
    }
    else if (CheckException.TextException(data)){
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
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('ADD_CheckHandlerAndRoot', async(ctx, user, set, data) => {
    const users = await dbProcess.ShowAllUsers();

    if (CheckException.BackRoot(data)){
      ctx.reply('Посилання:');
      await set('state')('ADD_RespondLinkAndCheckRight');
    }
    else if (data.text === 'так'){
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
      const currentData = await dbProcess.AddData(toWrite);

      for (let i = 0; i < users.length; i++){
        const inline = inlineEventAnnouncementClub(users[i].id, currentData.insertedId.toString());
        ctx.telegram.sendMessage(users[i].id, script.speakingClub.report.announcementClub(toWrite.title,
          toWrite.teacher, dbProcess.getDateClub(new Date(toWrite.date)), toWrite.time), 
          {
            reply_markup: {inline_keyboard: inline},
            parse_mode: 'HTML',
          },
        )
      }

      ctx.telegram.sendMessage(user['AP_teacher_id'], `Ви були додані на клуб ${toWrite.title}`);
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
  onTextMessage('DeleteClubAndCheckAction', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAll();

    if (CheckException.BackRoot(data)){
      ctx.reply("Добренько, і що на цей раз?)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length) {
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

  onTextMessage('CheckingActionDeleteAndReturn', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAll(),
      users = await dbProcess.ShowAllUsers(),
      indexToDelete = user['AP_DeleteHandler_indextodelete'],
      deleteItem = results.map(result => result._id)[parseInt(indexToDelete) - 1],
      dataItem = await dbProcess.ShowData(deleteItem);

    if (CheckException.BackRoot(data)){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }

          let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link), {
          parse_mode: "HTML"
        });
      }

      await ctx.reply('Виберіть номер шпраха для видалення:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('DeleteClubAndCheckAction');
    }
    else if (data.text === 'так'){
      dbProcess.DeleteData(deleteItem);

      await ctx.telegram.sendMessage(dataItem!.teacher_id, `❌ ${dataItem!.teacher}, клуб ${dataItem!.title} (${dbProcess.getDateClub(new Date(dataItem!.date))} о ${dataItem!.time} 🇺🇦) був видалений адміністратором і його більше не існує.`);
      for (let i = 0; i < users.length; i++){
        if (await dbProcess.HasThisClubUser(users[i].id, dataItem!._id)){
          await ctx.telegram.sendMessage(users[i].id, `❌ ${users[i].name}, Ви були видалені з клубу ${dataItem!.title} (${dbProcess.getDateClub(new Date(dataItem!.date))} о ${dataItem!.time} 🇺🇦), оскільки клуб був видалений.`);
          await dbProcess.DeleteClubFromUser(users[i].id, deleteItem);
        }
      }

      await ctx.reply(`Шпрах клаб №${indexToDelete} успішно видалений.`, {
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
  onTextMessage('RespondKeyDataAndGetChanges', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAll();

    if (CheckException.BackRoot(data)){
      ctx.reply("Добренько, і що на цей раз?)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
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
  onTextMessage('GetChangesAndChangeThis', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        let userHaved : string = '\n\n<b>👉🏼Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉🏼Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }

          let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;

        await ctx.reply(script.speakingClub.report.showClubTypeAdmin(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link), {
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
    else if (Key(data.text) !== null){
      await set('AP_keyforchange')(Key(data.text)!);
      await set('AP_keyforchange_services')(data.text);

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

  onTextMessage('ChangeThisAndCheckThis', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAll(),
      currentItem = results.map(result => result._id);

    if (CheckException.BackRoot(data)){
      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else if (CheckException.TextException(data)){
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
    
          await dbProcess.ChangeKeyData(dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid'])]), keyForChange, parseInt(data.text));
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
        ], keyForChange = user['AP_keyforchange'], keyForChangeService = user['AP_keyforchange_services'];
  
        await set('AP_prev_keyvalue(backup)')(Array(getCurrentClub[0]).filter((club): club is MongoDBReturnType => typeof club === 'object')
        .map((club) => club[keyForChange as keyof MongoDBReturnType].toString()).join(''));
  
        await set('AP_keydatatochange')(data.text);

        const object = await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]),
          users = await dbProcess.ShowAllUsers();
          
        ctx.telegram.sendMessage(object!.teacher_id, `${object!.teacher}!\n\nХочемо вас повідомити, що на шпрах-клубі ${object!.title}, котрий на ${dbProcess.getDateClub(new Date(object!.date))} о ${object!.time} були змінені наступні дані:\n\n\n👉🏽Було змінено - ${keyForChangeService}\n✅Нові дані - ${data.text}`);
        for (let i = 0; i < users.length; i++){
          if (await dbProcess.HasThisClubUser(users[i].id, object!._id)){
            ctx.telegram.sendMessage(users[i].id, `${users[i].name}!\n\nХочемо вас повідомити, що на шпрах-клубі ${object!.title}, котрий на ${dbProcess.getDateClub(new Date(object!.date))} о ${object!.time} були змінені наступні дані:\n\n\n👉🏽Було змінено - ${keyForChangeService}\n✅Нові дані - ${data.text}`);
          }
        }
        await dbProcess.ChangeKeyData(getCurrentClub[0]!, keyForChange, data.text);
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

  onDocumentationMessage('ChangeThisDocAndCheckThis', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAll();

    if (CheckException.BackRoot(data)){
      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else if (CheckException.FileException(data)){
      const keyForChange = user['AP_keyforchange'],
        object = results[parseInt(user['AP_respondkeydata_clubid']) - 1],
        users = await dbProcess.ShowAllUsers();

        console.log(object.title);

      await set('AP_keydatatochange')(data.text);
      await dbProcess.ChangeKeyData(object, keyForChange, data.file);
      ctx.telegram.sendDocument(object.teacher_id, data.file, {caption: `Хей!\n\n🤝🏽 Хочемо повідомити, що у клуба ${object.title}, котрий на ${dbProcess.getDateClub(new Date(object.date))} о ${object.time} було змінено документ із лексикою\n\nПросимо ознайомитись❤️`});
      for (let i = 0; i < users.length; i++){
        if (await dbProcess.HasThisClubUser(users[i].id, object!._id)){
          await ctx.telegram.sendDocument(users[i].id, data.file, {caption: `Хей!\n\n🤝🏽 Хочемо повідомити, що у клуба ${object.title}, котрий на ${dbProcess.getDateClub(new Date(object.date))} о ${object.time} було змінено документ із лексикою\n\nПросимо ознайомитись❤️`});
        }
      }
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

  onTextMessage('ChangeDateDayAndGetChangeMonth', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) <= 31 && parseInt(data.text) >= 1){
        await set('change_date_day')(data.text);

        ctx.reply("А тепер введіть місяць");
        await set('state')('ChangeDateMonthAndGetChangeYear');
      }
      else{
        ctx.reply(`Перепрошую, це коли ${data.text} число?\n\nПовторіть, будь ласка, ще раз.`);
      }
    }
    else{
      ctx.reply('Це не схоже на день');
    }
  })

  onTextMessage('ChangeDateMonthAndGetChangeYear', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Введіть день:");
      await set('state')('ChangeDateDayAndGetChangeMonth');
    }
    else if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) <= 12 && parseInt(data.text) >=1){
        await set('change_date_month')(data.text);

        ctx.reply('І звісно рік:');
        await set('state')('ChangeDateYearAndSubmit');
      }
      else{
        ctx.reply(`Впевнені, що є такий місяць, як ${data.text}?\n\nПовторіть, будь ласка, ще раз.`);
      }
    }
    else{
      ctx.reply('Це не схоже на місяць');
    }
  })

  onTextMessage('ChangeDateYearAndSubmit', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("А тепер введіть місяць");
      await set('state')('ChangeDateMonthAndGetChangeYear');
    }
    else if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, true)){
      const year = new Date();
      if (new Date(`${parseInt(data.text)}-${user['AP_date_month']}-${user['AP_date_day']}`) >= new Date()){
        if (year.getFullYear() + 1 >= parseInt(data.text)){
          await set('change_date_year')(data.text);
          const currentItem = (await dbProcess.ShowAll()).map(result => result._id),
            object = await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]),
            users = await dbProcess.ShowAllUsers();

          await dbProcess.ChangeKeyData(object!, 'date', `${data.text}-${user['change_date_month']}-${user['change_date_day']}`)
          await ctx.telegram.sendMessage(object!.teacher_id, `${object!.teacher}!\n\n➡️ Хочемо вас попередити, що клуб ${object!.title}, котрий ${dbProcess.getDateClub(new Date(object!.date))} о ${object!.time}, відтепер відбудеться ${dbProcess.getDateClub(new Date(`${data.text}-${user['change_date_month']}-${user['change_date_day']}`))} ${object!.time}\n\nДякуємо за розуміння❤️`)
          for (let i = 0; i < users.length; i++){
            if (await dbProcess.HasThisClubUser(users[i].id, object!._id)){
              await ctx.telegram.sendMessage(users[i].id, `${users[i].name}!\n\n➡️ Хочемо попередити, що клубі ${object!.title}, котрий ${dbProcess.getDateClub(new Date(object!.date))} о ${object!.time}, відтепер відбудеться ${dbProcess.getDateClub(new Date(`${data.text}-${user['change_date_month']}-${user['change_date_day']}`))} ${object!.time}\n\nДякуємо за розуміння❤️`)
            }
          }
          ctx.reply('Операція успішна!', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.spekingClubAdminPanel()
            }
          });

          await set('state')('RespondAdminActionAndRootChoose');
        }
        else{
          ctx.reply(`Ого, то це аж на такий рік переноситься клаб? В ${data.text}! Дуже цікаво!)\n\nПовторіть, будь ласка, ще раз`);
        }
      }
      else{
        ctx.reply('Мені здається вже ліпше видалити його, а не викидувати в спогади\n\nПовторіть, будь ласка, ще раз');
      }
    }
    else{
      ctx.reply('Це не схоже на рік');
    }
  })

  onTextMessage('ChangeTimeHourAndGetChangeMinute', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) < 24 && parseInt(data.text) > 0){
        await set('change_time_hour')(data.text);
  
        ctx.reply('А тепер, будь ласка, хвилини');
        await set('state')('ChangeTimeMinuteAndSubmit');
      }
      else{
        ctx.reply(`Скіки скіки? Ой... бабця не чує...\n\nПовторіть, будь ласка, ще раз`);
      }
    }
    else{
      ctx.reply('Це не схоже на час');
    }
  })

  onTextMessage('ChangeTimeMinuteAndSubmit', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Введіть години', {reply_markup: {remove_keyboard: true}});
      await set('state')('ChangeTimeHourAndGetChangeMinute');
    }
    else if (CheckException.TextException(data) && dbProcess.isValidInput(data.text, false)){
      if (parseInt(data.text) < 60 && parseInt(data.text) >= 0){
        await set('change_time_minute')(data.text);
        const currentItem = (await dbProcess.ShowAll()).map(result => result._id),
          object = await dbProcess.ShowData(currentItem[parseInt(user['AP_respondkeydata_clubid']) - 1]),
          users = await dbProcess.ShowAllUsers();
  
        await dbProcess.ChangeKeyData(object!, 'time', `${user['change_time_hour']}:${data.text}`);
        await ctx.telegram.sendMessage(object!.teacher_id, `${object!.teacher}!\n\nХочемо попередити, що клуб ${object!.title}, котрий на ${dbProcess.getDateClub(new Date(object!.date))} о ${object!.time}, тепер буде проходити о ${user['change_time_hour']}:${data.text}\n\nУдачі❤️`)
        for (let i = 0; i < users.length; i++){
          if (await dbProcess.HasThisClubUser(users[i].id, object!._id)){
            await ctx.telegram.sendMessage(users[i].id, `${users[i].name}!\n\n➡️ Хочемо попередити, що клуб ${object!.title}, котрий на ${dbProcess.getDateClub(new Date(object!.date))} о ${object!.time}, тепер буде проходити о ${user['change_time_hour']}:${data.text}\n\nДякуємо за розуміння❤️`)
          }
        }
        ctx.reply('Операція успішна!', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.spekingClubAdminPanel()
          }
        });

        await set('state')('RespondAdminActionAndRootChoose');
      }
      else{
        ctx.reply(`Та хай йому грець! Де це ви бачили ${data.text} хвилин?\n\nПовторіть, будь ласка, ще раз`);
      }
    }
    else{
      ctx.reply('не схоже на хвилини');
    }
  })

  onTextMessage('ChangeTeacherAndSubmit', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("Який саме пункт тре змінити?", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.adminPanelChangeClub()
        }
      });

      await set('state')('GetChangesAndChangeThis');
    }
    else if (CheckException.TextException(data)){
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

        if (object!.teacher_id !== '' && object!.teacher_id !== undefined){
          ctx.telegram.sendMessage(object!.teacher_id, `А хай йому грець!\n\nЯк викладач, Ви були видалені з клуба ${object!.title}\n\nПобачимося на наступних❤️`);
        }

        ctx.telegram.sendMessage(teacher[1], `Йоу!\n\nВи були встановлені викладачем на клубі ${object!.title}\n\nВдалого заняття🍓`);

        await dbProcess.ChangeKeyData(object!, 'teacher', teacher[0]);
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
  onTextMessage('PeronalStudentHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
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
                text: "Особові справи"
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
    else if (data.text === 'Показати всіх користувачів'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        if (i % 10 === 0 && i != 0){
          const messageWaiting = ctx.reply("Почекайте маленько, підгружаю ще...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await messageWaiting).message_id);
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.personalStudentAdminPanel()
            }
          });
        }
        else{
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.personalStudentAdminPanel()
            }
          });
        }
      }
    }
    else if (data.text === 'Змінити імʼя користувачу'){
      ctx.reply('Введіть id користувача, якому потрібно змінити імʼя', {reply_markup: {remove_keyboard: true}});
      await set('state')('ChangeUserNameAndProcessChange');
    }
    else if (data.text === 'Змінити активний пакет'){
      ctx.reply('Введіть id студента, якому потрібно змінити активний пакет', {reply_markup: {remove_keyboard: true}});
      await set('state')('ChangeActivePacket_GetID');
    }
    else if (data.text === 'Показати студентів'){
      const results = await dbProcess.ShowAllUsers();
      for (let i = 0; i < results.length; i++) {
        if (results[i].role === 'student'){
          if (i % 10 === 0 && i != 0){
            const messageWaiting = ctx.reply("Почекайте маленько, підгружаю ще...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await messageWaiting).message_id);
            await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, 
              results[i].number, results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.personalStudentAdminPanel()
              }
            });
          }
          else{
            await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, 
              results[i].number, results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.personalStudentAdminPanel()
              }
            });
          }
        }
      }
    }
    else if (data.text === 'Показати викладачів'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        if (results[i].role === 'teacher'){
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.personalStudentAdminPanel()
            }
          });
        }
      }
    }
    else if (data.text === 'Кількість занять студента'){
      ctx.reply('Введіть id студента, щоб побачити кількість доступних йому занять та активний пакет');
      await set('state')('RespondIDAndShowCount&Packet');
    }
    else if (data.text === 'Прибрати заняття студенту'){
      ctx.reply('Введіть id студента, щоб змінити кількість його занять');
      await set('state')('ResondIDAndForceChangeAvaibleLessons');
    }
    else if (data.text === 'Показати Адмінів та Розробника'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        if (results[i].role === 'admin' || results[i].role === 'developer'){
          await ctx.reply(script.speakingClub.report.showUser(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.personalStudentAdminPanel()
            }
          });
        }
      }
    }
    else if (data.text === 'Додати заняття студенту'){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, 
          results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!));
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
        await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, 
          results[i].number, results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!));
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

      await ctx.reply('Виберіть номер студента, якому потрібно змінити роль', {
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
  onTextMessage('AddLessonForStudent', async(ctx, user, set, data) => {
    const results = (await dbProcess.ShowAllUsers()).map(result => result._id);

    if (CheckException.BackRoot(data)){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
      await set('AP_student_id')(data.text);

      await ctx.reply('Скільки додамо?');
      await set('state')('CheckAvaibleActivePacketAndChangeCountLesson');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('CheckAvaibleActivePacketAndChangeCountLesson', async(ctx, user, set, data) => {
    const userIDWithoutProcessing = parseInt(user['AP_student_id']),
      userIDChat: number = (await dbProcess.ShowAllUsers()).map(item => item.id)[userIDWithoutProcessing - 1],
      getUserActualName = (await dbProcess.ShowAllUsers()).map(item => item.name)[userIDWithoutProcessing - 1];
    
    if (CheckException.BackRoot(data)){
      const results = await dbProcess.ShowAllUsers();
    
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, 
          results[i].number, results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!));
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
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1){
      await set('AP_UserChangeCountLesson_IDChat')(userIDChat.toString());
      await set('AP_UserChangeCountLesson_Name')(getUserActualName);
      await set('AP_UserChangeCountLesson_New')(data.text);
      if (await db.get(userIDChat)('club-typeclub')){
        ctx.reply(script.speakingClub.activePacketCheck.ifAvaibleActivePacket(getUserActualName, (await db.get(userIDChat)('club-typeclub'))!, ConvertToPrice((await db.get(userIDChat)('club-typeclub'))!)!), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'так'
                },
                {
                  text: 'ні'
                }
              ]
            ]
          }
        })

        await set('state')('ChoosePacketHandlerCustomLesson')
      }
      else{
        ctx.reply(script.speakingClub.activePacketCheck.noAvaibleActivePacket(getUserActualName), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.payPacketLessons()
          }
        })
      }
    }
    else{
      ctx.reply('Вам потрібно ввести число більше або рівне одиниці.');
    }
  })

  onTextMessage('ChoosePacketHandlerCustomLesson', async(ctx, user, set, data) => {
    const userID = await dbProcess.ShowOneUser(parseInt(user['AP_UserChangeCountLesson_IDChat'])),
      getUserActualName = user['AP_UserChangeCountLesson_Name'],
      toWrite = parseInt(user['AP_UserChangeCountLesson_New'])

    if (CheckException.BackRoot(data)){
      await ctx.reply('Скільки додамо?', {reply_markup: {remove_keyboard: true}});
      await set('state')('CheckAvaibleActivePacketAndChangeCountLesson');
    }
    else if (data.text === 'так'){
      await dbProcess.ChangeCountUser(userID!._id, toWrite);  

      await ctx.reply(`Успішно! На рахунку у студента ${getUserActualName}: ${toWrite} занять`, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        },
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (data.text === 'ні'){
      ctx.reply(script.speakingClub.activePacketCheck.ifChooseActivePacket, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
        }
      })
      await set('state')('ChangeCountUserLessonsAndPacket');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'так'
              },
              {
                text: 'ні'
              }
            ]
          ]
        }
      })
    }
  })

  onTextMessage('ChangeCountUserLessonsAndPacket', async(ctx, user, set, data) => {
    const userID = await dbProcess.ShowOneUser(parseInt(user['AP_UserChangeCountLesson_IDChat'])),
      getUserActualName = user['AP_UserChangeCountLesson_Name'],
      toWrite = parseInt(user['AP_UserChangeCountLesson_New'])

    if (CheckException.BackRoot(data)){
      await ctx.reply('Скільки додамо?', {reply_markup: {remove_keyboard: true}});
      await set('state')('CheckAvaibleActivePacketAndChangeCountLesson');
    }
    else if (data.text === 'Разове заняття' || data.text === 'Шпрах-Клуб' || data.text === 'Шпрах-Клуб+PLUS'){
      await dbProcess.ChangeCountUser(userID!._id, toWrite);
      await db.set(parseInt(user['AP_UserChangeCountLesson_IDChat']))('club-typeclub')(data.text);

      await ctx.reply(`Успішно! На рахунку у студента ${getUserActualName}: ${toWrite} занять та активний пакет ${data.text} (${ConvertToPrice(data.text)} uah)`, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        },
      })

      await set('state')('PeronalStudentHandler');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
        }
      })
    }
  })

  // Delete Student Handler
  onTextMessage('DeleteStudentAndCheckAction', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAllUsers();

    if (CheckException.BackRoot(data)){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
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

  onTextMessage('DeleteStudentHandlerAndReturn', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAllUsers(),
      indexToDelete = user['AP_DeleteStudentHandler_deleteindex'];

    if (CheckException.BackRoot(data)){
      const results = await dbProcess.ShowAllUsers();
  
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, 
          results[i].number, results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!));
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
    else if (data.text === 'так'){
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
  onTextMessage('RespondUserToActionAndGetRole', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAllUsers();

    if (CheckException.BackRoot(data)){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1 && parseInt(data.text) <= results.length){
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

  onTextMessage('RespondRoleAndReturn', async(ctx, user, set, data) => {
    const results = await dbProcess.ShowAllUsers(),
      currentUserObjectID = results.map(item => item.id)[parseInt(user['AP_StudentHandler_idToChange']) - 1];

    if (CheckException.BackRoot(data)){
      const results = await dbProcess.ShowAllUsers();
      
      for (let i = 0; i < results.length; i++) {
        await ctx.reply(script.speakingClub.report.showUserToAdmin(i + 1, results[i].name, results[i].id, results[i].username, results[i].number, 
          results[i].count, ConvertRole(results[i].role).toString(), ConvertToPacket((await db.get(results[i].id)('club-typeclub'))!), ConvertToPrice((await db.get(results[i].id)('club-typeclub'))!)!));
      }

      await ctx.reply('Виберіть номер студента, якому потрібно змінити роль', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: results.map(result => result._id).map((value : ObjectId, index : number) => {
            return [{ text: `${index + 1}` }];
          })
        }
      })

      await set('state')('RespondUserToActionAndGetRole');
    }
    else if (CheckException.TextException(data) && Role(data.text)){
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

  onTextMessage('ChangeUserNameAndProcessChange', async(ctx, user, set, data) => {
    const id = ctx?.chat?.id ?? -1,
      userInDB = await dbProcess.ShowOneUser(parseInt(data.text));

    if (CheckException.BackRoot(data)){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (userInDB){
      await set('user_to_name_change')(data.text);
      if (false){
        await ctx.reply(`Користувач ${userInDB!.name} знайдений і також знайдений в таблиці Шпрах-клубів\n\nА тепер, будь ласка, напишіть нове імʼя для цього користувача`, {reply_markup: {remove_keyboard: true}});
      }
      else{
        await ctx.reply(`Користувач ${userInDB!.name} знайдений, але на жаль, не знайдений в таблиці Шпрах-клубів\n\nА тепер, будь ласка, напишіть нове імʼя для цього користувача`, {reply_markup: {remove_keyboard: true}});
      }

      await set('state')('ProcessChangeAndReturn');
    }
    else{
      ctx.reply('Такого користувача, на жаль, не знайдено, повторіть, будь ласка, ще раз!');
    }
  })

  onTextMessage('ProcessChangeAndReturn', async(ctx, user, set, data) => {
    const id = ctx?.chat?.id ?? -1,
      userIDToChange = parseInt(user['user_to_name_change']),
      userInDB = await dbProcess.ShowOneUser(userIDToChange);

    if (CheckException.BackRoot(data)){
      ctx.reply('Введіть id користувача, якому потрібно змінити імʼя', {reply_markup: {remove_keyboard: true}});
      await set('state')('ChangeUserNameAndProcessChange');
    }
    else if (CheckException.TextException(data)){
      await dbProcess.ChangeUserName(userInDB!._id, data.text);
      if (false){
        // await sheets.ChangeUserNameInSheet(id, data.text);
        await ctx.reply(`Успішно змінено імʼя для користувача ${userInDB!.name} і в таблияці також, тепер його імʼя ${data.text}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.personalStudentAdminPanel()
          }
        })
      }
      else{
        await ctx.reply(`Успішно змінено імʼя для користувача ${userInDB!.name}, але не в табличці, тепер його імʼя ${data.text}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.personalStudentAdminPanel()
          }
        })
      }

      await set('state')('PeronalStudentHandler');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('RespondIDAndShowCount&Packet', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Виберіть, будь ласка, що вам потрібно', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (CheckException.TextException(data)){
      if (!isNaN(parseInt(data.text))){
        const requestedUser = (await db.getAll(parseInt(data.text))());
        if (requestedUser){
          const user = await dbProcess.ShowOneUser(parseInt(data.text)),
            activePacket = await db.get(parseInt(data.text))('club-typeclub');

          ctx.reply(`Користувач ${user!.name} має на своєму рахунку ${user!.count} занять і активний пакет ${activePacket !== null ? activePacket : 'Відсутній'} ${activePacket !== null ? `(${ConvertToPrice(activePacket!)} uah)` : ''}`, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.personalStudentAdminPanel()
            }
          });

          await set('state')('PeronalStudentHandler');
        }
        else{
          ctx.reply('Нажаль, такого користувача не знайдено.');
        }
      }
      else{
        ctx.reply('Вибачте, але не знав, що id може містити букви...\n\nПовторіть, будь ласка, знову')
      }
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('ResondIDAndForceChangeAvaibleLessons', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Прекрасно, над ким сьогодні будемо знущатись?)', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (CheckException.TextException(data)){
      if (!isNaN(parseInt(data.text))){
        const requestedUser = (await db.getAll(parseInt(data.text))());
        if (requestedUser){
          const user = await dbProcess.ShowOneUser(parseInt(data.text));

          await set('userid_for_forceChangeAvaibleLessons')(data.text);

          ctx.reply(`Користувач ${user!.name} має на своєму рахунку ${user!.count} занять.\n\nСкільки поставим?`, {reply_markup: {remove_keyboard: true}});

          await set('state')('ForceChangeAvaibleLessonsAndReturn');
        }
        else{
          ctx.reply('Нажаль, такого користувача не знайдено.');
        }
      }
      else{
        ctx.reply('Вибачте, але не знав, що id може містити букви...\n\nПовторіть, будь ласка, знову')
      }
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('ForceChangeAvaibleLessonsAndReturn', async(ctx, user, set, data) => {
    const idUser = user['userid_for_forceChangeAvaibleLessons'];

    if (CheckException.BackRoot(data)){
      ctx.reply('Введіть id студента, щоб змінити кількість його занять');
      await set('state')('ResondIDAndForceChangeAvaibleLessons');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 0 && parseInt(data.text) <= 5){
      const user = await dbProcess.ShowOneUser(parseInt(idUser));
      await dbProcess.ChangeCountUser(user!._id, parseInt(data.text))

      ctx.reply('Успішно виконана операція!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      });

      await set('state')('PeronalStudentHandler');
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('ChangeActivePacket_GetID', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Прекрасно, над ким сьогодні будемо знущатись?)', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (CheckException.TextException(data)){
      if (!isNaN(parseInt(data.text))){
        const requestedUser = (await db.getAll(parseInt(data.text))());
        if (requestedUser){
          const user = await dbProcess.ShowOneUser(parseInt(data.text));

          await set('userid_for_forceChangeActivePacket')(data.text);

          ctx.reply(`Користувач ${user!.name} має активний пакет ${(await db.get(parseInt(data.text))('club-typeclub')) === undefined ? 'Відсутній' : ConvertToPacket((await db.get(parseInt(data.text))('club-typeclub'))!)}\n\nНа який змінимо?`, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.payPacketLessons()
            }
          });

          await set('state')('ChangeActivePacket_Handler');
        }
        else{
          ctx.reply('Нажаль, такого користувача не знайдено.');
        }
      }
      else{
        ctx.reply('Вибачте, але не знав, що id може містити букви...\n\nПовторіть, будь ласка, знову')
      }
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onTextMessage('ChangeActivePacket_Handler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('Введіть id студента, якому потрібно змінити активний пакет', {reply_markup: {remove_keyboard: true}});
      await set('state')('ChangeActivePacket_GetID');
    }
    else if (data.text === 'Разове заняття' || data.text === 'Шпрах-Клуб' || data.text === 'Шпрах-Клуб+PLUS'){
      await db.set(parseInt(user['userid_for_forceChangeActivePacket']))('club-typeclub')(data.text);

      ctx.reply('Успішно виконана операція!');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
        }
      });
    }
  })

  // Payment Main Bot Function Action
  bot.action(/^approvePayment:(\d+)$/, async (ctx) => {
    const id = Number.parseInt(ctx.match[1]);

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

  // Club Once lesson payment action
  bot.action(/^acceptPayment:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2])),
      dateRecord = ctx.match[3],
      users = await dbProcess.ShowAllUsers(),
      currentUser = await dbProcess.ShowOneUser(idUser);

    let currentAvailableCount = idClub!.count - 1

    await dbProcess.WriteNewClubToUser(idUser, idClub!._id)
    await dbProcess.ChangeKeyData(idClub!, 'count', currentAvailableCount);
    await dbProcess.SwitchToCompletTrialLesson(idUser, 'true');

    let recordedUsers = '';

    for (let i = 0; i < users.length; i++){
      if (await dbProcess.HasThisClubUser(users[i].id, idClub!._id)){
        recordedUsers += `- ${users[i].name} (@${users[i].username})\n📲${users[i].number}\n\n`;
      }
    }

    //Send Message To Teacher
    await ctx.telegram.sendMessage(idClub!.teacher_id, script.speakingClub.report.reportToTeacherNewOrder(idClub!.title, idClub!.teacher, 
      dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, currentAvailableCount, recordedUsers));

    await ctx.telegram.sendMessage(idUser, script.speakingClub.report.acceptedTrialLesson((await db.get(idUser)('name'))!.toString(), dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, idClub!.link));

    await ctx.telegram.sendDocument(idUser, idClub!.documentation, {
      caption: `ось файл із лексикою, яка допоможе Вам на шпрах-клубі ;)`
    });

    await db.set(idUser)('SC_TrialLessonComplet_active')('true');
    ctx.answerCbQuery(`Запис даних в таблицю`);
    // await sheets.appendLessonToUser(idUser, currentUser!.name, currentUser!.number, 
    //   currentUser!.username, currentUser!.email, dateRecord, idClub!.title, idClub!.teacher);

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'paid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}`);
  })

  bot.action(/^acceptPaymentWO:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      //dateRecord = ctx.match[2],
      currentUser = await dbProcess.ShowOneUser(idUser);

    await dbProcess.SwitchToCompletTrialLesson(idUser, 'true');
    await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 1);
    await ctx.telegram.sendMessage(idUser, script.speakingClub.thanksType.typeOnce(currentUser!.name));

    await db.set(idUser)('SC_TrialLessonComplet_active')('true');
    ctx.answerCbQuery(`Запис даних в таблицю`);

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'paid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    ctx.answerCbQuery(`Користувач: ${currentUser!.name}, ПІДТВЕРДЖЕНО`);
  })

  bot.action(/^declinePaymentWO:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'nopaid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, ВІДМІНА`);
  })

  bot.action(/^declinePayment:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'nopaid', 'date_in_db'),
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
    const idUser = Number.parseInt(ctx.match[1]),
      packetName = ctx.match[2] === 's' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS',
      currentUser = await dbProcess.ShowOneUser(idUser);

    await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 5);
    await ctx.telegram.sendMessage(idUser, script.speakingClub.report.acceptedPacketPayment((await db.get(idUser)('name'))!.toString(), packetName));
    await db.set(idUser)('SC_TrialLessonComplet_active')('true');
    ctx.answerCbQuery(`Запис даних в таблицю.`);
    // await sheets.changeAvaibleLessonStatus(idUser, true);

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'paid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    ctx.answerCbQuery(`Користувач: ${idUser}, Пакет: ${packetName}`);
  })

  bot.action(/^declinePaymentP:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const packetName = ctx.match[2] === 's' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS';

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'nopaid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Пакет: ${packetName}`);
  })

  // Club PacketAndClub Payment
  bot.action(/^acceptPaymentCP:(\d+),(.+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2])),
      packetName = ctx.match[3] === 's' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS',
      dateRecord = ctx.match[4],
      users = await dbProcess.ShowAllUsers(),
      currentUser = await dbProcess.ShowOneUser(idUser);
    let recordedUsers = '';

    await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 4);
    await dbProcess.WriteNewClubToUser(idUser, idClub!._id)
    await dbProcess.ChangeKeyData(idClub!, 'count', idClub!.count - 1);
    await dbProcess.SwitchToCompletTrialLesson(idUser, 'true');

    for (let i = 0; i < users.length; i++){
      if (await dbProcess.HasThisClubUser(users[i].id, new ObjectId(ctx.match[2]))){
        recordedUsers += `- ${users[i].name} (@${users[i].username})\n📲${users[i].number}\n\n`;
      }
    }

    //Send Message To Teacher
    await ctx.telegram.sendMessage(idClub!.teacher_id, script.speakingClub.report.reportToTeacherNewOrder(idClub!.title, idClub!.teacher, 
      dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, idClub!.count - 1, recordedUsers));

    await ctx.telegram.sendMessage(idUser, script.speakingClub.report.acceptedPacketAndClubPayment((await db.get(idUser)('name'))!.toString(), dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, idClub!.link, packetName));

    await ctx.telegram.sendDocument(idUser, idClub!.documentation, {
      caption: `ось файл із лексикою, яка допоможе Вам на шпрах-клубі ;)`
    });
    await db.set(idUser)('SC_TrialLessonComplet_active')('true');

    ctx.answerCbQuery(`Запис даних в таблицю`);
    // await sheets.changeAvaibleLessonStatus(idUser, true);
    // await sheets.appendLessonToUser(idUser, currentUser!.name, currentUser!.number, currentUser!.username, currentUser!.email !== undefined ? currentUser!.email : 'пошта відсутня', dateRecord, idClub!.title, idClub!.teacher);

    try {
      // set up payment status "paid"
      await db.set(idUser)('paymentStatusTrialLesson')('paid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'paid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}, Пакет: ${packetName}`);
  })

  bot.action(/^declinePaymentCP:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));
    const packetName = ctx.match[3] === 's' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS';

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але нажаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

    try {
      // set up payment status "nopaid"
      await db.set(idUser)('paymentStatusTrialLesson')('nopaid');
      const newInlineKeyboardButtons = inlineAcceptOncePayment(idUser, ctx.match[2], 'nopaid', 'date_in_db'),
        newInlineKeyboardMarkup = Markup.inlineKeyboard(newInlineKeyboardButtons).reply_markup;
      await ctx.editMessageReplyMarkup(newInlineKeyboardMarkup);

    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Користувач: ${idUser}, Клуб: ${idClub!.title}, Пакет: ${packetName}`);
  })

  bot.action(/^acceptEventAnnouncementClub:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2])),
      currentUser = await dbProcess.ShowOneUser(idUser),
      users = await dbProcess.ShowAllUsers(),
      notEnoughLessons = {
        name : await db.get(idUser)('name') === undefined ? '' : await db.get(idUser)('name'),
        username : await db.get(idUser)('username') === undefined ? '' : await db.get(idUser)('username'),
        number : await db.get(idUser)('phone_number') === undefined ? '' : await db.get(idUser)('phone_number'),
        typeClub : await db.get(idUser)('club-typeclub') === undefined ? '' : await db.get(idUser)('club-typeclub')
      }

    let recordedUsers = '';

    if (currentUser!.count > 0){
      if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, idClub!._id)){
        await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count - 1);
        await dbProcess.ChangeKeyData(idClub!, 'count', idClub!.count - 1);
        await dbProcess.WriteNewClubToUser(ctx?.chat?.id ?? -1, idClub!._id);

        for(let i = 0; i < users.length; i++){
          if (await dbProcess.HasThisClubUser(users[i].id, idClub!._id)){
            recordedUsers += `- ${users[i].name} (@${users[i].username})\n📲${users[i].number}\n\n`;
          }
        }
    
        //Send Message To Teacher
        await ctx.telegram.sendMessage(idClub!.teacher_id, script.speakingClub.report.reportToTeacherNewOrder(idClub!.title, idClub!.teacher, 
          dbProcess.getDateClub(new Date(idClub!.date)), idClub!.time, idClub!.count - 1, recordedUsers));
        
        await ctx.reply('Обробка, зачекайте, будь ласка...');

        if (currentUser!.count === 1){
          // For Developer
          await ctx.telegram.sendMessage(devChat, script.speakingClub.report.notEnoughLessons(
            notEnoughLessons.name!, 
            notEnoughLessons.username!, 
            notEnoughLessons.number!, 
            currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", 
            notEnoughLessons.typeClub!
          ));
            
          await ctx.telegram.sendMessage(confirmationChat, script.speakingClub.report.notEnoughLessons(
            notEnoughLessons.name!, notEnoughLessons.username!, notEnoughLessons.number!, currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", notEnoughLessons.typeClub!
          ));
            
          // await sheets.changeAvaibleLessonStatus(ctx?.chat?.id ?? -1, false);
        }
        
        await ctx.reply(script.speakingClub.registrationLesson.acceptedRegistration(notEnoughLessons.name!, dbProcess.getDateClub(new Date(idClub!.date)), 
        idClub!.time, idClub!.link), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: await keyboards.speakingClubMenu()
          }
        });
        
        await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, idClub!.documentation, {
          caption: `ось файл із лексикою, яка допоможе Вам на шпрах-клубі ;)`}
        )

        // await sheets.appendLessonToUser(currentUser!.id, currentUser!.name, currentUser!.number, currentUser!.username, currentUser!.email !== undefined ? currentUser!.email : 'пошта відсутня',
        //   DateRecord(), idClub!.title, idClub!.teacher);
      }
      else{
        ctx.reply('ви вже зареєстровані на цей шпрах!');
      }
    }
    else{
      if (!await dbProcess.HasThisClubUser(ctx?.chat?.id ?? -1, idClub!._id)){
        await db.set(idUser)('sc_request_torecord_usertoclub')(idClub!._id.toString());
        ctx.reply(script.speakingClub.registrationLesson.paymentRequest(notEnoughLessons.name!), {
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

        await db.set(idUser)('state')('RegistrationChooseHandlerPayment');
      }
      else{
        ctx.reply('ви вже зареєстровані на цей шпрах!');
      }
    }

    return ctx.answerCbQuery(`Слідуйте інструкціям далі`);
  })

  bot.action(/^declineEventAnnouncementClub:(\d+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      currentUser = await dbProcess.ShowOneUser(idUser);

      ctx.telegram.sendMessage(idUser, 'сумнівно, але окееей)\nгарного дня!🍓', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(currentUser!.id, currentUser!.role)
        }
      })

    await db.set(idUser)('state')('EndRootManager');

    return ctx.answerCbQuery(`Прикро :(`);
  })

  bot.launch();
}

main();