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
  inlineAcceptPacketPayment, inlineAcceptClubWithPacketPayment, inlineEventAnnouncementClub, inlinePayButton, inlineScheduleTrialLessonTeacher } 
  from "./data/keyboard/paymentButtons";
import formattedName from "./data/process/nameFormatt";
import { liveKeyboard } from "./data/keyboard/livekeyboard";
import DateRecord, { DateHistory } from "./base/handlers/getTime";
import MongoDBReturnType from "./data/general/mongoDBType";
import { Markup, TelegramError } from "telegraf";
import { ObjectId } from 'mongodb';
import { DateProcess, DateProcessToPresentView, SortSchedule, TimeProcess, UniversalSingleDataProcess, getDayOfWeek } from "./data/process/dateAndTimeProcess";
import IndividualArray from "./data/individual/interface";
import axios from "axios";
import NotificationReg, { SendNotification } from "./data/notifications/notificationProcess";

async function main() {
  const [ onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, notifbot, notiftoken, db, dbProcess ] = await arch();

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

  notifbot.start( (ctx) => {
    console.log('NOTIFICATION BOT STARTED');

    ctx.reply('Вітаю, я бот сповіщень, відтепер ви маєте змогу отримувати сповіщення від dehto, як адмін');
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
      set('phone_number')(data.phone_number[0]);

      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

      if (userObject){
        await dbProcess.UpdateUserData(userObject._id, data.phone_number[0], user['username']);
      }
      else dbProcess.AddUser({ id: ctx?.chat?.id ?? -1, name: user['name'], number: data.phone_number[0], username: user['username'], role: 'guest', count: 0 });

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
    else if (data.text === 'деЗавдання' && userI!.role === 'teacher'){
      if (userI!.set_detasks){
        ctx.reply('вітаю в деЗавданнях, що саме вас цікавить?', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.deTaskMenu()
          }
        })
        await set('state')('TeacherDeTaskHandler');
      }
      else{
        ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню та після виберіть студента, якому адресовано деЗавдання')
        await set('state')('TeachersSetTasksHandler')
      }
    }
    else if (data.text === "Вчитель на годину" && userI!.role === 'guest'){
      ctx.reply(script.teacherOnHour.whatsTheProblem, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.coursesTeacherOnHour()
        },
      });
      await set('state')('ChoosingCourses');
    }
    else if (data.text === "Розмовні клуби" && (userI!.role === 'student' || userI!.role === 'guest')){
      ctx.reply("оберіть, що вас цікавить :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userI!.role)
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
    else if (data.text === 'Користувачі' && (userI!.role === 'developer' || userI!.role === 'admin')){
      ctx.reply('оберіть одну із кнопок нижче:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.usersMenu()
        }
      })

      await set('state')('AdminUsersOperationHandler');
    }
    else if (data.text === 'Відправити сповіщення' && (userI!.role === 'admin' || userI!.role === 'developer')){
      ctx.reply('напишіть текст сповіщення, який ви хочете віправити');
      await set('state')('AdminNotificationRepondText')
    }
    else if (data.text === "Розмовні клуби" && checkChats(ctx?.chat?.id ?? -1)){
      ctx.reply("З поверненням, Меркель! :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: "Клуби"
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
    else if (data.text === 'Мої Розмовні клуби' && userI!.role === 'teacher'){
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
    else if ((data.text === 'Служба турботи' || data.text === 'Моя служба турботи') && (userI!.role === 'guest' || userI!.role === 'student' || userI!.role === 'developer')){
      const objectList = await dbProcess.CreateNewLiveSupport(),
          status = await db.get(ctx?.chat?.id ?? -1)('processStatus') ?? "waiting",
          usersCollection = await dbProcess.ShowAllUsers(),
          inline = liveKeyboard(ctx?.chat?.id ?? -1, status, objectList.insertedId.toString());
        let allBusy = true,
          arrayIDs = [], arrayCIDs = [];

        for (let n = 0; n < usersCollection.length; n++){
          if (usersCollection[n].system_role === 'worker' && usersCollection[n].available === 'available'){
            const message = ctx.telegram.sendMessage(usersCollection[n].id, script.liveSupport.userRequest(user['name'], user['username'], user['phone_number'], DateHistory()), {
              parse_mode: "HTML",
              ...Markup.inlineKeyboard(inline)
            }); 
            arrayIDs.push((await message).message_id);
            arrayCIDs.push(usersCollection[n].id);
            allBusy = false;
          }
        }

        if (allBusy){
          await dbProcess.DeleteServiceCare(objectList.insertedId);
          ctx.reply("вибачте, але наразі всі оператори заняті, спробуйте, будь ласка, пізніше. Вибачте за незручності", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
            }
          });
        }
        else{
          await dbProcess.AddMessageIDsLiveSupport(objectList.insertedId, arrayIDs, arrayCIDs);
          await set('student_tmp_service_care_id')(objectList.insertedId.toString());
          await ctx.reply(script.liveSupport.userRespond, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "ВІДМІНИТИ" }]]
            }
          });
          await set('state')('CareServiceQuestionHandler')
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
      const count = userObject!.individual_count;
      if (count > 0){
        ctx.reply(`✅ Баланс ваших індивідуальних занять ${count/60} занять (${count}хв)`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.indiviualMenu(userObject!.role)
          }
        })
      }
      else{
        ctx.reply(`😢 ${user['name']} у вас немає проплачених занять, ${userObject!.role === 'guest' ? 'почнімо?' : 'будемо продовжувати?'}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo(true)
          }
        })

        await set('state')('NotEnoughIndividualLessonsHandler');
      }
    }
    else if (data.text === 'Мої деЗавдання' && userObject!.role === 'student'){
      const userData = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        actualTask = userData ? userData.detask : false;

      if (actualTask){
        const task = await dbProcess.GetDeTaskForStudent(actualTask);
        await ctx.reply(`😏 хах, ${user['name']}, ваше актуальне завдання:`);
        
        if (task){
          if (task.content){
            const content = task.content;
            for (let i = 0; i < content.length; i++){
              await ctx.reply(content[i]);
            }
          }
          if (task.files && task.typeOfFiles){
            const files = task.files,
              idAddress = ctx?.chat?.id ?? -1;
            for (let i = 0; i < files.length; i++){
              switch (task.typeOfFiles[i]) {
                case "file":
                  const file = files[i].split(';');
                  await ctx.telegram.sendDocument(idAddress, file[0], {caption: file[1] ? file[1] : ''});
                  break;

                case "photo":
                  const photo = files[i].split(';');
                  await ctx.telegram.sendPhoto(idAddress, photo[0], {caption: photo[1] ? photo[1] : ''});
                  break;

                case "audio":
                  await ctx.telegram.sendAudio(idAddress, files[i]);
                  break;

                case "location":
                  const loc = files[i].split(';');
                  await ctx.telegram.sendLocation(idAddress, loc[0], loc[1]);
                  break;

                case "video_circle":
                  await ctx.telegram.sendVideoNote(idAddress, files[i]);
                  break;

                case "voice":
                  await ctx.telegram.sendVoice(idAddress, files[i]);
                  break;

                case "contact":
                  const phone = files[i].split(';');
                  await ctx.telegram.sendContact(idAddress, phone[0], phone[1]);
                  break;

                default:
                  ctx.reply('нам прикро, але надісланий викладачем тип файлу наразі не підтримується, вибачте за труднощі...');

              }
            }
          }
          await ctx.reply('*можна надсилати усі види файлів (фото, відео, кружечки, войси і тд)');
          await set('state')('RespondStudentDeTaskHandler');
        }
      }
      else ctx.reply('вибачте, але у вас немає активних деЗавдань :(');
    }
    else if (data.text === 'Мій розклад'){
      if (userObject!.role === 'student'){
        const trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
        if (userObject!.individual_lessons || trialLessons.length){
          const lessons = SortSchedule([
            ...await dbProcess.GetSpecificIndividualLessons(userObject!.individual_lessons),
            ...trialLessons
          ]);
          let lastDateLoop = '', lessonProcess: IndividualArray = {}

          for (let i = 0; i < lessons.length; i++){
            if (lastDateLoop === lessons[i]!.date) continue;
            else lessonProcess[lessons[i]!.date] = []
          }

          const keys = Object.keys(lessonProcess);
          for (let i = 0; i < keys.length; i++){
            for (let j = 0; j < lessons.length; j++){
              if (keys[i] === lessons[j]!.date){
                lessonProcess[keys[i]].push(lessons[j])
              }
            }
          }

          for (let i = 0; i < keys.length; i++){
            const key = keys[i];
            let message = `📋 ${getDayOfWeek(new Date(key))} ${key}\n\n`;
    
            for (let j = 0; j < lessonProcess[key].length; j++) {
              const lesson = lessonProcess[key][j],
                student = await dbProcess.ShowOneUser(lesson.idStudent),
                teacher = await dbProcess.ShowOneUser(lesson.idTeacher);
              message += script.indivdual.scheduleShowStudent(
                lesson.time,
                lesson.duration,
                teacher!.name,
                teacher!.username,
                teacher!.number,
                student!.miro_link ?? "відсутнє"
              )
            }
    
            await ctx.reply(message, {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.indiviualMenu(userObject!.role)
              }
            });
          }
        
        }
        else {
          ctx.reply('на данний момент у вас відсутні заняття', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.indiviualMenu(userObject!.role)
            }
          });
          await set('state')('TeacherSchduleHandler');
        }
      }
      else if (userObject!.role === 'teacher'){
        const trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
        if (userObject!.set_individual_lessons || trialLessons.length){
          const lessons = SortSchedule([
            ...await dbProcess.GetSpecificIndividualLessons(userObject!.set_individual_lessons),
            ...trialLessons
          ]);
          let lastDateLoop = '', lessonProcess: IndividualArray = {};

          for (let i = 0; i < lessons.length; i++){
            if (lastDateLoop === lessons[i]!.date) continue;
            else lessonProcess[lessons[i]!.date] = []
          }

          const keys = Object.keys(lessonProcess);
          for (let i = 0; i < keys.length; i++){
            for (let j = 0; j < lessons.length; j++){
              if (keys[i] === lessons[j]!.date){
                lessonProcess[keys[i]].push(lessons[j])
              }
            }
          }

          for (let i = 0; i < keys.length; i++){
            const key = keys[i];
            let message = `📋 ${getDayOfWeek(new Date(key))} ${key}\n\n`;
    
            for (let j = 0; j < lessonProcess[key].length; j++) {
              const lesson = lessonProcess[key][j],
                student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
              message += script.indivdual.rescheduleForTeacher(
                j + 1,
                lesson.time,
                lesson.duration,
                student? student.name : "Не вдалося знайти ім'я в БД :(",
                student? student.username : "unknown",
                student? student.number : "не вдалося знайти номеру :("
              )
            }
    
            await ctx.reply(message, {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.myScheduleTeacher()
              }
            });
          }
          await set('state')('TeacherSchduleHandler');
        }
        else {
          ctx.reply('на данний момент у вас відсутні заняття', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.myScheduleTeacher()
            }
          });
          await set('state')('TeacherSchduleHandler');
        }
      }
      else{
        ctx.reply(script.errorException.chooseButtonError, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.indiviualMenu(userObject!.role)
          }
        })
      }
    }
    else if (data.text === 'Знайти студента' && (userObject!.role === 'admin' || userObject!.role === 'developer')){
      ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
      await set('state')('StudentFindHandler')
    }
    else if (data.text === 'Наші викладачі' && (userObject!.role === 'admin' || userObject!.role === 'developer')){
      const teachers = await dbProcess.ShowAllUsers();
      let teachersKeyboard = [];

      for (let i = 0; i < teachers.length; i++){
        if (teachers[i].role === 'teacher'){
          teachersKeyboard.push([{ text: teachers[i].name }]);
        }
      }
      ctx.reply('оберіть зі списку викладача з яким ви хочете щось зробити:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: teachersKeyboard
        }
      });
      await set('state')('AdminTeachersOperationHandler')
    }
    else if (data.text === 'Показати усіх наших студентів' && (userObject!.role === 'admin' || userObject!.role === 'developer')){
      const users = await dbProcess.ShowAllUsers();
      let students = [], sortedStudents = [];

      for (let i = 0; i < users.length; i++){
        if (users[i].role === 'student'){
          students.push(users[i]);
        }
      }

      sortedStudents = students.slice().sort((a: any, b: any) => a.name.localeCompare(b.name));

      for (let i = 0; i < sortedStudents.length; i++){
        const teacher = await dbProcess.ShowOneUser(sortedStudents[i]!.teacher);
        await ctx.reply(script.studentFind.generalFind(
          sortedStudents[i].name,
          sortedStudents[i].id,
          sortedStudents[i].role,
          sortedStudents[i].username,
          sortedStudents[i].number,
          sortedStudents[i].typeOfLessons ?? "Індивідуальні",
          teacher?.name ?? "Відсутній",
          sortedStudents[i].individual_count ?? 0,
          sortedStudents[i].miro_link ?? "Відсутнє"
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.indiviualMenu(userObject!.role)
          }
        })
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
      SendNotification(notifbot, script.trialLesson.report(user['name'], user['username'], user['phone_number'], user['graphic'], user['languagelevel'], data.text, DateRecord()))
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

      ctx.reply(script.trialLesson.thanksPartTwo(user['graphic']), {
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
    const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
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
    else if (data.text === 'Запланувати ще одне заняття' && userI!.role === 'teacher'){
      const teachersStudents = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1)
      ?
      (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))?.registered_students : false;
      if (teachersStudents){
        let studentsKeyboard = [];
        for (let i = 0; i < teachersStudents.length; i++){
          studentsKeyboard.push([{ text: teachersStudents[i] }]);
        }
        ctx.reply('оберіть студента, з яким плануєте заняття:', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: studentsKeyboard
          }
        })

        await set('state')('IndividualLessonScheduleCheckAvailibilityStudentAndGetDateTime');
      }
      ctx.reply('нажаль, на данний момент ви не маєте жодного активного студента');
    }
    else if (data.text === 'Перенести ще одне заняття' && userI!.role === 'teacher'){
      ctx.reply('вкажіть дату заняття, яке ви хочете перенести у форматі: 23.05.2024');
      await set('state')('IndividualLessonRescheduleFindLesson');
    }
    else if (data.text === 'Видалити ще одне заняття' && userI!.role === 'teacher'){
      ctx.reply('вкажіть дату заняття, яке ви хочете видалити у форматі: 23.05.2024');
      await set('state')('IndividualLessonDeleteLessonFindLesson');
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
          keyboard: keyboards.choosePacket()
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
          keyboard: keyboards.choosePacket()
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
          keyboard: keyboards.choosePacket()
        },
      });
  
      await set('state')('RespondPacketAndGetPayment');
    }
    else if (CheckException.PhotoException(data)){
      const paymentStatus: string = await get('paymentStatus') ?? 'unknown',
        name = get("name") ?? "учень",
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.photo[0];

      // For Developer
      notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )
      
      // notifbot.telegram.sendPhoto(confirmationChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
      //   parse_mode: 'HTML',
      //   // ...Markup.inlineKeyboard(inline)
      //   }
      // )
  
      // notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
      //   parse_mode: 'HTML', 
      //   // ...Markup.inlineKeyboard(inline)
      //   }
      // )

      // notifbot.telegram.sendPhoto(eugeneChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
      //   caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
      //   parse_mode: 'HTML', 
      //   ...Markup.inlineKeyboard(inline)
      //   }
      // )
  
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
        unique_file_id = data.file[0];
  
      // For Developer
      notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )
      
      notifbot.telegram.sendDocument(confirmationChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()), 
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )
  
      notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
        parse_mode: 'HTML', 
        // ...Markup.inlineKeyboard(inline)
        }
      )

      notifbot.telegram.sendDocument(eugeneChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
        parse_mode: 'HTML', 
        // ...Markup.inlineKeyboard(inline)
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
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userObject!.role)
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
        unique_file_id = data.photo[0];
      
      // For Developer
      notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML', 
        // ...Markup.inlineKeyboard(inline)
        }
      )
      
      notifbot.telegram.sendPhoto(confirmationChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML', 
        // ...Markup.inlineKeyboard(inline)
        }
      )
  
      notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )

      notifbot.telegram.sendPhoto(eugeneChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )
  
      await ctx.reply(script.teacherOnHour.payment.paymentSent(await name ?? 'учень'));
      await ctx.reply(script.teacherOnHour.payment.waitForContact, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              // {
              //   text: 'Замовити ще одну зустріч',
              // },
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
        unique_file_id = data.file[0];
      
      // For Developer
      notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML', 
        // ...Markup.inlineKeyboard(inline)
        }
      )
      
      notifbot.telegram.sendDocument(confirmationChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML', 
        // ...Markup.inlineKeyboard(inline)
        }
      )
  
      notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )

      notifbot.telegram.sendDocument(eugeneChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
        caption: script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        parse_mode: 'HTML',
        // ...Markup.inlineKeyboard(inline)
        }
      )
  
      await ctx.reply(script.teacherOnHour.payment.paymentSent(await name ?? 'учень'));
      await ctx.reply(script.teacherOnHour.payment.waitForContact, {
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
      notifbot.telegram.sendMessage(devChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
        { parse_mode: 'HTML' });
  
      notifbot.telegram.sendMessage(confirmationChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
        { parse_mode: 'HTML' });
  
      notifbot.telegram.sendMessage(supportChat,
        script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()),
        { parse_mode: 'HTML' });

      notifbot.telegram.sendMessage(eugeneChat,
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
    else{
      switch(data.text){
        case "Реєстрація на клуб":
          if (userA!.role !== 'teacher'){
            const results = await dbProcess.ShowAll();
          if (!results.length){
              ctx.reply('наразі актуальних розмовних клубів немає(\nслідкуйте за оновленнями dehto😁', {
                parse_mode: "HTML",
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: await keyboards.speakingClubMenu(userA!.role)
                },
              })
            }
            else{
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
          }
          else{
            ctx.reply('викладачі не можуть записатись.')
          }
          break;

        case "Баланс моїх занять":
          if (userA!.count > 0){
            ctx.reply(script.speakingClub.lessLessons(userA!.count), {
              parse_mode: "HTML",
              reply_markup: {
                one_time_keyboard: true,
                keyboard: await keyboards.speakingClubMenu(userA!.role)
              },
            });
          }
          else{
            ctx.reply(script.speakingClub.lessLessons(userA!.count), {
              parse_mode: "HTML",
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.yesNo()
              }
            });
            await set('state')('RespondCheckLessonsAndGetLessons');
          }
          break;

        case "Мої реєстрації":
          const userActiveClubs = await dbProcess.getUserActiveClubs(ctx?.chat?.id ?? -1);

          if (userActiveClubs){
            await ctx.reply(script.speakingClub.report.mySpeackingClub.ifTrue(user['name']));
            for (let i = 0; i < userActiveClubs.length; i++){
              const actualClubData = await dbProcess.ShowData(new ObjectId(userActiveClubs[i]))

              await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1,
                actualClubData!.documentation,
                {caption: script.speakingClub.report.showOwnClubToUser(i + 1, actualClubData!.title, actualClubData!.teacher,
                  dbProcess.getDateClub(new Date(actualClubData!.date)), actualClubData!.time, actualClubData!.link)}
              );
            }

            ctx.reply('це всі ваші клуби :)', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: await keyboards.speakingClubMenu(userA!.role)
              }
            });
          }
          else{
            await ctx.reply(script.speakingClub.report.mySpeackingClub.ifFalse(user['name']), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.yesNo()
              }
            })

            await set('state')('MyClubEmptyHandler');
          }
          break;

        case "Про розмовні клуби":
          ctx.reply(script.speakingClub.about, {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ" }]]
            }
          })
    
          await set('state')('EndRootManager');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            parse_mode: "Markdown",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: await keyboards.speakingClubMenu(userA!.role)
            },
          });
          break;
      }
    }
    // if (data.text === 'Оплатити заняття'){
    //   const user = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    //   if (user!.role !== 'teacher'){
    //     ctx.reply(script.speakingClub.payPacketLesson, {
    //       parse_mode: "HTML",
    //       reply_markup: {
    //         one_time_keyboard: true,
    //         keyboard: keyboards.payPacketLessons()
    //       },
    //     });
    //     await set('temp-prev-state')('menu-state');
    //     await set('state')('RespondTypePacketAndGetPayment');
    //   }
    //   else{
    //     ctx.reply('викладачі не можуть оплачувати заняття.')
    //   }
    // }
  })

  // My Club Empty Handler
  onTextMessage('MyClubEmptyHandler', async(ctx, user, set, data) => {
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply("оберіть, що вас цікавить :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userObject!.role)
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
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply("Виберіть одну із запропонованих кнопок", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userObject!.role)
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
          keyboard: await keyboards.speakingClubMenu(currentUser!.role)
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
      await set('club-typeclub')(data.text);
      await set('state')('RespondPaymentAndGetCourseOrFinal');
    }
    else if (data.text === 'Шпрах клуб'){
      ctx.reply(script.speakingClub.standartClub);
      await set('club-typeclub')(data.text);
      await set('state')('RespondPaymentAndGetCourseOrFinal');
    }
    else if (data.text === 'Шпрах клуб плюс'){
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
        unique_file_id = data.photo[0];
  
      if (user['club-typeclub'] === 'Разове заняття'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptOncePayment(id, clubIndex, paymentStatus, date);

          await notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptOncePaymentWithoutClub(id, paymentStatus, date);

          await notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }

        await ctx.reply(`дякуємо, ${user['name']}🫶 ви успішно оплатили "${user['club-typeclub']}"!, очікуйте на підтвердження`, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'В МЕНЮ',
                },
                // {
                //   text: "Назад до реєстрації"
                // }
                // {
                //   text: '？Про Бота'
                // }
              ],
            ],
          },
        })

        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах клуб'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptClubWithPacketPayment(id, clubIndex, paymentStatus, 's', date);

          // packet and club
          // For Developer
          await notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 's');

          //packet
          // For Developer
          await notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        
        await ctx.reply(`дякуємо, ${user['name']}🫶 ви успішно оплатили "${user['club-typeclub']}"!, очікуйте на підтвердження`, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'В МЕНЮ',
                },
                // {
                //   text: "Назад до реєстрації"
                // }
                // {
                //   text: '？Про Бота'
                // }
              ],
            ],
          },
        })

        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах клуб плюс'){
        await set('sc_clubplus_proof')(data.photo[0]);
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

      if (user['club-typeclub'] === 'Разове Заняття'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptOncePayment(id, clubIndex, paymentStatus, date);

          // For Developer
          await notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptOncePaymentWithoutClub(id, paymentStatus, date);

          // For Developer
          await notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
      }
      else if (user['club-typeclub'] === 'Шпрах клуб'){
        const date = DateRecord();
        if (clubIndex !== ''){
          const inline = inlineAcceptClubWithPacketPayment(id, clubIndex, paymentStatus, "s", DateRecord());

          // For Developer
          notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 's');

          // For Developer
          notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          notifbot.telegram.sendDocument(supportChat, data.file[0], {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }

        ctx.reply(`дякуємо, ${user['name']}🫶 ви успішно оплатили "${user['club-typeclub']}"!, очікуйте на підтвердження`, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                {
                  text: 'В МЕНЮ',
                },
                // {
                //   text: "Назад до реєстрації"
                // }
                // {
                //   text: '？Про Бота'
                // }
              ],
            ],
          },
        })
        await set('state')('EndRootManager');
      }
      else if (user['club-typeclub'] === 'Шпрах клуб плюс'){
        await set('sc_clubplus_proof')(data.file[0]);
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
            notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptClubWithPacketPayment(ctx?.chat?.id ?? -1, user['sc_request_torecord_usertoclub'], paymentStatus, 'p', DateRecord());
  
            // For Developer
            notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
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
            notifbot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            notifbot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptPacketPayment(ctx?.chat?.id ?? -1, paymentStatus, 'plus');

            // For Developer
            notifbot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            notifbot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
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
                // {
                //   text: "Назад до реєстрації",
                // }
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
          keyboard: await keyboards.speakingClubMenu(currentUser!.role)
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
            await dbProcess.ChangeKeyData(currentClub!, 'count', currentClub!.count - 1, true);
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
              await notifbot.telegram.sendMessage(devChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
                
              await notifbot.telegram.sendMessage(confirmationChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
                
              // await sheets.changeAvaibleLessonStatus(ctx?.chat?.id ?? -1, false);
            }
            
            await ctx.reply(script.speakingClub.registrationLesson.acceptedRegistration(user['name'], dbProcess.getDateClub(new Date(currentClub!.date)), 
            currentClub!.time, currentClub!.link), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: await keyboards.speakingClubMenu(currentUser!.role)
              }
            });
            
            await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, currentClub!.documentation, {
              caption: `ось файл із лексикою, яка допоможе вам на розмовному клубі ;)`}
            )

            // await sheets.appendLessonToUser(currentUser!.id, currentUser!.name, currentUser!.number, currentUser!.username, currentUser!.email !== undefined ? currentUser!.email : 'пошта відсутня',
            //   DateRecord(), currentClub!.title, currentClub!.teacher);

            await set('state')('ActionClubRespondAndRootAction');
          }
          else{
            ctx.reply('ви вже зареєстровані на цей розмовний клуб! виберіть інший', {
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
          ctx.reply('у цього клуба відсутні місця! оберіть, будь ласка, інший', {
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
            ctx.reply('ви вже зареєстровані на цей розмовний клуб! виберіть інший', {
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
          ctx.reply('у цього клуба відсутні місця! оберіть, будь ласка, інший', {
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
    else if (data.text === 'Клуби'){
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
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply("З поверненням, Меркель! :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userObject!.role)
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
    
      if (results.length){
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
      else ctx.reply('наразі актуальних розмовних клубів немає(', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      }) 
    }
    else if (data.text === 'Редагувати'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      if (results.length){
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
      else ctx.reply('наразі актуальних розмовних клубів немає(', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      }) 
    }
    else if (data.text === 'Показати всі'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      if (results.length){
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
      else ctx.reply('наразі актуальних розмовних клубів немає(', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      })
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
      await set('AP_documentation')(data.file[0]);

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
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })
      
      await set('state')('RespondAdminActionAndRootChoose');
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
    
          await dbProcess.ChangeKeyData(dbProcess.GetObject(currentItem[parseInt(user['AP_respondkeydata_clubid'])]), keyForChange, parseInt(data.text), true);
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
        await dbProcess.ChangeKeyData(getCurrentClub[0]!, keyForChange, data.text, true);
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
      await dbProcess.ChangeKeyData(object, keyForChange, data.file[0], true);
      ctx.telegram.sendDocument(object.teacher_id, data.file[0], {caption: `Хей!\n\n🤝🏽 Хочемо повідомити, що у клуба ${object.title}, котрий на ${dbProcess.getDateClub(new Date(object.date))} о ${object.time} було змінено документ із лексикою\n\nПросимо ознайомитись❤️`});
      for (let i = 0; i < users.length; i++){
        if (await dbProcess.HasThisClubUser(users[i].id, object!._id)){
          await ctx.telegram.sendDocument(users[i].id, data.file[0], {caption: `Хей!\n\n🤝🏽 Хочемо повідомити, що у клуба ${object.title}, котрий на ${dbProcess.getDateClub(new Date(object.date))} о ${object.time} було змінено документ із лексикою\n\nПросимо ознайомитись❤️`});
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

          await dbProcess.ChangeKeyData(object!, 'date', `${data.text}-${user['change_date_month']}-${user['change_date_day']}`, true)
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
  
        await dbProcess.ChangeKeyData(object!, 'time', `${user['change_time_hour']}:${data.text}`, true);
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

        await dbProcess.ChangeKeyData(object!, 'teacher', teacher[0], true);
        await dbProcess.ChangeKeyData(object!, 'teacher_id', teacher[1], true);

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
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply("З поверненням, Меркель! :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userObject!.role)
        },
      })

      await set('state')('AdminRootHandler');
    }
    else if (data.text === 'Показати усіх користувачів'){
      const results = await dbProcess.ShowAllUsers();
      let userNumber = 1
    
      for (let i = 0; i < results.length; i++) {
        if (results[i].count > 0){
          if (i % 10 === 0 && i != 0){
            const messageWaiting = ctx.reply("Почекайте маленько, підгружаю ще...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await messageWaiting).message_id);
            await ctx.reply(script.speakingClub.report.showUser(userNumber, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.personalStudentAdminPanel()
              }
            });
            userNumber++;
          }
          else{
            await ctx.reply(script.speakingClub.report.showUser(userNumber, results[i].name, results[i].id, results[i].username, results[i].number, results[i].count, ConvertRole(results[i].role).toString()), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.personalStudentAdminPanel()
              }
            });
            userNumber++;
          }
        }
      }
    }
    else if (data.text === 'Знайти користувача за даними'){
      ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
      await set('state')('AdminSpeakingClubPersonalFindUser')
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

      await ctx.reply(`введіть число занять, яке має бути у користувача  (наразі є: 3 занять по 280uah)`);
      await set('state')('CheckAvaibleActivePacketAndChangeCountLesson');
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('CheckAvaibleActivePacketAndChangeCountLesson', async(ctx, user, set, data) => {
    
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1){
      await set('AP_UserChangeCountLesson_New')(data.text);
      await ctx.reply('✅ число занять змінено!');
      await ctx.reply('оберіть, за яким пакетом будуть додані заняття:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessons()
        }
      });
      await set('state')('ChangeCountUserLessonsAndPacket');
    }
    else ctx.reply('вам потрібно ввести число більше або рівне одиниці.');
  })

  onTextMessage('ChangeCountUserLessonsAndPacket', async(ctx, user, set, data) => {
    const User = await dbProcess.ShowOneUser(parseInt(user['admin_speakingclub_personal_find_user'])),
      teacher = await dbProcess.ShowOneUser(User!.teacher);

    if (CheckException.BackRoot(data)){
      await ctx.reply('Скільки додамо?', {reply_markup: {remove_keyboard: true}});
      await set('state')('CheckAvaibleActivePacketAndChangeCountLesson');
    }
    else if (data.text === 'Разове заняття (300uah)' || data.text === 'Пакет занять (280uah)'){
      const toWrite = parseInt(user['AP_UserChangeCountLesson_New']);
      await dbProcess.ChangeCountUser(User!._id, toWrite);
      await db.set(User!.id)('club-typeclub')(data.text);

      await ctx.reply(`✅ успішно виконана операція!`);
      await ctx.reply(script.studentFind.diffUserFind(
        User!.role,
        User!.id,
        User!.name,
        User!.username,
        User!.number,
        teacher? teacher.name: "відсутній",
        User!.individual_count ?? 0,
        User!.count ?? 0,
        User!.miro_link ?? "відсутнє",
        data.text
      ), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.usersOperationInTheClub()
        },
      })

      await set('state')('AdminSpeakingClubPersonalUserOperationHandler');
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
          keyboard: keyboards.yesNo()
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
      const User = await dbProcess.ShowOneUser(results.map(item => item.id)[parseInt(indexToDelete) - 1]);
      await dbProcess.DeleteUser(User!.id);

      ctx.reply(`✅ користувача ${User!.name} було успішно видалено!`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else if (data.text === 'ні'){
      const User = await dbProcess.ShowOneUser(results.map(item => item.id)[parseInt(indexToDelete) - 1]),
        teacher = await dbProcess.ShowOneUser(User!.teacher);
      await ctx.reply('фухх, а то думаємо якась помилка вже..')
      ctx.reply(script.studentFind.diffUserFind(
        User!.role,
        User!.id,
        User!.name,
        User!.username,
        User!.number,
        teacher?.name ?? "відсутній",
        User!.individual_count ?? 0,
        User!.count ?? 0,
        User!.miro_link ?? "відсутнє",
        await db.get(User!.id)('club-typepacket') ?? false
      ), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
    }
    else ctx.reply(script.errorException.chooseButtonError);
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

  onTextMessage('TeachersSetTasksHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text === 'ОБРАТИ СТУДЕНТА'){
      const teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teacherStudents = teacher!.registered_students;
      if (teacherStudents){
        let students = []
        for(let i = 0; i < teacherStudents.length; i++){
          students.push([{ text: teacherStudents[i] }]);
        }

        ctx.reply('виберіть стундента, котрому адресоване дане завдання', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: students
          }
        })

        await set('state')('TeachersChooseStudentHandler');
      }
      else ctx.reply('нажаль... у вас немає активних студентів :(');
    }
    else if (CheckException.TextException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.text}`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.FileException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.file[0]};${data.file[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}file`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.LocationException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.location[0]};${data.location[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}location`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.PhoneException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.phone_number[0]};${data.phone_number[1]}`)
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.PhotoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.photo[0]};${data.photo[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}photo`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.StickerException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.stickers}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}sticker`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.VideoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video[0]};${data.video[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']}` : ''}video`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.AudioException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.audio}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}audio`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.VoiceException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.voice}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}voice`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.VideoNoteException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video_circle}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}video_circle`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else ctx.reply('помилка(\n\nсхоже ви надіслали не підтримуваний тип повідомлення або ж тицьнули не туди')
  })

  onTextMessage('TeachersChooseStudentHandler', async(ctx, user, set, data) => {
    const teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
      teacherStudents = teacher!.registered_students;
    let students = [],
     studentsKeyboard = [];

    for(let i = 0; i < teacherStudents.length; i++){
      students.push(teacherStudents[i]);
      studentsKeyboard.push([{ text: teacherStudents[i] }])
    }
    if (students.includes(data.text)){
      const userID = await dbProcess.GetUserIDByName(data.text);
      if (userID){
        const userObject = await dbProcess.ShowOneUser(userID),
          previousTask = userObject!.detask ? userObject!.detask : false,
          message_operation = await dbProcess.WriteNewDeTask(
          ctx?.chat?.id ?? -1, 
          userID, 
          user['teacher_content_detask'] ? user['teacher_content_detask'].split(',') : false,
          user['teacher_filecontent_detask'] ? user['teacher_filecontent_detask'].split(',') : false,
          user['teacher_typeofcontent_detask'] ? user['teacher_typeofcontent_detask'].split(',') : false
        );

        ctx.reply(`${message_operation === 'student_task_rewrited' ? 'попереднє деЗавдання було видалено у студента, та додане нове успішно!' : 'завдання успішно додано студенту!'}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [[{text: "В МЕНЮ"}]]
          }
        });
        ctx.telegram.sendMessage(userID, "егей! у вас нове деЗавдання!");
        await set('teacher_content_detask')('');
        await set('teacher_filecontent_detask')('');
        await set('teacher_typeofcontent_detask')('');
        if (previousTask) await dbProcess.DeleteDeTask(userObject!.detask);
        await set('state')('EndRootManager');
      }
      else{
        ctx.reply('нажаль, цього студента не знайдено в базі данних, тому операція неможлива. спробуйте обрати іншого', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: studentsKeyboard
          }
        });
      }
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: studentsKeyboard
        }
      })
    }
  })

  onTextMessage('RespondStudentDeTaskHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text === 'ВІДПРАВИТИ ВІДПОВІДЬ'){
      const student = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        deTask = await dbProcess.GetDeTaskForStudent(student!.detask);

      await dbProcess.WriteAnswerToDeTask(
        deTask!._id, 
        user['student_content_detask'] ? user['student_content_detask'].split(',') : false, 
        user['student_filecontent_detask'] ? user['student_filecontent_detask'].split(',') : false, 
        user['student_typeofcontent_detask'] ? user['student_typeofcontent_detask'].split(',') : false
      );

      await set('student_content_detask')('');
      await set('student_filecontent_detask')('');
      await set('student_typeofcontent_detask')('');

      ctx.telegram.sendMessage(deTask!.idTeacher, `студент ${student!.name} дав відповідь на ваше деЗавдання!`);

      ctx.reply('завдання успішно здані!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })

      await set('state')('EndRootManager');
    }
    else if (CheckException.TextException(data)){
      await set('student_content_detask')(`${user['student_content_detask'] ? `${user['student_content_detask']},` : ''}${data.text}`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.FileException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.file[0]};${data.file[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}file`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.LocationException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.location[0]};${data.location[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}location`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.PhoneException(data)){
      await set('student_content_detask')(`${user['student_content_detask'] ? `${user['student_content_detask']},` : ''}${data.phone_number[0]};${data.phone_number[1]}`)
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.PhotoException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.photo[0]};${data.photo[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}photo`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.StickerException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.stickers}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}sticker`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.VideoException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.video[0]};${data.video[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']}` : ''}video`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.AudioException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.audio}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}audio`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else if (CheckException.VoiceException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.voice}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}voice`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.VideoNoteException(data)){
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.video_circle}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}video_circle`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ВІДПРАВИТИ ВІДПОВІДЬ"}]]
        }
      })
    }
    else{
      ctx.reply('помилка(\n\nсхоже ви надіслали не підтримуваний тип повідомлення або ж тицьнули не туди')
    }
  })

  onTextMessage('TeacherDeTaskHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){

    }
    else{
      const teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teachersStudents = teacher!.registered_students,
        teacherTasks = teacher!.set_detasks;
      let keyboard = [];
      switch(data.text){
        case "Дати завдання":
          ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню та після виберіть студента, якому адресовано деЗавдання')
          await set('state')('TeachersSetTasksHandler')
          break;

        case "Перевірити завдання":
          for (let i = 0; i < teachersStudents.length; i++){
            const studentID = await dbProcess.GetUserIDByName(teachersStudents[i]),
              userObject = await dbProcess.ShowOneUser(studentID),
              task = await dbProcess.GetStudentAnswerForDeTask(studentID);

            if (task){
              for (let j = 0; j < teacherTasks.length; j++){
                if (teacherTasks[j].toString() === userObject!.detask.toString()){
                  keyboard.push([{ text: teachersStudents[i]}])
                }
              }
            }
          }

          if (!keyboard.length){
            ctx.reply('нажаль... ви не маєте студентів, яким давали завдання, але ви можете це виправити :)', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.deTaskMenu()
              }
            });
          }
          else{
            ctx.reply('добренько, тепер виберіть студента, котрий вам потрібен', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboard
              }
            })
            await set('state')('GetStudentForTeacherDeTaskHandler');
          }
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.deTaskMenu() // TODO
            }
          })
      }
    }
  })

  onTextMessage('GetStudentForTeacherDeTaskHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){

    }
    else if (CheckException.TextException(data)){
      const studentID = await dbProcess.GetUserIDByName(data.text),
        student = await dbProcess.ShowOneUser(studentID),
        teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teacherTasks = teacher ? teacher.set_detasks : false,
        teacherRegisterStudents = teacher ? teacher.registered_students : false;
      let teacherHaveThisTask = false,
        errorKeyboard = [];

      for (let i = 0; i < teacherRegisterStudents.length; i++){
        errorKeyboard.push([{ text: teacherRegisterStudents[i] }]);
      }

      for (let i = 0; i < teacherTasks.length; i++){
        if (teacherTasks[i].toString() === student?.detask?.toString()){
          teacherHaveThisTask = true;
          break;
        }
      }

      if (student && teacherTasks && teacherRegisterStudents.includes(data.text)){
        const answer = await dbProcess.GetStudentAnswerForDeTask(studentID);

        await set('tmp_userid_detask')(studentID);

        if (student.detask){
          if (teacherHaveThisTask){
            console.log(answer[0])
            if (answer[0] !== 'no_answer_available'){
              await ctx.reply('чудова новина! з радістю повідомляємо, що студент дав відповідь на ваше завдання!');
              new Promise(resolve => setTimeout(() => resolve, 2000));
              if (answer){
                if (answer[0]){
                  const content = answer[0];
                  for (let i = 0; i < content.length; i++){
                    await ctx.reply(content[i]);
                  }
                }
                if (answer[1] && answer[2]){
                  const files = answer[1],
                    idAddress = ctx?.chat?.id ?? -1;
                  for (let i = 0; i < files.length; i++){
                    switch (answer[2][i]) {
                      case "file":
                        const file = files[i].split(';');
                        await ctx.telegram.sendDocument(idAddress, file[0], {caption: file[1] ? file[1] : ''});
                        break;
      
                      case "photo":
                        const photo = files[i].split(';');
                        await ctx.telegram.sendPhoto(idAddress, photo[0], {caption: photo[1] ? photo[1] : ''});
                        break;
      
                      case "audio":
                        await ctx.telegram.sendAudio(idAddress, files[i]);
                        break;
      
                      case "location":
                        const loc = files[i].split(';');
                        await ctx.telegram.sendLocation(idAddress, loc[0], loc[1]);
                        break;
      
                      case "video_circle":
                        await ctx.telegram.sendVideoNote(idAddress, files[i]);
                        break;
      
                      case "voice":
                        await ctx.telegram.sendVoice(idAddress, files[i]);
                        break;
      
                      case "contact":
                        const phone = files[i].split(';');
                        await ctx.telegram.sendContact(idAddress, phone[0], phone[1]);
                        break;
      
                      default:
                        ctx.reply('нам прикро, але надісланий студентом тип файлу наразі не підтримується, вибачте за труднощі...');
                        break;
      
                    }
                  }
                }
                await ctx.reply('всі відповіді студента :)', {
                  reply_markup: {
                    one_time_keyboard: true,
                    keyboard: keyboards.deTaskMenu('have_task')
                  }
                });

                await set('state')('EndTeacherDeTaskHandler');
              }
            }
            else{
              await set('detask_tmp_endkeyboard')('have_task');
              ctx.reply('нажаль, студент ще не дав відповіді на ваше завдання :(', {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: keyboards.deTaskMenu('have_task')
                }
              });
              await set('state')('EndTeacherDeTaskHandler');
            }
          }
          else{
            ctx.reply('вибачте, але ви не давали цьому студенту деЗавдання...', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: errorKeyboard
              }
            });
            ctx.telegram.sendMessage(devChat, `ERROR:\n\nTeacher ${user['name']} (id: ${ctx?.chat?.id ?? -1}, tg: @${user['username']}) has a student who did not give the assignment\n\nвибачте, але ви не давали цьому студенту деЗавдання...`)
          }
        }
        else{
          await set('detask_tmp_endkeyboard')('not_have_task');
          ctx.reply('студент не має деЗавдання, ви можете виправити це ;)', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.deTaskMenu('not_have_task')
            }
          })

          await set('state')('EndTeacherDeTaskHandler');
        }
      }
      else{
        ctx.reply(script.errorException.chooseButtonError, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: errorKeyboard
          }
        });
      }
    }
  })

  onTextMessage('EndTeacherDeTaskHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Дати інше завдання":
          ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню та після виберіть студента, якому адресовано деЗавдання')
          await set('detask_tmp_endkeyboard')('');
          await set('state')('AnotherTeachersSetTasksHandler');
          break;

        case "Дати завдання":
          ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню та після виберіть студента, якому адресовано деЗавдання')
          await set('detask_tmp_endkeyboard')('');
          await set('state')('AnotherTeachersSetTasksHandler');
          break;

        case "В МЕНЮ":
          console.log('FunctionRoot');
          const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
          ctx.reply(script.entire.chooseFunction, {
            parse_mode: "Markdown",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role)
            }
          })
          await set('detask_tmp_endkeyboard')('');
          await set('state')('FunctionRoot');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.deTaskMenu(user['detask_tmp_endkeyboard'])
            }
          })
          await set('detask_tmp_endkeyboard')('');
          break;
      }
    }
  })

  onTextMessage('AnotherTeachersSetTasksHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text === 'НАЗНАЧИТИ ЗАВДАННЯ'){
      const userID = parseInt(user['tmp_userid_detask']),
        userObject = await dbProcess.ShowOneUser(userID);

      if (userObject){
        const previousTask = userObject!.detask ? userObject!.detask : false,
          message_operation = await dbProcess.WriteNewDeTask(
            ctx?.chat?.id ?? -1, 
            userID, 
            user['teacher_content_detask'] ? user['teacher_content_detask'].split(',') : false, 
            user['teacher_filecontent_detask'] ? user['teacher_filecontent_detask'].split(',') : false,
            user['teacher_typeofcontent_detask'] ? user['teacher_typeofcontent_detask'].split(',') : false
          );

        ctx.reply(`${message_operation === 'student_task_rewrited' ? 'попереднє деЗавдання було видалено у студента, та додане нове успішно!' : 'завдання успішно додано студенту!'}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [[{text: "В МЕНЮ"}]]
          }
        });
        ctx.telegram.sendMessage(userID, "егей! у вас нове деЗавдання!");
        if (previousTask) await dbProcess.DeleteDeTask(userObject!.detask);
      }
      else ctx.reply('нажаль... виникла помилка, студент якого ви обрали на початку не знайдено в базі даних :(\n\nповторіть, будь ласка, знову', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })

      await set('teacher_content_detask')('');
      await set('teacher_filecontent_detask')('');
      await set('teacher_typeofcontent_detask')('');
      await set('tmp_userid_detask')('');
      await set('state')('EndRootManager');
    }
    else if (CheckException.TextException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.text}`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.FileException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.file[0]};${data.file[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}file`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.LocationException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.location[0]};${data.location[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}location`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.PhoneException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.phone_number[0]};${data.phone_number[1]}`)
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.PhotoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.photo[0]};${data.photo[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}photo`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.StickerException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.stickers}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}sticker`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.VideoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video[0]};${data.video[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']}` : ''}video`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.AudioException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.audio}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}audio`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else if (CheckException.VoiceException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.voice}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}voice`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "ОБРАТИ СТУДЕНТА"}]]
        }
      })
    }
    else if (CheckException.VideoNoteException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video_circle}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}video_circle`);
      await ctx.reply('добренько, що далі? чи вже готово?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{text: "НАЗНАЧИТИ ЗАВДАННЯ"}]]
        }
      })
    }
    else ctx.reply('помилка(\n\nсхоже ви надіслали не підтримуваний тип повідомлення або ж тицьнули не туди')
  })

  onTextMessage('StudentFindHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);
      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);
        await set('user_to_change_individual_id')(User.id);
        ctx.reply(script.studentFind.generalFind(
          User.name,
          User.id,
          User.role,
          User.username,
          User.number,
          User.typeOfLessons ?? "Індивідуальні",
          teacher?.name ?? "Відсутній",
          User.individual_count ?? 0,
          User.miro_link ?? "Відсутня"
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.individualFindUser()
          }
        })

        await set('state')('IndividualUserChangehandler');
      }
      else ctx.reply('такого студента в базі даних немає, спробуйте ще раз');
    }
  })

  onTextMessage('IndividualUserChangehandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){

    }
    else{
      const User = await dbProcess.ShowOneUser(parseInt(user['user_to_change_individual_id']));
      switch(data.text){
        case "Редагувати кількість занять":
          ctx.reply(`введіть число занять, яке має бути у студента (наразі є: ${User!.individual_count ?? 0} занять)`);
          await set('admin_parametr_to_change_individual')('individual_count');
          await set('state')('IndividualChangeUserDataHandler');
          break;

        case "Редагувати лінк":
          ctx.reply('вкажіть новий лінк на дошку студента')
          await set('admin_parametr_to_change_individual')('miro_link');
          await set('state')('IndividualChangeUserDataHandler');
          break;
        
        case "Перевести до іншого викладача":
          const AllUsers = await dbProcess.ShowAllUsers();
          let keyboardTeacher = []
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].role === 'teacher'){
              keyboardTeacher.push([{ text: AllUsers[i].name }]);
            }
          }
          ctx.reply('оберіть викладача, до якого ви хочете перевести студента:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboardTeacher
            }
          })
          await set('admin_parametr_to_change_individual')('translate_to_another_teacher');
          await set('state')('IndividualChangeUserDataHandler');
          break;

        case "Видалити студента":
          await set('admin_parametr_to_change_individual')('delete_student');
          ctx.reply('ви впевнені, що хочете видалити студента від викладача?', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo(true)
            }
          })
          await set('state')('DeleteStudentFromTeacherIndividualHandler');
          break;

        default:
          break;
      }
    }
  })

  onTextMessage('IndividualChangeUserDataHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      switch(user['admin_parametr_to_change_individual']){
        case "individual_count":
          if (!isNaN(parseInt(data.text)) && parseInt(data.text) >= 0){
            await dbProcess.IndividualChangeUserData(
              parseInt(user['user_to_change_individual_id']),
              user['admin_parametr_to_change_individual'],
              parseInt(data.text)
            );
            const User = await dbProcess.FindUser(user['user_to_change_individual_id']),
              teacher = await dbProcess.ShowOneUser(User.teacher);

            ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.changeCountStudentIndividualLesson(
              User!.name,
              User!.username,
              User!.number,
              User!.miro_link ?? "якогось дідька відсутнє",
              User!.individual_count ?? "якогось дідька 0"
            ));

            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.changeCountStudentIndividualLesson(
              teacher!.name,
              teacher!.username,
              teacher!.number,
              User!.miro_link ?? "якогось дідька відсутнє",
              User!.individual_count ?? "якогось дідька 0"
            ))
          }
          else{
            ctx.reply('введіть будь ласка цифру рівну або більше 0-ля');
          }
          break;

        default:
          const returnable_result = await dbProcess.IndividualChangeUserData(
            parseInt(user['user_to_change_individual_id']),
            user['admin_parametr_to_change_individual'],
            data.text
          );
          const User = await dbProcess.FindUser(user['user_to_change_individual_id']),
            teacher = await dbProcess.ShowOneUser(User.teacher);
          ctx.reply('успішно!');
          ctx.reply(script.studentFind.generalFind(
            User!.name,
            User!.id,
            User!.role,
            User!.username,
            User!.number,
            User!.typeOfLessons ?? "Індивідуальні",
            teacher?.name ?? "Відсутній",
            User!.individual_count ?? 0,
            User!.miro_link ?? "Відсутня"
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.individualFindUser()
            }
          })

          if (user['admin_parametr_to_change_individual'] === 'translate_to_another_teacher'){
            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.studentTransfer(
              User!.name,
              teacher!.name,
              teacher!.username,
              teacher!.number,
              User!.miro_link ?? "відсутнє",
              User!.individual_count ?? 0
            ));

            ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.studentTransfer(
              User!.name,
              User!.username,
              User!.number,
              User!.miro_link ?? "відсутнє",
              User!.individual_count ?? 0
            ))
          }
          else if (user['admin_parametr_to_change_individual'] === 'delete_student'){
            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.deleteStudent(returnable_result!.name));
            ctx.telegram.sendMessage(returnable_result!.id, script.notification.forTeachers.deleteStudent(
              User!.name,
              User!.username,
              User!.number
            ))
          }
          break;
      }
      await set('state')('IndividualUserChangehandler')
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('DeleteStudentFromTeacherIndividualHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      const User = await dbProcess.FindUser(user['user_to_change_individual_id']),
        teacher = await dbProcess.ShowOneUser(User!.teacher);
      switch(data.text){
        case "Так":
          await dbProcess.IndividualChangeUserData(
            parseInt(user['user_to_change_individual_id']),
            user['admin_parametr_to_change_individual'],
            data.text
          );
          ctx.telegram.sendMessage(User!.id, script.notification.forStudent.deleteStudent(teacher!.name));
          ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.deleteStudent(
            User!.name,
            User!.username,
            User!.number
          ));
          ctx.reply(script.indivdual.studentDeleteFromTeacher(teacher!.name, User!.name), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ" }]]
            }
          });
          await set('state')('EndRootManager');
          break;

        case "Ні":
          await ctx.reply('фухх, а то думаємо якась помилка вже..');
          await ctx.reply(script.studentFind.generalFind(
            User!.name,
            User!.id,
            User!.role,
            User!.username,
            User!.number,
            User!.typeOfLessons ?? "Індивідуальні",
            teacher!.name ?? "Відсутній",
            User!.individual_count ?? 0,
            User!.miro_link ?? "Відсутня"
            ), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: [[{ text: "В МЕНЮ" }]]
              }
            })
            await set('state')('EndRootManager');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo(true)
            }
          })
      }
    }
  })

  onTextMessage('AdminTeachersOperationHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const userID = await dbProcess.GetUserIDByName(data.text);
      const teacher = await dbProcess.ShowOneUser(userID);

      if (teacher && teacher.role === 'teacher'){
        await set('admin_teachersoperation_idone')(teacher.id);
        ctx.reply(script.studentFind.showTeacher(
          teacher.name,
          teacher.id,
          teacher.role,
          teacher.username,
          teacher.number,
          teacher.registered_students?.length ?? 0
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.ourTeachersMenu()
          }
        })

        await set('state')('AdminOurTeachersHandler');
      }
      else{
        const teachers = await dbProcess.ShowAllUsers();
        let teachersKeyboard = [];

        for (let i = 0; i < teachers.length; i++){
          if (teachers[i].role === 'teacher'){
            teachersKeyboard.push([{ text: teachers[i].name }]);
          }
        }

        ctx.reply(script.errorException.chooseButtonError, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: teachersKeyboard
          }
        });
      }
    }
    else{
      const teachers = await dbProcess.ShowAllUsers();
      let teachersKeyboard = [];

      for (let i = 0; i < teachers.length; i++){
        if (teachers[i].role === 'teacher'){
          teachersKeyboard.push([{ text: teachers[i].name }]);
        }
      }

      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: teachersKeyboard
        }
      })
    }
  })

  onTextMessage('AdminOurTeachersHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      const teacher = await dbProcess.ShowOneUser(parseInt(user['admin_teachersoperation_idone']));
      switch(data.text){
        case "Переглянути розклад викладача":
          const trialLessons = await dbProcess.GetUserTrialLessons(teacher!.id);
          if (teacher!.set_individual_lessons || trialLessons.length){
            const lessons = SortSchedule([
              ...await dbProcess.GetSpecificIndividualLessons(teacher!.set_individual_lessons),
              ...trialLessons
            ]);
            let lastDateLoop = '', lessonProcess: IndividualArray = {}
  
            for (let i = 0; i < lessons.length; i++){
              if (lastDateLoop === lessons[i]!.date) continue;
              else lessonProcess[lessons[i]!.date] = []
            }
  
            const keys = Object.keys(lessonProcess);
            for (let i = 0; i < keys.length; i++){
              for (let j = 0; j < lessons.length; j++){
                if (keys[i] === lessons[j]!.date){
                  lessonProcess[keys[i]].push(lessons[j])
                }
              }
            }
  
            for (let i = 0; i < keys.length; i++){
              const key = keys[i];
              let message = `📋 ${getDayOfWeek(new Date(key))} ${key}\n\n`;
      
              for (let j = 0; j < lessonProcess[key].length; j++) {
                const lesson = lessonProcess[key][j],
                  student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
                message += script.indivdual.rescheduleForTeacher(
                  j + 1,
                  lesson.time,
                  lesson.duration,
                  student? student.name : "Не вдалося знайти ім'я в БД :(",
                  student? student.username : "unknown",
                  student? student.number : "не вдалося знайти номеру :("
                )
              }
      
              await ctx.reply(message, {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: keyboards.ourTeachersMenu()
                }
              });
            }
          
          }
          else ctx.reply('на данний момент у викладача вісутні заняття', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.ourTeachersMenu()
            }
          });
          break;

        case "Показати усіх студентів викладача":
          const teacherStudents = teacher!.registered_students;
          let teachersStudentsObjects = [],
            teachersStudentsObjectsKeyboard = [];
            
          if (teacherStudents){
            for (let i = 0; i < teacherStudents.length; i++){
              teachersStudentsObjects.push(await dbProcess.ShowOneUser(await dbProcess.GetUserIDByName(teacherStudents[i])));
            }

            console.log(teachersStudentsObjects);
  
            const sortedStudents = teachersStudentsObjects.slice().sort((a: any, b: any) => a.name.localeCompare(b.name));
            for (let i = 0; i < sortedStudents.length; i++){
              teachersStudentsObjectsKeyboard.push([{ text: sortedStudents[i]!.name }])
            }

            for (let i = 0; i < sortedStudents.length; i++){
              await ctx.reply(script.studentFind.individualFind(
                sortedStudents[i]!.name,
                sortedStudents[i]!.id,
                sortedStudents[i]!.role,
                sortedStudents[i]!.username,
                sortedStudents[i]!.number,
                sortedStudents[i]!.individual_count ?? 0,
                sortedStudents[i]!.miro_link ?? "Відсутнє"
              ))
            }
            await ctx.reply('оберіть студента, який вас цікавить:', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: teachersStudentsObjectsKeyboard
              }
            })
          }
          else ctx.reply('у викладача немає студентів');
          await set('state')('StudentFindHandler');
          break;

        case "Видалити викладача":
          ctx.reply('ви впевнені, що хочете видалити викладача?', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo(true)
            }
          })
          await set('state')('AdminTeacherDeleteFromPost');
          break;

        default:
          break;
      }
    }
  })

  onTextMessage('AdminTeacherDeleteFromPost', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      const teacher = await dbProcess.ShowOneUser(parseInt(user['admin_teachersoperation_idone']));
      switch(data.text){
        case "Так":
          await dbProcess.DeleteTeacherFromPost(parseInt(user['admin_teachersoperation_idone']))
          ?
          ctx.reply('✅ викладача Мякишева катерина було успішно видалено', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ"} ]]
            }
          })
          :
          ctx.reply('✅ помилка при видаленні викладача', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ"} ]]
            }
          })
          await set('state')('EndFunctionManager')
          break;

        case "Ні":
          await ctx.reply('фухх, а то думаємо якась помилка вже..');
          await ctx.reply(script.studentFind.showTeacher(
            teacher!.name,
            teacher!.id,
            teacher!.role,
            teacher!.username,
            teacher!.number,
            teacher!.registered_students.length
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.ourTeachersMenu()
            }
          })
          await set('state')('AdminOurTeachersHandler');
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

  onTextMessage('AdminUsersOperationHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Знайти користувача за даними":
          ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
          await set('state')('FindUserAndGoToOperationWithHim');
          break;

        case "Показати усіх користувачів":
          const users = await dbProcess.ShowAllUsers();
          let userNumber = 1;

          for (let i = 0; i < users.length; i++){
            if (users[i].individual_count > 0 || users[i].count > 0){
              if (i % 10 === 0){
                const messageDelay = await ctx.reply('зачекайте, підгружаємо ще студентів...');
                new Promise((resolve: any, reject) => setTimeout(() => resolve(42), 2000));
                ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, messageDelay.message_id);
              }
              const teacher = await dbProcess.ShowOneUser(users[i].teacher) ? await dbProcess.ShowOneUser(users[i].teacher) : false;
              await ctx.reply(script.studentFind.userFind(
                userNumber,
                users[i].id,
                users[i].name,
                users[i].username,
                users[i].number,
                users[i].role,
                teacher? teacher.name: "відсутній",
                users[i].individual_count ?? 0,
                users[i].count ?? 0,
                users[i].miro_link,
                await db.get(users[i].id)('club-typeclub') ?? false
              ), {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: keyboards.usersMenu()
                }
              })
              userNumber++;
            }
          }
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.usersMenu()
            }
          })
          break;
      }
    }
  })

  onTextMessage('FindUserAndGoToOperationWithHim', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);

        await set('admin_tmp_usersoperation_user_role')(User.role);
        await set('admin_tmp_usersoperation_user_id')(User.id);

        ctx.reply(script.studentFind.diffUserFind(
          User.role,
          User.id,
          User.name,
          User.username,
          User.number,
          teacher? teacher.name: "відсутній",
          User.individual_count ?? 0,
          User.count ?? 0,
          User.miro_link ?? "відсутнє",
          await db.get(User.id)('club-typeclub') ?? false,
          User.registered_students?.length ?? 0
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.usersOperations(User.role)
          }
        })

        await set('state')('OperationWithUserHandler')
      }
      else ctx.reply('такого користувача в базі даних немає, або ви неправильно ввели дані, спробуйте ще раз');
    }
  })

  onTextMessage('OperationWithUserHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Змінити роль користувачу":
          ctx.reply('оберіть нову роль користувача:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.roleChange()
            }
          })
          await set('state')('AdminChangeRoleForUserHadnler')
          break;

        case "Змінити ім’я користувачу":
          ctx.reply('введіть нове ім’я');
          await set('state')('AdminChangeNameForUserHadnler');
          break;

        case "Додати на пробне":
          const users = await dbProcess.ShowAllUsers(),
            actualStudent = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id']))
          let teachersKeyboard = []

          for (let i = 0; i < users.length; i++){
            if (users[i].role === 'teacher' && !users[i].registered_students?.includes(actualStudent)){
              teachersKeyboard.push([{ text: users[i].name }])
            }
          }
          ctx.reply('оберіть викладача, до якого ви хочете додати студента:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: teachersKeyboard
            }
          })
          await set('state')('AdminAddUserToTeacherAndTrial_RespondTeacher');
          break;

        case "Додати викладачеві":
          const _users = await dbProcess.ShowAllUsers(),
            _actualStudent = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id']))
          let _teachersKeyboard = []

          for (let i = 0; i < _users.length; i++){
            if (_users[i].role === 'teacher' && !_users[i].registered_students?.includes(_actualStudent)){
              _teachersKeyboard.push([{ text: _users[i].name }])
            }
          }
          ctx.reply('оберіть викладача, до якого ви хочете додати студента:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: _teachersKeyboard
            }
          })
          await set('state')('AdminAddUserToTeacher_RespondTeacher')
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.usersOperations(user['admin_tmp_usersoperation_user_role'])
            }
          })
      }
    }
  })

  onTextMessage('AdminChangeRoleForUserHadnler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id']))

      if (User){
        await dbProcess.ChangeKeyData(User, 'role', Role(data.text), false);
        const updatedUser = await dbProcess.ShowOneUser(User.id);
        await ctx.reply('роль користувача успішно змінена!');
        if (updatedUser){
          const teacher = await dbProcess.ShowOneUser(User.teacher);
          ctx.reply(script.studentFind.diffUserFind(
            updatedUser.role,
            updatedUser.id,
            updatedUser.name,
            updatedUser.username,
            updatedUser.number,
            teacher? teacher.name: "відсутній",
            updatedUser.individual_count ?? 0,
            updatedUser.count ?? 0,
            updatedUser.miro_link ?? "відсутнє",
            await db.get(User.id)('club-typeclub') ?? false
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ" }]]
            }
          })
          await set('state')('EndRootManager');
        }
        else ctx.reply('виникла помилка :( (помилка: не знайдено оновлений образ користувача)');
      }
      else ctx.reply('виникла помилка :( (помилка: не знайдено потрібного користувача)');
    }
  })

  onTextMessage('AdminChangeNameForUserHadnler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id'])),
        userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

      if (User){
        await dbProcess.ChangeKeyData(User, 'name', data.text, false);
        const updatedUser = await dbProcess.ShowOneUser(User.id);
        await ctx.reply(`ім'я користувача успішно змінено!`);
        if (updatedUser){
          const teacher = await dbProcess.ShowOneUser(User.teacher);
          ctx.reply(script.studentFind.diffUserFind(
            updatedUser.role,
            updatedUser.id,
            updatedUser.name,
            updatedUser.username,
            updatedUser.number,
            teacher? teacher.name: "відсутній",
            updatedUser.individual_count ?? 0,
            updatedUser.count ?? 0,
            updatedUser.miro_link ?? "відсутнє",
            await db.get(User.id)('club-typeclub') ?? false
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.usersOperations(userObject!.role)
            }
          })
          await set('state')('OperationWithUserHandler');
        }
        else ctx.reply('виникла помилка :( (помилка: не знайдено оновлений образ користувача)');
      }
      else ctx.reply('виникла помилка :( (помилка: не знайдено потрібного користувача)');
    }
  })

  onTextMessage('AdminAddUserToTeacherAndTrial_RespondTeacher', async(ctx, user, set, data) => {
    const users = await dbProcess.ShowAllUsers(),
        actualStudent = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id']))
      let teachersReg = [], teachersKeyboard = [];

    for (let i = 0; i < users.length; i++){
      if (users[i].role === 'teacher' && !users[i].registered_students?.includes(actualStudent)){
        teachersKeyboard.push([{ text: users[i].name}]);
      }
    }

    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      for (let i = 0; i < users.length; i++){
        if (users[i].role === 'teacher' && !users[i].registered_students?.includes(actualStudent)){
          teachersReg.push(users[i].name);
        }
      }

      if (teachersReg.includes(data.text)){
        await set('admin_tmp_usersoperation_teacher_id')(await dbProcess.GetUserIDByName(data.text));
        ctx.reply('додайте лінк на дошку студента');
        await set('state')('AdminAddUserToTeacherAndTrial_RespondMiro');
      }
      else ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: teachersKeyboard
        }
      })
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: teachersKeyboard
      }
    })
  })

  onTextMessage('AdminAddUserToTeacherAndTrial_RespondMiro', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text.startsWith("https://miro.com/")){
      const student = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id'])),
        teacher = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_teacher_id'])),
        inline = inlineScheduleTrialLessonTeacher(teacher!.id, student!.id);

      ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.addStudentForTeacherForTrialLesson(
        student!.name,
        student!.username,
        student!.number,
        student!.miro_link
      ), { ...Markup.inlineKeyboard(inline)});

      await dbProcess.UsersOperationWithGuest(student!.id, teacher!.id, data.text, 'trial_teacher');
      ctx.reply(script.operationWithGuest(student!.name, teacher!.name, data.text, true), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      });
      await set('state')('EndRootManager');
    }
    else ctx.reply('це не схоже на лінк для міро...');
  })

  onTextMessage('AdminAddUserToTeacher_RespondTeacher', async(ctx, user, set, data) => {
    const users = await dbProcess.ShowAllUsers(),
        actualStudent = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id']))
      let teachersReg = [], teachersKeyboard = [];

    for (let i = 0; i < users.length; i++){
      if (users[i].role === 'teacher' && !users[i].registered_students?.includes(actualStudent)){
        teachersKeyboard.push([{ text: users[i].name}]);
      }
    }

    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      for (let i = 0; i < users.length; i++){
        if (users[i].role === 'teacher' && !users[i].registered_students?.includes(actualStudent)){
          teachersReg.push(users[i].name);
        }
      }

      if (teachersReg.includes(data.text)){
        await set('admin_tmp_usersoperation_teacher_id')(await dbProcess.GetUserIDByName(data.text));
        ctx.reply('додайте лінк на дошку студента');
        await set('state')('AdminAddUserToTeacher_RespondMiro');
      }
      else ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: teachersKeyboard
        }
      })
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: teachersKeyboard
      }
    })
  })

  onTextMessage('AdminAddUserToTeacher_RespondMiro', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text.startsWith("https://miro.com/")){
      const student = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id'])),
        teacher = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_teacher_id']));

      ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.addStudentForTeacher(
        student!.name,
        student!.username,
        student!.number,
        data.text,
        student!.individual_count ?? 0
      ))

      ctx.telegram.sendMessage(student!.id, script.notification.forStudent.addStudentForTeacher(
        student!.name,
        teacher!.name,
        teacher!.username,
        teacher!.number,
        data.text,
        student!.individual_count ?? 0
      ))
      await dbProcess.UsersOperationWithGuest(student!.id, teacher!.id, data.text, 'just_teacher');
      ctx.reply(script.operationWithGuest(student!.name, teacher!.name, data.text), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      });
      await set('state')('EndRootManager');
    }
    else ctx.reply('це не схоже на лінк для міро...');
  })

  onTextMessage('AdminSpeakingClubPersonalFindUser', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);

      if (User){
        await set('admin_speakingclub_personal_find_user')(User.id)
        const teacher = await dbProcess.ShowOneUser(User.teacher);
        ctx.reply(script.studentFind.diffUserFind(
          User.role,
          User.id,
          User.name,
          User.username,
          User.number,
          teacher? teacher.name : "відсутній",
          User.individual_count ?? 0,
          User.count ?? 0,
          User.miro_link ?? "відсутнє",
          await db.get(User.id)('type_clubpacket') ?? false
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.usersOperationInTheClub()
          }
        })

        await set('state')('AdminSpeakingClubPersonalUserOperationHandler')
      }
      else ctx.reply('такого користувача в базі даних немає або ви неправильно ввели дані, спробуйте ще раз');
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('AdminSpeakingClubPersonalUserOperationHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Редагувати заняття":
          const userOperation = await dbProcess.ShowOneUser(parseInt(user['admin_speakingclub_personal_find_user']));
          await ctx.reply(`введіть число занять, яке має бути у користувача (наразі є: ${userOperation!.count} занять по ${ConvertToPrice(await db.get(userOperation!.id)('club-typeclub') ?? '') ?? 0}uah)`);
          await set('state')('CheckAvaibleActivePacketAndChangeCountLesson');
          break;

        case "Змінити активний пакет":
          ctx.reply('оберіть пакет, на який ви хочете змінити актуальний:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.payPacketLessons()
            }
          })
          await set('state')('AdminChangeUserActivePacketHandler')
          break;

        case "Видалити користувача":
          ctx.reply('ви впевнені, що хочете видалити користувача?', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo(true)
            }
          });
          await set('state')('AdminClubDeleteUserHandler');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.usersOperationInTheClub()
            }
          })
          break;
      }
    }
  })

  onTextMessage('AdminChangeUserActivePacketHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text === 'Разове заняття (300uah)' || data.text === 'Пакет занять (280uah)'){
      const User = await dbProcess.ShowOneUser(parseInt(user['admin_speakingclub_personal_find_user'])),
        teacher = await dbProcess.ShowOneUser(User!.teacher);
      await set('club-typeclub')(data.text);
      await ctx.reply('✅ успішно виконана операція!');

      await ctx.reply(script.studentFind.diffUserFind(
        User!.role,
        User!.id,
        User!.name,
        User!.username,
        User!.number,
        teacher? teacher.name: "відсутній",
        User!.individual_count ?? 0,
        User!.count ?? 0,
        User!.miro_link ?? "відсутнє",
        data.text
      ), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.usersOperationInTheClub()
        }
      })
      await set('state')('AdminSpeakingClubPersonalUserOperationHandler');
    }
    else ctx.reply(script.errorException.chooseButtonError);
  })

  onTextMessage('AdminClubDeleteUserHandler', async(ctx, user, set, data) => {
    const User = await dbProcess.ShowOneUser(parseInt(user['admin_speakingclub_personal_find_user'])),
      teacher = await dbProcess.ShowOneUser(User!.teacher);
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Так":
          // TO DO: LOGIC OF DELETE USER FROM CLUB
          ctx.reply(`✅ користувача Дмитро Меркель було успішно видалено!`, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ" }]]
            }
          })
          await set('state')('EndRootManager');
          break;
        
        case "Ні":
          await ctx.reply('фухх, а то думаємо якась помилка вже..');
          await ctx.reply(script.studentFind.diffUserFind(
            User!.role,
            User!.id,
            User!.name,
            User!.username,
            User!.number,
            teacher? teacher.name: "відсутній",
            User!.individual_count ?? 0,
            User!.count ?? 0,
            User!.miro_link ?? "відсутнє",
            data.text
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.usersOperationInTheClub()
            }
          })
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

  onTextMessage('AdminNotificationRepondText', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      await set('admin_notification_text')(data.text);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('AdminNotificationHandler', async(ctx, user, set, data) => {
    const AllUsers = await dbProcess.ShowAllUsers();
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Усім користувачам":
          for (let i = 0; i < AllUsers.length; i++){
            try{
              ctx.telegram.sendMessage(AllUsers[i].id, user['admin_notification_text'])
              ctx.reply('віправлено ✅', {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: [[{ text: "В МЕНЮ" }]]
                }
              })
              await set('state')('EndRootManager')
            } catch (err){
              console.log("Error to send message to user " +AllUsers[i].name +":"+err);
              ctx.reply(`не вдалося надіслати сповіщення користувачу ${AllUsers[i].name} :( Скоріш за все він нас заблокував)`)
            }
          }
          break;

        case "Лише викладачам":
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].role === 'teacher'){
              try{
                ctx.telegram.sendMessage(AllUsers[i].id, user['admin_notification_text']);
                ctx.reply('віправлено ✅', {
                  reply_markup: {
                    one_time_keyboard: true,
                    keyboard: [[{ text: "В МЕНЮ" }]]
                  }
                })
                await set('state')('EndRootManager')
              } catch (err){
                console.log("Error to send message to user " +AllUsers[i].name +":"+err);
                ctx.reply(`не вдалося надіслати сповіщення користувачу ${AllUsers[i].name} :( Скоріш за все він нас заблокував)`)
              }
            }
          }
          break;

        case "Лише студентам":
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].role === 'student'){
              try{
                ctx.telegram.sendMessage(AllUsers[i].id, user['admin_notification_text']);
                ctx.reply('віправлено ✅', {
                  reply_markup: {
                    one_time_keyboard: true,
                    keyboard: [[{ text: "В МЕНЮ" }]]
                  }
                })
                await set('state')('EndRootManager')
              } catch (err){
                console.log("Error to send message to user " +AllUsers[i].name +":"+err);
                ctx.reply(`не вдалося надіслати сповіщення користувачу ${AllUsers[i].name} :( Скоріш за все він нас заблокував)`)
              }
            }
          }
          break;

        case "Відправити конкретному юзеру":
          ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
          await set('state')('AdminSendNotificationSpecificUser')
      }
    }
  })

  onTextMessage('AdminSendNotificationSpecificUser', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);
        await set('admin_specific_user_send_notification_id')(User.id);
        await ctx.reply(script.studentFind.diffUserFind(
          User.role,
          User.id,
          User.name,
          User.username,
          User.number,
          teacher? teacher.name: "відсутній",
          User.individual_count ?? 0,
          User.count ?? 0,
          User.miro_link ?? "відсутнє",
          data.text,
          User.registered_student ?? 0 
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo()
          }
        })
        await set('state')('AdminSendNotificationSpecificUserHandler');
      }
      else ctx.reply('нажаль, такого користувача не знайдено, спробуйте ще раз, будь ласка')
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('AdminSendNotificationSpecificUserHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "так":
          try{
            ctx.telegram.sendMessage(parseInt(user['admin_specific_user_send_notification_id']),
            user['admin_notification_text']);
          } catch (err){
            const User = await dbProcess.ShowOneUser(parseInt(user['admin_specific_user_send_notification_id']))
            console.log("Error to send message to user " +User?.name ?? '??' +":"+err);
            ctx.reply(`не вдалося надіслати сповіщення користувачу ${User?.name ?? '(імені нема, можливо навіть в бд його нема)'} :( Скоріш за все він нас заблокував)`)
          }
          ctx.reply('віправлено ✅', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ" }]]
            }
          })
          await set('state')('EndRootManager')
          break;

        case "ні":
          ctx.reply('добренько, тоді шукаємо далі');
          await set('state')('AdminSendNotificationSpecificUser')
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            }
          })
          break;
      }
    }
  })

  onTextMessage('TeacherSchduleHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Запланувати заняття":
          const teachersStudents = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1)
          ?
          (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))?.registered_students : false;
          if (teachersStudents){
            let studentsKeyboard = [];
            for (let i = 0; i < teachersStudents.length; i++){
              studentsKeyboard.push([{ text: teachersStudents[i] }]);
            }
            ctx.reply('оберіть студента, з яким плануєте заняття:', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: studentsKeyboard
              }
            })

            await set('state')('IndividualLessonScheduleCheckAvailibilityStudentAndGetDateTime')
          }
          else ctx.reply('нажаль, на данний момент ви не маєте жодного активного студента');
          break;

        case "Перенести заняття":
          ctx.reply('вкажіть дату заняття, яке ви хочете перенести у форматі: 23.05.2024');
          await set('state')('IndividualLessonRescheduleFindLesson');
          break;

        case "Видалити заняття":
          ctx.reply('вкажіть дату заняття, яке ви хочете видалити у форматі: 23.05.2024');
          await set('state')('IndividualLessonDeleteLessonFindLesson');
          break;

        case "Запланувати пробне заняття":
          let keyboardTrials = [];
          const trialStudents = (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))!.trial_students;
          for (let i = 0; i < trialStudents.length; i++){
            keyboardTrials.push([{ text: trialStudents[i] }]);
          }
          ctx.reply('оберіть студента, з яким потрібно запланувати пробне заняття:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboardTrials
            }
          })

          await set('state')('IndividualLessonsTrialLessonRespondStudent');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.myScheduleTeacher()
            }
          })
          break;
      }
    }
  })

  onTextMessage('IndividualLessonScheduleCheckAvailibilityStudentAndGetDateTime', async(ctx, user, set, data) => {
    const teacherStudents = (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))?.registered_students;
    let students = [];
    
    for (let i = 0; i < teacherStudents.length; i++){
      students.push([{ text: teacherStudents[i] }]);
    }
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (teacherStudents.includes(data.text)){
      const User = await dbProcess.FindUser(data.text);
      if (User){
        await ctx.reply(script.studentFind.checkIndividualCountShowStudent(
          User.name,
          User.username,
          User.number,
          User.individual_count ?? 0
        ))

        if (User.individual_count > 0){
          await set('teacher_individual_lesson_schedule_student_id')(User.id);
          await ctx.reply('вкажіть день, місяць та рік у форматі:\n23.05.2024');
          await set('state')('IndividualLessonScheduleRespondDateAndCheckThis')
        }
        else await ctx.reply(`не можна запланувати заняття, у ${User.name} немає проплачених занять - повідомте в підтримку та оберіть іншого студента:`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: students
          }
        })
      }
      else ctx.reply(`нажаль, такого користувача як ${data.text} не знайдено в базі данних`)
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true, 
        keyboard: students
      }
    })
  })

  onTextMessage('IndividualLessonScheduleRespondDateAndCheckThis', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const date = DateProcess(data.text);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        await set('teacher_date_individual_lesson_set')(date[1]);
        ctx.reply(`перевірте, будь ласка, чи все корректно :)\n\nВи ввели ${date[0]}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo()
          }
        })

        await set('state')('IndividualLessonScheduleCheckDateAndGetTime');
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonScheduleCheckDateAndGetTime', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "так":
          ctx.reply('вкажіть години та хвилини за Києвом 🇺🇦 у форматі: 15:45');
          await set('state')('IndividualLessonScheduleCheckTimeAndGetDuration')
          break;

        case "ні":
          ctx.reply('хай йому грець! давайте знову, напишіть дату в форматі 19.03.2024');
          await set('state')('IndividualLessonScheduleRespondDateAndCheckThis');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            }
          })
          break;
      }
    }
  })

  onTextMessage('IndividualLessonScheduleCheckTimeAndGetDuration', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply('от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату 15:45\n\nповторіть, будь ласка, ще раз :)')
      }
      else{
        await set('teacher_time_individual_lesson_set')(time);
        ctx.reply('вкажіть, скільки триватиме заняття:', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.durationChoose()
          }
        })

        await set('state')('IndividualLessonScheduleSetDurationAndCreate')
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonScheduleSetDurationAndCreate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text === '60хв' || data.text === '90хв' || data.text === '30хв'){
      await dbProcess.CreateNewIndividualLesson(
        parseInt(user['teacher_individual_lesson_schedule_student_id']),
        ctx?.chat?.id ?? -1,
        user['teacher_date_individual_lesson_set'],
        user['teacher_time_individual_lesson_set'],
        parseInt(data.text.replace(/хв/g, '').trim())
      )

      const Teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        User = await dbProcess.ShowOneUser(parseInt(user['teacher_individual_lesson_schedule_student_id']));

      ctx.telegram.sendMessage(parseInt(user['teacher_individual_lesson_schedule_student_id']), 
        script.notification.forStudent.scheduleLesson(
          UniversalSingleDataProcess(new Date(user['teacher_date_individual_lesson_set']), 'day_of_week'),
          UniversalSingleDataProcess(new Date(user['teacher_date_individual_lesson_set']), 'day'),
          UniversalSingleDataProcess(new Date(user['teacher_date_individual_lesson_set']), 'month'),
          user['teacher_time_individual_lesson_set'],
          Teacher? Teacher.name: "не вдалося знайти вчителя",
          User?.miro_link ?? "відсутнє",
          User?.individual_count ?? 0
        ))
      
      if (User!.individual_count === 0){
        const inline = inlinePayButton(User!.id);
        notifbot.telegram.sendMessage(devChat, script.notification.forAdmins.notEnoughCountOfLessons(User!.name, User!.username, User!.number, Teacher!.name));
        notifbot.telegram.sendMessage(supportChat, script.notification.forAdmins.notEnoughCountOfLessons(User!.name, User!.username, User!.number, Teacher!.name));
        notifbot.telegram.sendMessage(confirmationChat, script.notification.forAdmins.notEnoughCountOfLessons(User!.name, User!.username, User!.number, Teacher!.name));
        notifbot.telegram.sendMessage(eugeneChat, script.notification.forAdmins.notEnoughCountOfLessons(User!.name, User!.username, User!.number, Teacher!.name));
        ctx.telegram.sendMessage(parseInt(user['teacher_individual_lesson_schedule_student_id']),
          script.notification.forStudent.notEnoughCountOfLessons(User!.name), {
            ...Markup.inlineKeyboard(inline)
          }
        )
      }

      if (User){
        const date = DateProcessToPresentView(user['teacher_date_individual_lesson_set'])
        ctx.reply(script.indivdual.individualLessonCreated(
          User.name,
          date[1],
          date[0],
          user['teacher_time_individual_lesson_set'],
          User.individual_count
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [
              [
                { text: "Запланувати ще одне заняття" }
              ],
              [
                { text: "В МЕНЮ" }
              ]
            ]
          }
        })

        await set('state')('EndRootManager');
      }
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.durationChoose()
      }
    })
  })

  onTextMessage('IndividualLessonRescheduleFindLesson', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const date = DateProcess(data.text);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        const lessons = await dbProcess.ShowAllInvdividualLessons();
        let activeLessons = [];

        for (let i = 0; i < lessons.length; i++){
          if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === date[1]){
            activeLessons.push(lessons[i]);
          }
        }

        if (activeLessons){
          let messageToSend = `📋 ${getDayOfWeek(new Date(date[1]))} ${DateProcessToPresentView(date[1])}\n\n`,
            keyboardChoose = [];

          for (let i = 0; i < activeLessons.length; i++){
            const User = await dbProcess.ShowOneUser(activeLessons[i].idStudent);
            keyboardChoose.push([{ text: (i + 1).toString() }])
            messageToSend += script.indivdual.rescheduleForTeacher(
              i + 1,
              activeLessons[i].time,
              activeLessons[i].duration,
              User!.name,
              User!.username,
              User!.number
            )
          }

          await set('teacher_reschedule_lesson_date_of_lesson')(date[1]);
          ctx.reply('оберіть заняття, яке ви хочете перенести:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboardChoose
            }
          })

          await set('state')('IndividualLessonRescheduleRespondLessonAndGetReason');
        }
        else ctx.reply('на жаль або на щастя в цей день у вас немає занять - вкажіть іншу дату');
      }
    }
  })

  onTextMessage('IndividualLessonRescheduleRespondLessonAndGetReason', async(ctx, user, set, data) => {
    const lessons = await dbProcess.ShowAllInvdividualLessons();
    let activeLessons = [];

    for (let i = 0; i < lessons.length; i++){
      if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === user['teacher_reschedule_lesson_date_of_lesson']){
        activeLessons.push(lessons[i]);
      }
    }
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (!isNaN(parseInt(data.text)) && activeLessons[parseInt(data.text) - 1]){
      await set('teacher_reschedule_lesson_id_of_lesson')(activeLessons[parseInt(data.text) - 1]._id.toString());
      ctx.reply('вкажіть причину перенесення заняття:');
      await set('state')('IndividualLessonRescheduleRespondReasonAndGetNewDate');
    }
  })
  
  onTextMessage('IndividualLessonRescheduleRespondReasonAndGetNewDate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      await set('teacher_reschedule_lesson_reason')(data.text);
      ctx.reply('вкажіть дату на коли перенести заняття у форматі: 23.05.2024');
      await set('state')('IndividualLessonRescheduleRespondDateAndCheckThis')
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonRescheduleRespondDateAndCheckThis', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const date = DateProcess(data.text);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        await set('teacher_date_individual_lesson_set')(date[1]);
        ctx.reply(`перевірте, будь ласка, чи все корректно :)\n\nВи ввели ${date[0]}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo()
          }
        })

        await set('state')('IndividualLessonRescheduleCheckDateAndGetTime');
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonRescheduleCheckDateAndGetTime', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "так":
          ctx.reply('вкажіть години та хвилини за Києвом 🇺🇦 у форматі: 15:45');
          await set('state')('IndividualLessonRescheduleCheckTimeAndGetDuration');
          break;

        case "ні":
          ctx.reply('хай йому грець! давайте знову, напишіть дату в форматі 19.03.2024');
          await set('state')('IndividualLessonRescheduleRespondDateAndCheckThis');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            }
          })
          break;
      }
    }
  })
  
  onTextMessage('IndividualLessonRescheduleCheckTimeAndGetDuration', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply('от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату 15:45\n\nповторіть, будь ласка, ще раз :)')
      }
      else{
        const allLessons = await dbProcess.ShowAllInvdividualLessons(),
          timeSplitted = parseInt(time.split(':')[0]);
        let free = false,
          busyBy = '';

        for (let i = 0; i < allLessons.length; i++){
          if (allLessons[i].idTeacher === ctx?.chat?.id && allLessons[i].date === user['teacher_date_individual_lesson_set']){
            const timeFromActiveLesson = parseInt(allLessons[i].time.split(':')[0]);

            if (timeFromActiveLesson + 1 >= timeSplitted || timeFromActiveLesson - 1 <= timeSplitted){
              free = true;
            }
            else{
              const User = await dbProcess.ShowOneUser(allLessons[i].idStudent);
              busyBy = User!.name;
              free = false;
              break;
            }
          }
        }
        if (free){
          await set('teacher_time_individual_lesson_set')(time);
          ctx.reply('вкажіть, скільки триватиме заняття:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.durationChoose()
            }
          })
  
          await set('state')('IndividualLessonRescheduleSetDurationAndCreate')
        }
        else ctx.reply(`на жаль, на цей час у вас заплановане заняття з ${busyBy}(\n\nвкажіть інший час у форматі: 15:45`)
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonRescheduleSetDurationAndCreate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (data.text === '60хв' || data.text === '90хв' || data.text === '30хв'){
      const lesson = (await dbProcess.GetSpecificIndividualLessons([new ObjectId(user['teacher_reschedule_lesson_id_of_lesson'])]))[0],
        User = await dbProcess.ShowOneUser(parseInt(user['teacher_individual_lesson_schedule_student_id'])),
        newDate = user['teacher_date_individual_lesson_set'];

      const updatedLesson = await dbProcess.EditExistIndividualLesson(
        new ObjectId(user['teacher_reschedule_lesson_id_of_lesson']),
        user['teacher_date_individual_lesson_set'],
        user['teacher_time_individual_lesson_set'],
        parseInt(data.text.replace(/хв/g, '').trim())
      )

      const newUserObject = await dbProcess.ShowOneUser(parseInt(user['teacher_individual_lesson_schedule_student_id']));

      notifbot.telegram.sendMessage(User!.id,
        script.notification.forStudent.rescheduleLesson(
          UniversalSingleDataProcess(new Date(lesson!.date), 'day_of_week'),
          UniversalSingleDataProcess(new Date(lesson!.date), 'day'),
          UniversalSingleDataProcess(new Date(lesson!.date), 'month'),
          lesson!.time,
          UniversalSingleDataProcess(new Date(newDate), 'day_of_week'),
          UniversalSingleDataProcess(new Date(newDate), 'day'),
          UniversalSingleDataProcess(new Date(newDate), 'month'),
          user['teacher_time_individual_lesson_set'],
          User!.miro_link ?? "відсутнє",
          newUserObject!.individual_count ?? 0
        ))

      SendNotification(notifbot, script.notification.forAdmins.rescheduleLesson(
        User!.name,
        User!.username,
        User!.number,
        user['name'],
        UniversalSingleDataProcess(new Date(newDate), 'day'),
        UniversalSingleDataProcess(new Date(newDate), 'month'),
        user['teacher_time_individual_lesson_set'],
        user['teacher_reschedule_lesson_reason'],
        User!.miro_link,
        User!.individual_count
      ))

      if (updatedLesson){
        if (User){
          const date = DateProcessToPresentView(user['teacher_date_individual_lesson_set'])
          ctx.reply(script.indivdual.individualLessonCreated(
            User.name,
            date[1],
            date[0],
            user['teacher_time_individual_lesson_set'],
            User.individual_count
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [
                [
                  { text: "Перенести ще одне заняття" }
                ],
                [
                  { text: "В МЕНЮ" }
                ]
              ]
            }
          })
  
          await set('state')('EndRootManager');
        }
      }
      else ctx.reply(`у користувача ${User!.name} недостатньо хвилин для подібних змін (наразі у нього ${User!.individual_count ?? 0}хв)`);
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.durationChoose()
      }
    })
  })

  onTextMessage('IndividualLessonDeleteLessonFindLesson', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const date = DateProcess(data.text);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        const lessons = await dbProcess.ShowAllInvdividualLessons();
        let activeLessons = [];

        for (let i = 0; i < lessons.length; i++){
          if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === date[1]){
            activeLessons.push(lessons[i]);
          }
        }

        if (activeLessons){
          let messageToSend = `📋 ${getDayOfWeek(new Date(date[1]))} ${DateProcessToPresentView(date[1])}\n\n`,
            keyboardChoose = [];

          for (let i = 0; i < activeLessons.length; i++){
            const User = await dbProcess.ShowOneUser(activeLessons[i].idStudent);
            keyboardChoose.push([{ text: (i + 1).toString() }])
            messageToSend += script.indivdual.rescheduleForTeacher(
              i + 1,
              activeLessons[i].time,
              activeLessons[i].duration,
              User!.name,
              User!.username,
              User!.number
            )
          }

          await set('teacher_delete_lesson_date_of_lesson')(date[1]);
          ctx.reply('оберіть заняття, яке ви хочете видалити:', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboardChoose
            }
          })

          await set('state')('IndividualLessonDeleteLessonRespondLessonAndGetReason');
        }
        else ctx.reply('на жаль або на щастя в цей день у вас немає занять - вкажіть іншу дату');
      }
    }
  })

  onTextMessage('IndividualLessonDeleteLessonRespondLessonAndGetReason', async(ctx, user, set, data) => {
    const lessons = await dbProcess.ShowAllInvdividualLessons();
    let activeLessons = [];

    for (let i = 0; i < lessons.length; i++){
      if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === user['teacher_reschedule_lesson_date_of_lesson']){
        activeLessons.push(lessons[i]);
      }
    }
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (!isNaN(parseInt(data.text)) && activeLessons[parseInt(data.text) - 1]){
      await set('teacher_delete_lesson_id_of_lesson')(activeLessons[parseInt(data.text) - 1]._id.toString());
      ctx.reply('вкажіть причину видалення заняття:');
      await set('state')('IndividualLessonDeleteRespondReasonAndVerifyDelete');
    }
  })

  onTextMessage('IndividualLessonDeleteRespondReasonAndVerifyDelete', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      await set('teacher_individual_lesson_delete_reason')(data.text);
      ctx.reply('ви впевнені, що хочете видалити заняття?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo(true)
        }
      });
      await set('state')('IndividualLessonDeleteFinalHandler');
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonDeleteFinalHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else{
      switch(data.text){
        case "Так":
          const lessonToDelete = (await dbProcess.GetSpecificIndividualLessons([new ObjectId(user['teacher_delete_lesson_id_of_lesson'])]))[0],
            User = await dbProcess.ShowOneUser(lessonToDelete!.idStudent),
            Teacher = await dbProcess.ShowOneUser(lessonToDelete!.idTeacher);

          await dbProcess.DeleteIndividualLesson(new ObjectId(user['teacher_delete_lesson_id_of_lesson']));

          ctx.telegram.sendMessage(User!.id, script.notification.forStudent.deleteIndividualLesson(
            UniversalSingleDataProcess(lessonToDelete!.date, 'day_of_week'),
            UniversalSingleDataProcess(lessonToDelete!.date, 'day'),
            UniversalSingleDataProcess(lessonToDelete!.date, 'month'),
            lessonToDelete!.time,
            User!.individual_count ?? 0
          ))

          SendNotification(notifbot, script.notification.forAdmins.deleteIndividualLesson(
            User!.name,
            User!.username,
            User!.number,
            Teacher!.name,
            UniversalSingleDataProcess(lessonToDelete!.date, 'day_of_week'),
            UniversalSingleDataProcess(lessonToDelete!.date, 'day'),
            UniversalSingleDataProcess(lessonToDelete!.date, 'month'),
            lessonToDelete!.time,
            user['teacher_individual_lesson_delete_reason'],
            User!.count
          ))
          
          ctx.reply('✅ заняття видалено', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [
                [
                  { text: "Видалити ще одне заняття" }
                ],[
                  { text: "В МЕНЮ" }
                ]
              ]
            }
          })
          await set('state')('EndRootManager');
          break;

        case "Ні":
          ctx.reply('фуух, так і знали, що це якась помилка)', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: [[{ text: "В МЕНЮ" }]]
            }
          })
          await set('state')('EndRootManager');
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

  onTextMessage('IndividualLessonsTrialLessonRespondStudent', async(ctx, user, set, data) => {
    let keyboardGuest = [];
    const AllTrials = (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))!.trial_students;
    for (let i = 0; i < AllTrials.length; i++){
      keyboardGuest.push([{ text: AllTrials[i] }]);
    }
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);

      if (User){
        await set('teacher_individual_trial_lesson_user_id')(User.id);
        await ctx.reply(script.studentFind.diffUserFind(
          User.role,
          User.id,
          User.name,
          User.username,
          User.number,
          "відсутній",
          User.individual_count ?? 0,
          User.count ?? 0,
          User.miro_link ?? "відсутнє",
          await db.get(User.id)('club-typeclub') ?? false
        ))
        await ctx.reply('вкажіть день, місяць та рік у форматі:\n23.05.2024');
        await set('state')('IndividualLessonsTrialLessonRespondDate');
      }
      else ctx.reply('такого користувача не знайдено в базі даних');
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboardGuest
      }
    })
  })

  onTextMessage('IndividualLessonsTrialLessonRespondDate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const date = DateProcess(data.text);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        await set('teacher_trial_date_of_lesson')(date[1]);
        ctx.reply('вкажіть години та хвилини за Києвом у форматі: 15:45');

        await set('state')('IndividualLessonTrialLessonRespondTime');
      }
    }
  })

  onTextMessage('IndividualLessonTrialLessonRespondTime', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply('от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату 15:45\n\nповторіть, будь ласка, ще раз :)')
      }
      else{
        const allLessons = await dbProcess.ShowAllInvdividualLessons(),
          timeSplitted = parseInt(time.split(':')[0]);
        let free = false,
          busyBy = '';

        for (let i = 0; i < allLessons.length; i++){
          if (allLessons[i].idTeacher === ctx?.chat?.id && allLessons[i].date === user['teacher_date_individual_lesson_set']){
            const timeFromActiveLesson = parseInt(allLessons[i].time.split(':')[0]);

            if (timeFromActiveLesson + 1 >= timeSplitted || timeFromActiveLesson - 1 <= timeSplitted){
              free = true;
            }
            else{
              const User = await dbProcess.ShowOneUser(allLessons[i].idStudent);
              busyBy = User!.name;
              free = false;
              break;
            }
          }
          else{
            free = true
          }
        }
        if (free){
          await set('teacher_time_individual_lesson_set')(time);
          ctx.reply('додайте посилання на конференцію зі студентом:');
  
          await set('state')('IndividualLessonRespondLinkAndCreate');
        }
        else ctx.reply(`на жаль, на цей час у вас заплановане заняття з ${busyBy}(\n\nвкажіть інший час у форматі: 15:45`)
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonRespondLinkAndCreate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      //back
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.ShowOneUser(parseInt(user['teacher_individual_trial_lesson_user_id'])),
        date = DateProcessToPresentView(user['teacher_trial_date_of_lesson']),
        teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

      await dbProcess.CreateTrialLesson(
        User!.id,
        ctx?.chat?.id ?? -1,
        user['teacher_trial_date_of_lesson'],
        user['teacher_time_individual_lesson_set'],
        data.text,
      )
      ctx.reply(script.indivdual.trialFinal(
        User!.name,
        date[1],
        date[0],
        user['teacher_time_individual_lesson_set'],
        User!.miro_link ?? "відсутнє",
        data.text
      ), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })
      
      ctx.telegram.sendMessage(User!.id, script.notification.forStudent.trialLessonByTeacher(
        UniversalSingleDataProcess(new Date(user['teacher_trial_date_of_lesson']), 'day_of_week'),
        UniversalSingleDataProcess(new Date(user['teacher_trial_date_of_lesson']), 'day'),
        UniversalSingleDataProcess(new Date(user['teacher_trial_date_of_lesson']), 'month'),
        user['teacher_time_individual_lesson_set'],
        teacher!.name,
        User!.miro_link ?? "відсутнє",
        data.text
      ));

      SendNotification(notifbot, script.notification.forAdmins.trialLessonByTeacher(
        UniversalSingleDataProcess(new Date(user['teacher_trial_date_of_lesson']), 'day_of_week'),
        UniversalSingleDataProcess(new Date(user['teacher_trial_date_of_lesson']), 'day'),
        UniversalSingleDataProcess(new Date(user['teacher_trial_date_of_lesson']), 'month'),
        user['teacher_time_individual_lesson_set'],
        User!.name,
        teacher!.name,
        User!.miro_link ?? "відсутнє",
        data.text
      ))

      await set('state')('EndRootManager');
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('UserLiveSupportHandler', async(ctx, user, set, data) => {
    if (data.text === 'ВІДМІНА'){
      const [ messages, chats ] = await dbProcess.GetMessageIDsLiveSupport(new ObjectId(user['userObjectCloseLiveSupport']));

      for(let n = 0; n < messages.length; n++){
        await ctx.telegram.editMessageReplyMarkup(chats[n], messages[n], undefined, Markup.inlineKeyboard(liveKeyboard(ctx?.chat?.id ?? -1, 'declined', user['userObjectCloseLiveSupport'])).reply_markup)
      }

      ctx.reply('Канал успішно закрито, сподіваємося ваше питання було вирішено!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      });

      ctx.telegram.sendMessage(user['activeHelperLiveSupport'], "Користувач закрив канал.", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })

      await dbProcess.ChangeAvaibiltyForOperator(parseInt(user['activeHelperLiveSupport']), true);
      await dbProcess.DeleteServiceCare(new ObjectId(user['userObjectCloseLiveSupport']));

      await db.set(parseInt(user['activeHelperLiveSupport']))('state')('EndRootManager');
      await set('state')('EndRootManager');
    }
    else{
      switch(true){
        case CheckException.TextException(data):
          ctx.telegram.sendMessage(user['activeHelperLiveSupport'], data.text, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.FileException(data):
          ctx.telegram.sendDocument(user['activeHelperLiveSupport'], data.file[0], {
            caption: data.file[1],
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.PhotoException(data):
          ctx.telegram.sendPhoto(user['activeHelperLiveSupport'], data.photo[0], {
            caption: data.photo[1],
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.LocationException(data):
          ctx.telegram.sendLocation(user['activeHelperLiveSupport'], data.location[0], data.location[1], {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.PhoneException(data):
          ctx.telegram.sendContact(user['activeHelperLiveSupport'], data.phone_number[0], user['name'], {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
  
        case CheckException.PollsException(data):
          ctx.telegram.sendMessage(user['activeHelperLiveSupport'], "Користувач надіслав тип повідомлення Polls (котрий не підтримується)", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
  
          ctx.reply("Вибачте, але такий тип повідомлення у нас не підтримується.", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.StickerException(data):
          ctx.telegram.sendSticker(user['activeHelperLiveSupport'], data.stickers, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.VideoException(data):
          ctx.telegram.sendVideo(user['activeHelperLiveSupport'], data.video[0], {
            caption: data.video[1],
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.AudioException(data):
          ctx.telegram.sendAudio(user['activeHelperLiveSupport'], data.audio, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
        
        case CheckException.VoiceException(data):
          ctx.telegram.sendVoice(user['activeHelperLiveSupport'], data.voice, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
        
        case CheckException.VideoNoteException(data):
          ctx.telegram.sendAudio(user['activeHelperLiveSupport'], data.video_circle, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
        
        default:
          ctx.reply("Вибачте, але таке не підтримується", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          });

          ctx.telegram.sendMessage(user['activeHelperLiveSupport'], "Користувач надіслав непідтримуваний тип повідомлення.", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
      }
    }
  })

  onTextMessage('OperatorLiveSupportHandler', async(ctx, user, set, data) => {
    if (data.text === 'ВІДМІНА'){
      const [ messages, chats ] = await dbProcess.GetMessageIDsLiveSupport(new ObjectId(user['operatorObjectCloseLiveSupport']));

      for(let n = 0; n < messages.length; n++){
        await ctx.telegram.editMessageReplyMarkup(chats[n], messages[n], undefined, Markup.inlineKeyboard(liveKeyboard(ctx?.chat?.id ?? -1, 'declined', user['operatorObjectCloseLiveSupport'])).reply_markup)
      }

      ctx.reply('Прекрасно, тепер можете відпочивати', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })

      ctx.telegram.sendMessage(user['activeUserLiveSupport'], "Оператор закрив канал, сподіваємося ваше питання було вирішено.", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })

      await dbProcess.ChangeAvaibiltyForOperator(ctx?.chat?.id ?? -1, true);
      await dbProcess.DeleteServiceCare(new ObjectId(user['operatorObjectCloseLiveSupport']));

      await db.set(parseInt(user['activeUserLiveSupport']))('state')('EndRootManager')
      await set('state')('EndRootManager');
    }
    else{
      switch(true){
        case CheckException.TextException(data):
          ctx.telegram.sendMessage(user['activeUserLiveSupport'], data.text, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.FileException(data):
          ctx.telegram.sendDocument(user['activeUserLiveSupport'], data.file[0], {
            caption: data.file[1],
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.PhotoException(data):
          ctx.telegram.sendPhoto(user['activeUserLiveSupport'], data.photo[0], {
            caption: data.photo[1],
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.LocationException(data):
          ctx.telegram.sendLocation(user['activeUserLiveSupport'], data.location[0], data.location[1], {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.PhoneException(data):
          ctx.telegram.sendContact(user['activeUserLiveSupport'], data.phone_number[0], user['name'], {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
  
        case CheckException.PollsException(data):
          ctx.telegram.sendMessage(user['activeUserLiveSupport'], "Користувач надіслав тип повідомлення Polls (котрий не підтримується)", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
  
          ctx.reply("Вибачте, але такий тип повідомлення у нас не підтримується.", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.StickerException(data):
          ctx.telegram.sendSticker(user['activeUserLiveSupport'], data.stickers, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.VideoException(data):
          ctx.telegram.sendVideo(user['activeUserLiveSupport'], data.video[0], {
            caption: data.video[1],
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;

        case CheckException.AudioException(data):
          ctx.telegram.sendAudio(user['activeUserLiveSupport'], data.audio, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
        
        case CheckException.VoiceException(data):
          ctx.telegram.sendVoice(user['activeUserLiveSupport'], data.voice, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
        
        case CheckException.VideoNoteException(data):
          ctx.telegram.sendAudio(user['activeUserLiveSupport'], data.video_circle, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
        
        default:
          ctx.reply("Вибачте, але таке не підтримується", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          });

          ctx.telegram.sendMessage(user['activeUserLiveSupport'], "Користувач надіслав непідтримуваний тип повідомлення.", {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
          break;
      }
    }
  })

  onTextMessage('CareServiceQuestionHandler', async(ctx, user, set, data) => {
    const serviceCare = await dbProcess.GetServiceCareObject(new ObjectId(user['student_tmp_service_care_id']));

    if (data.text === 'ВІДМІНИТИ'){
      ctx.reply('добренько, гадаємо це була помилка, гарного дня', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "В МЕНЮ" }]]
        }
      })

      for(let n = 0; n < serviceCare!.messageIDs.length; n++){
        await ctx.telegram.editMessageReplyMarkup(serviceCare!.chatIDs[n], serviceCare!.messageIDs[n], undefined, Markup.inlineKeyboard(liveKeyboard(ctx?.chat?.id ?? -1, 'declined', user['userObjectCloseLiveSupport'])).reply_markup)
      }

      await dbProcess.DeleteServiceCare(serviceCare!._id);
      await set('state')('EndRootManager');
    }
    else if (CheckException.TextException(data)){
      if (serviceCare!.question){
        ctx.reply('ви вже надали питання, очікуйте, будь ласка, на оператора', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [[{ text: "ВІДМІНИТИ" }]]
          }
        })
      }
      else{
        await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, data.text);
        ctx.reply('дякуємо, тепер, будь ласка, очікуйте на оператора', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: [[{ text: "ВІДМІНИТИ" }]]
          }
        })
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  bot.action(/^scheduleTrialLessonTeacher:(\d+),(.+)$/, async (ctx) => {
    const User = await dbProcess.FindUser(ctx.match[2]);

    if (User){
      await db.set(parseInt(ctx.match[1]))('teacher_individual_trial_lesson_user_id')(User.id);
      await ctx.reply(script.studentFind.diffUserFind(
        User.role,
        User.id,
        User.name,
        User.username,
        User.number,
        "відсутній",
        User.individual_count ?? 0,
        User.count ?? 0,
        User.miro_link ?? "відсутнє",
        await db.get(User.id)('club-typeclub') ?? false
      ))
      await ctx.reply('вкажіть день, місяць та рік у форматі:\n23.05.2024');
      await db.set(parseInt(ctx.match[1]))('state')('IndividualLessonsTrialLessonRespondDate');
    }
    else ctx.reply('помилка :( користувача не знайдено')
  });

  bot.action(/^acceptSupport:(\d+),(.+)$/, async (ctx) => {
    const id = Number.parseInt(ctx.match[1]),
      object = ctx.match[2],
      [ messages, chats ] = await dbProcess.GetMessageIDsLiveSupport(new ObjectId(object)),
      serviceCare = await dbProcess.GetServiceCareObject(new ObjectId(object));
    let operator: string | undefined = '';

    try {
      for(let n = 0; n < messages.length; n++){
        if (messages[n] === ctx.callbackQuery.message?.message_id){
          await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(liveKeyboard(id, 'accepted', ctx.match[2])).reply_markup);
          operator = await db.get(chats[n])('name');
          await db.set(id)('activeHelperLiveSupport')(chats[n]);
          await db.set(id)('userObjectCloseLiveSupport')(object);
          await db.set(chats[n])('operatorObjectCloseLiveSupport')(object);
          await db.set(chats[n])('activeUserLiveSupport')(id.toString());
          await db.set(chats[n])('state')('OperatorLiveSupportHandler');
          await db.set(id)('state')('UserLiveSupportHandler');
          await dbProcess.ChangeAvaibiltyForOperator(chats[n], false);
        }
        else await ctx.telegram.editMessageReplyMarkup(chats[n], messages[n], undefined, Markup.inlineKeyboard(liveKeyboard(id, 'busy', ctx.match[2])).reply_markup)
      }
      const userObject = await dbProcess.ShowOneUser(id);
      ctx.telegram.sendMessage(id, `вітаю, ${userObject!.name}! мене звати ${operator}, служба турботи dehto 💪`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.liveSupportProbablyCancel()
        }
      });
      ctx.reply('ви успішно прийняли запит користувача, можете працювати', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.liveSupportProbablyCancel()
        }
      })

      if (serviceCare?.quesion !== ''){
        console.log('yes');
        ctx.reply(serviceCare!.question, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.liveSupportProbablyCancel()
          }
        })
      }
    } catch (e) {
      console.log(e);
    }

    return ctx.answerCbQuery(`Ви успішно взяли замовлення`);
  });

  bot.action(/^acceptedCheck$/, (ctx) => {
    return ctx.answerCbQuery(`Ви вже прийняли цього користувача.`);
  });

  bot.action(/^busyCheck$/, (ctx) => {
    return ctx.answerCbQuery(`Цього користувача прийняв ішний оператор.`);
  });

  bot.action(/^declinedCheck$/, (ctx) => {
    return ctx.answerCbQuery(`Канал вже закритий, не актуально.`);
  });

  bot.action(/^errorCheck$/, (ctx) => {
    return ctx.answerCbQuery(`Помилка, повідомте підтримку.`);
  });

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
  notifbot.action(/^acceptPayment:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2])),
      dateRecord = ctx.match[3],
      users = await dbProcess.ShowAllUsers(),
      currentUser = await dbProcess.ShowOneUser(idUser);

    let currentAvailableCount = idClub!.count - 1

    await dbProcess.WriteNewClubToUser(idUser, idClub!._id)
    await dbProcess.ChangeKeyData(idClub!, 'count', currentAvailableCount, true);
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
      caption: `ось файл із лексикою, яка допоможе вам на шпрах-клубі ;)`
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

  notifbot.action(/^acceptPaymentWO:(\d+),(.+)$/, async (ctx) => {
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

  notifbot.action(/^declinePaymentWO:(\d+),(.+)$/, async (ctx) => {
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

  notifbot.action(/^declinePayment:(\d+),(.+),(.+)$/, async (ctx) => {
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

  notifbot.action(/^paidCheckT:(\d+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    return ctx.answerCbQuery(`Користувач: ${await db.get(idUser)('name')}, стан: ОПЛАЧЕНО`);
  });

  notifbot.action(/^nopaidCheckT:(\d+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    return ctx.answerCbQuery(`Користувач: ${await db.get(idUser)('name')}, стан: НЕ ОПЛАЧЕНО`);
  });

  // Club Packet Payment
  notifbot.action(/^acceptPaymentP:(\d+),(.+)$/, async (ctx) => {
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

  notifbot.action(/^declinePaymentP:(\d+),(.+)$/, async (ctx) => {
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
  notifbot.action(/^acceptPaymentCP:(\d+),(.+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2])),
      packetName = ctx.match[3] === 's' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS',
      dateRecord = ctx.match[4],
      users = await dbProcess.ShowAllUsers(),
      currentUser = await dbProcess.ShowOneUser(idUser);
    let recordedUsers = '';

    await dbProcess.ChangeCountUser(currentUser!._id, currentUser!.count + 4);
    await dbProcess.WriteNewClubToUser(idUser, idClub!._id)
    await dbProcess.ChangeKeyData(idClub!, 'count', idClub!.count - 1, true);
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
      caption: `ось файл із лексикою, яка допоможе вам на шпрах-клубі ;)`
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

  notifbot.action(/^declinePaymentCP:(\d+),(.+),(.+)$/, async (ctx) => {
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
        await dbProcess.ChangeKeyData(idClub!, 'count', idClub!.count - 1, true);
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
            keyboard: await keyboards.speakingClubMenu(currentUser!.role)
          }
        });
        
        await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, idClub!.documentation, {
          caption: `ось файл із лексикою, яка допоможе вам на шпрах-клубі ;)`}
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
            keyboard: keyboards.yesNo()
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

  bot.action(/^goToPay:(\d+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    ctx.reply(script.payInvidualLesson.chooseLevelCourse, {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.chooseLevelCourses()
      },
    });
    await db.set(idUser)('state')('RespondCourseAndGetPacket');
  })

  bot.launch();
  notifbot.launch();
}

main();