// DehtoBot for dehto German School
// Developed by Yaroslav Volkivskyi (TheLaidSon)

// Actual v2.0 Rebirth

// Main File
import script from "./data/general/script";
import packet from "./data/course/packets";
import * as schedule from 'node-schedule';
import { confirmationChat, supportChat, devChat, versionBot } from './data/general/chats';
import { CheckException } from "./base/handlers/check";
import arch from './base/main/architecture';
import getCourses, { Course, Courses, courseNumbersToSkip } from "./data/course/coursesAndTopics";
import Key from "./base/handlersdb/changeKeyValue";
import Role, { ConvertRole } from "./base/handlersdb/changeRoleValue";
import keyboards, { CheckDeveloper, checkChats } from "./data/keyboard/keyboards";
import { ConvertToPrice, ConvertToPacket } from "./data/process/convertPaymentPerLesson";
import { inlineApprovePayment, inlineAcceptOncePayment, inlineAcceptOncePaymentWithoutClub, 
  inlineAcceptPacketPayment, inlineAcceptClubWithPacketPayment, inlineEventAnnouncementClub,
  inlinePayButton, inlineScheduleTrialLessonTeacher, 
  inlineGoToDetaskSolution,
  inlineGoToDetaskCheck} 
  from "./data/keyboard/paymentButtons";
import formattedName from "./data/process/nameFormatt";
import { liveKeyboard } from "./data/keyboard/livekeyboard";
import DateRecord, { DateHistory, Time } from "./base/handlers/getTime";
import MongoDBReturnType from "./data/general/mongoDBType";
import { Markup, TelegramError } from "telegraf";
import { ObjectId } from 'mongodb';
import { DateProcess, DateProcessToPresentView, SortSchedule, 
  TimeProcess, UniversalSingleDataProcess, getDayOfWeek, 
  isDateNoInPast,
  isTimeNotInPast} from "./data/process/dateAndTimeProcess";
import IndividualArray from "./data/individual/interface";
import NotificationReg, { SendNotification, SendNotificationWithMedia } from "./data/notifications/notificationProcess";
import checkAvailabilityForLesson from "./data/general/lessonAvailabiltityCheck";

process.env.TZ = 'Europe/Kiev';

async function main() {
  const [ onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, notifbot, notiftoken, db, dbProcess ] = await arch();

  //Begin bot work, collecting user data (his telegram name) set up state_1
  bot.start( (ctx) => {
    console.log('MAIN BOT STARTED');

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
    console.log('MENU PRESSED');
    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    if (CheckDeveloper(ctx?.chat?.id ?? -1)) {
      await dbProcess.ChangeKeyData(userI!, 'role', 'developer', false);
    }

    await set('teacher_content_detask')('');
    await set('teacher_filecontent_detask')('');
    await set('teacher_typeofcontent_detask')('');
    await set('tmp_userid_detask')('');
    await set('detask_teacher_temp_message_continue')('');
    await set('student_content_detask')('');
    await set('student_filecontent_detask')('');
    await set('student_typeofcontent_detask')('');

    ctx.reply(script.entire.chooseFunction, {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role ?? 'guest')
      }
    })

    await set('state')('FunctionRoot');
  });

  bot.command('sysinfo', async (ctx) => {
    console.log('DEV CHECK SYSTEM INFO');

    const set = db.set(ctx?.chat?.id ?? -1),
      userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);

    ctx.reply(script.about(versionBot), {
      parse_mode: "Markdown",
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userI!.role ?? 'guest')
      }
    })

    await set('state')('FunctionRoot');
  })

  schedule.scheduleJob('*/5 * * * *', async () => {
    console.log('Notification job');
    await dbProcess.DeleteExpiredClubs();
    await dbProcess.DeleteExpiredIndividualLessons();
    await dbProcess.NotificateUserAboutLesson(bot.telegram);
    await dbProcess.NotificateUserAboutClubLesson(bot.telegram);
    await dbProcess.DeleteTeNoticationEntryData();
    await dbProcess.DeleteExpiredIndividualLessons();
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
    else if (data.text === 'деЗавдання' && (userI!.role === 'admin' || userI!.role === 'developer' || userI!.role === 'teacher')){
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      if (userI!.set_detasks){
        ctx.reply('оберіть одну із кнопок нижче:', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.deTaskMenu()
          }
        })
        await set('state')('TeacherDeTaskHandler');
      }
      else{
        if (userI!.registered_students?.length){
          ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню та після виберіть студента, якому адресовано деЗавдання');
          await set('detask_teacher_temp_message_continue')('');
          await set('state')('TeachersSetTasksHandler');
        }
        else ctx.reply('наразі у вас немає актуальних студентів', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
          }
        });
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
      await set('state')('AdminNotificationRepondText');
    }
    else if (data.text === "Розмовні клуби" && checkChats(ctx?.chat?.id ?? -1)){
      ctx.reply("що цікавить? :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.speakingClubStartAdminMenu()
        },
      })

      await set('state')('AdminRootHandler');
    }
    else if (data.text === 'Мої розмовні клуби' && userI!.role === 'teacher'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
      let haveClubs = false;

      // For Teachers
      for (let i = 0; i < results.length; i++){
        if (parseInt(results[i].teacher_id) === ctx?.chat?.id ?? -1){
          let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
          for (let j = 0; j < users.length; j++) {
            if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
              userHaved += `- ${users[j].name} (@${users[j].username})\n📲${users[j].number}\n\n`;
            }
          }
          
          if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
            userHaved = '';
          }

          let addString = results[i].count > 0 ? `<b>кількість доступних місць</b>: ${results[i].count}` : `❌ немає вільних місць ❌`;
  
          await ctx.telegram.sendDocument(ctx?.chat?.id ?? -1, results[i].documentation, { caption: script.speakingClub.report.showClubTypeTeacher(i + 1, results[i].title, results[i].teacher, dbProcess.getDateClub(new Date(results[i].date)), results[i].time, addString, userHaved, results[i].link), parse_mode: "HTML" });
          haveClubs = true;
        }
      }
      if (!haveClubs){
        const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
        ctx.reply('на данний момент у вас немає клубів', {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
          }
        });
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
          ctx.reply(script.liveSupport.allBusy, {
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
        ctx.reply(`✅ Баланс ваших індивідуальних занять ${count / 60} занять (${count}хв)`, {
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
    else if (data.text === 'Мої студенти' && userObject!.role === 'teacher'){
      const userData = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        students = userData ? userData.registered_students : false;
      let studentsObjects = [];

      if (students && students.length){
        for (let i = 0; i < students.length; i++){
          studentsObjects.push(await dbProcess.ShowOneUser(students[i]));
        }
        const sortedStudents = studentsObjects.slice().sort((a: any, b: any) => a.name.localeCompare(b.name));

        for (let i = 0; i < sortedStudents.length; i++){
          await ctx.reply(script.studentFind.individualShow(
            i + 1,
            sortedStudents[i]!.name,
            sortedStudents[i]!.username,
            sortedStudents[i]!.number,
            sortedStudents[i]!.individual_count ?? 0,
            sortedStudents[i]!.miro_link ?? 'відсутнє'
          ), {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.indiviualMenu(userData!.role)
            }
          });
        }
      }
      else{
        ctx.reply('у вас відсутні студенти', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.indiviualMenu(userData!.role)
          }
        })
      }
    }
    else if (data.text === 'Мої деЗавдання' && userObject!.role === 'student'){
      const userData = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        actualTask = userData ? userData.detask : false;

      if (actualTask){
        const task = await dbProcess.GetDeTaskForStudent(actualTask);
        await ctx.reply(`😏 ${user['name']}, ваше актуальне завдання:`);
        
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

                case "sticker":
                  await ctx.telegram.sendSticker(idAddress, files[i]);
                  break;

                case "video":
                  const video = files[i].split(';');
                  await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
                  break;

                default:
                  ctx.reply('нам прикро, але надісланий викладачем тип файлу наразі не підтримується, вибачте за труднощі...');

              }
            }
          }
          await ctx.reply('❗️*можна надсилати текстові повідомлення та усі види файлів (фото, відео, кружечки, войси і тд)\n\nнадішліть сюди усі відповіді, якщо їх декілька, надішліть по одному повідомленню');
          await set('state')('RespondStudentDeTaskHandler');
        }
      }
      else ctx.reply('вибачте, але у вас немає активних деЗавдань :(', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.indiviualMenu(userData!.role)
          }
        });
    }
    else if (data.text === 'Мій розклад'){
      if (userObject!.role === 'student'){
        const trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
        if (userObject!.individual_lessons || trialLessons?.length){
          const lessons = SortSchedule([
            ...(userObject?.individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(userObject?.individual_lessons) : []),
            ...(trialLessons?.length ? trialLessons : [])
          ].filter((lesson: any) => Object.keys(lesson).length));
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
            let message = `📋 <b>${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}</b>\n\n`;
    
            for (let j = 0; j < lessonProcess[key].length; j++) {
              const lesson = lessonProcess[key][j],
                student = await dbProcess.ShowOneUser(lesson.idStudent),
                teacher = await dbProcess.ShowOneUser(lesson.idTeacher);
              message += script.indivdual.scheduleShowStudent(
                lesson.time ?? 60,
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
          ctx.reply('на даний момент у вас відсутні заплановані заняття😐', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.indiviualMenu(userObject!.role)
            }
          });
        }
      }
      else if (userObject!.role === 'teacher'){
        const trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
        if (userObject?.set_individual_lessons?.length || trialLessons?.length){
          console.log(userObject?.set_individual_lessons)
          console.log(trialLessons?.length)
          const lessons = SortSchedule([
            ...(userObject?.set_individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(userObject?.set_individual_lessons) : []),
            ...(trialLessons?.length ? trialLessons : [])
          ].filter((lesson: any) => Object.keys(lesson).length));

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
            let message = `📋 <b>${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}</b>\n\n`;
    
            for (let j = 0; j < lessonProcess[key].length; j++) {
              const lesson = lessonProcess[key][j],
                student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
              message += script.indivdual.rescheduleForTeacher(
                j + 1,
                lesson.time,
                lesson.duration ?? 60,
                student? student.name : "Не вдалося знайти ім'я в БД :(",
                student? student.username : "unknown",
                student? student.number : "не вдалося знайти номеру :(",
                lesson.type
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
          ctx.reply('на даний момент у вас відсутні заплановані заняття😐', {
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
      await set('state')('StudentFindHandler');
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
      await set('state')('AdminTeachersOperationHandler');
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
        if (i % 10 === 0 && i != 0){
          const messageWaiting = ctx.reply("Почекайте маленько, підгружаю ще...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await messageWaiting).message_id);
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
          ))
        }
        else{
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
          ))
        }
      }

      await ctx.reply(`Загальна кількість студентів: ${students.length}`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(userObject!.role)
        }
      });
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
      ctx.reply(script.trialLesson.countOfLessonsRequest, {reply_markup: {remove_keyboard: true}})
      await set('state')('CountRespondAndLevelRequest');
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
      ctx.reply(script.errorException.textGettingError.defaultException);
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
      const teachersStudents = (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))?.registered_students?.length
      ?
      (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))?.registered_students : false;
      if (teachersStudents){
        let studentsKeyboard = [];
        for (let i = 0; i < teachersStudents.length; i++){
          studentsKeyboard.push([{ text: (await dbProcess.ShowOneUser(teachersStudents[i]))?.name }]);
        }
        ctx.reply('оберіть студента, з яким плануєте заняття:', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: studentsKeyboard
          }
        })

        await set('state')('IndividualLessonScheduleCheckAvailibilityStudentAndGetDateTime');
      }
      else ctx.reply('на жаль, на данний момент ви не маєте жодного активного студента');
    }
    else if (data.text === 'Перенести ще одне заняття' && userI!.role === 'teacher'){
      ctx.reply(`вкажіть дату заняття, яке ви хочете перенести у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonRescheduleFindLesson');
    }
    else if (data.text === 'Видалити ще одне заняття' && userI!.role === 'teacher'){
      ctx.reply(`вкажіть дату заняття, яке ви хочете видалити у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonDeleteLessonFindLesson');
    }
    else{
      ctx.reply(script.errorException.chooseMenuButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
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
  
      ctx.reply(script.payInvidualLesson.choosePacket(
        showLevel['🔵 Мінімальний: 5 занять']['price'], 
        showLevel['🔴 Економний: 10 занять']['price'],
        showLevel['🟢 Популярний: 20 занять']['price'], 
        showLevel['🟡 Вигідний: 50 занять']['price']),
      {
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
    else if (data.text === '🟡 Вигідний: 50 занять' 
      || data.text === '🟢 Популярний: 20 занять' 
      || data.text === '🔴 Економний: 10 занять' 
      || data.text === '🔵 Мінімальний: 5 занять'){
      const answer = data.text,
      showPacket = packet[user['courseLevel'] as keyof typeof packet][answer];

      await set('choosedPacketColor')(answer);
      await set('choosedPacket')(`${user['courseLevel']}, ${showPacket.name} (${showPacket.countOfLessons} занять) - ${showPacket.price}`);
  
      await ctx.reply(script.payInvidualLesson.statsAboutChoosedPacket(showPacket.name, showPacket.price, showPacket.countOfLessons));
      await ctx.reply(script.payInvidualLesson.payment.require);
      await ctx.reply(script.payInvidualLesson.payment.proofRequest, {reply_markup: {remove_keyboard: true}});
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

      SendNotificationWithMedia(
        notifbot,
        script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
        (await NotificationReg(ctx, notiftoken, unique_file_id)).url,
        'photo'
      );
  
      ctx.reply(script.payInvidualLesson.endWorkIndividual(await name ?? "учень"), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        },
      });

      set('state')('EndRootManager')
    }
    else if (CheckException.FileException(data)){
      const paymentStatus: string = await get('paymentStatus') ?? 'unknown',
        name = get("name") ?? "учень",
        inline = inlineApprovePayment(id, paymentStatus),
        unique_file_id = data.file[0];
  
      SendNotificationWithMedia(
        notifbot,
        script.payInvidualLesson.report(user['name'], user['username'], user['phone_number'], user['choosedPacket'], DateRecord()),
        (await NotificationReg(ctx, notiftoken, unique_file_id)).url,
        'document'
      );
  
      ctx.reply(script.payInvidualLesson.endWorkIndividual(await name ?? "учень"), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
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
      
      SendNotificationWithMedia(
        notifbot,
        script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        (await NotificationReg(ctx, notiftoken, unique_file_id)).url,
        'photo'
      )
  
      await ctx.reply(script.teacherOnHour.payment.paymentSent(await name ?? 'учень'));
      await ctx.reply(script.teacherOnHour.payment.waitForContact, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
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
      
      SendNotificationWithMedia(
        notifbot,
        script.teacherOnHour.report(user['name'], user['username'], user['phone_number'], user['course'], user['lecture'], user['question'], DateRecord()),
        (await NotificationReg(ctx, notiftoken, unique_file_id)).url,
        'document'
      )
  
      await ctx.reply(script.teacherOnHour.payment.paymentSent(await name ?? 'учень'));
      await ctx.reply(script.teacherOnHour.payment.waitForContact, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [
            [
              {
                text: 'Замовити ще одну зустріч'
              }
            ],[
              {
                text: 'В МЕНЮ'
              }
            ]
          ]
        }
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
    if (CheckException.BackRoot(data)){
      ctx.reply(script.registrationLesson.levelLanguageRequest, {reply_markup: {remove_keyboard: true}});
      await set('state')('_LevelRespondAndRequestQuestions');
    }
    else if (CheckException.TextException(data)){
      await set('_addquesttrial')(data.text);
      
      SendNotification(notifbot, script.registrationLesson.report(user['name'], user['username'], user['phone_number'], user['_graphic'], user['_languagelevel'], data.text, DateRecord()));
  
      ctx.reply(script.registrationLesson.end, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
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

      await set('state')('FunctionRoot');
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
              keyboard: keyboards.toMenu()
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

      if (results.length){
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
        ctx.reply('вибачте, але наразі немає актуальних клубів', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: await keyboards.speakingClubMenu(userObject!.role)
          }
        })

        await set('state')('ActionClubRespondAndRootAction');
      }

    }
    else if (data.text === 'ні'){
      ctx.reply(script.speakingClub.defaultDecline, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      })

      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo()
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
          keyboard: keyboards.toMenu()
        },
      });

      await set('state')('EndRootManager');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo()
        }
      });
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
            keyboard: keyboards.toMenu()
          },
        });
        await set('state')('EndRootManager');
      }
      else{
        ctx.reply(script.speakingClub.lessLessons(currentUser!.count), {
          parse_mode: "HTML",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo()
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

          await bot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await bot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptOncePaymentWithoutClub(id, paymentStatus, date);

          await bot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await bot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }

        await ctx.reply(`дякуємо, ${user['name']}🫶 ви успішно оплатили "${user['club-typeclub']}"!, очікуйте на підтвердження`, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.toMenu()
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
          await bot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await bot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 's');

          //packet
          // For Developer
          await bot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await bot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, unique_file_id), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        
        await ctx.reply(`дякуємо, ${user['name']}🫶 ви успішно оплатили "${user['club-typeclub']}"!, очікуйте на підтвердження`, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.toMenu()
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
          await bot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await bot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptOncePaymentWithoutClub(id, paymentStatus, date);

          // For Developer
          await bot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.Once(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          await bot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
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
          bot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          bot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }
        else{
          const inline = inlineAcceptPacketPayment(id, paymentStatus, 's');

          // For Developer
          bot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, data.file[0]), {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })

          bot.telegram.sendDocument(supportChat, data.file[0], {
            parse_mode: "HTML",
            caption: script.speakingClub.report.forAcceptPayment.nonPlus(user['name'], user['username'], user['phone_number'], date),
            ...Markup.inlineKeyboard(inline)
          })
        }

        ctx.reply(`дякуємо, ${user['name']}🫶 ви успішно оплатили "${user['club-typeclub']}"!, очікуйте на підтвердження`, {
          parse_mode: "Markdown",
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.toMenu()
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
            bot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            bot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptClubWithPacketPayment(ctx?.chat?.id ?? -1, user['sc_request_torecord_usertoclub'], paymentStatus, 'p', DateRecord());
  
            // For Developer
            bot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            bot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
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
            bot.telegram.sendPhoto(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            bot.telegram.sendPhoto(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })
          }
          else{
            const inline = inlineAcceptPacketPayment(ctx?.chat?.id ?? -1, paymentStatus, 'plus');

            // For Developer
            bot.telegram.sendDocument(devChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
              parse_mode: "HTML",
              caption: script.speakingClub.report.forAcceptPayment.Plus(user['name'], user['username'], user['phone_number'], data.text, course, date),
              ...Markup.inlineKeyboard(inline)
            })

            bot.telegram.sendDocument(supportChat, await NotificationReg(ctx, notiftoken, user['sc_clubplus_proof']), {
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
            keyboard: keyboards.toMenu()
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
              await bot.telegram.sendMessage(devChat, script.speakingClub.report.notEnoughLessons(
                user['name'], user['username'], user['phone_number'], currentUser!.email !== undefined ? currentUser!.email : "Пошта відсутня", user['club-typeclub']
              ));
                
              await bot.telegram.sendMessage(confirmationChat, script.speakingClub.report.notEnoughLessons(
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
          keyboard: keyboards.toMenu()
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
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject!.role)
        }
      })

      await set('state')('FunctionRoot');
    }
    else if (data.text === 'Клуби'){
      ctx.reply("добренько, і що на цей раз?)", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })

      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (data.text === 'Особові справи'){
      ctx.reply('прекрасно, над ким сьогодні будемо знущатись?)', {
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
          keyboard: keyboards.speakingClubStartAdminMenu()
        }}
      );
    }
  })

  // Admin Panel (start)
  onTextMessage('RespondAdminActionAndRootChoose', async(ctx, user, set, data) => {
    const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply("що цікавить? :)", {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: await keyboards.speakingClubMenu(userObject!.role)
        },
      })

      await set('state')('AdminRootHandler');
    }
    else if (data.text === 'Додати'){
      ctx.reply("тема:");
      await set('state')('ADD_RespondTitleAndGetTeacher');
    }
    else if (data.text === 'Видалити'){
      const results = await dbProcess.ShowAll(),
        users = await dbProcess.ShowAllUsers();
    
      if (results.length){
        for (let i = 0; i < results.length; i++) {
          let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
          for (let j = 0; j < users.length; j++) {
            if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
              userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
            }
          }
            if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
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
      else ctx.reply('наразі немає актуальних розмовних клубів(', {
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
          let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
          for (let j = 0; j < users.length; j++) {
            if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
              userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
            }
          }
            if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
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
      else ctx.reply('наразі немає актуальних розмовних клубів(', {
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
          let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
          for (let j = 0; j < users.length; j++) {
            if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
              userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
            }
          }
          if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
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
      else ctx.reply('наразі немає актуальних розмовних клубів(', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      })
    }
    else if (data.text === 'В МЕНЮ'){
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
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
          keyboard: keyboards.spekingClubAdminPanel()
        },
      })
    }
  });

  //Add Method
  onTextMessage('ADD_RespondTitleAndGetTeacher', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply("добренько, і що на цей раз?)", {
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

      ctx.reply('вчитель:', {
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
      ctx.reply("тема:", {reply_markup: {remove_keyboard: true}});
      await set('state')('ADD_RespondTitleAndGetTeacher');
    }
    else if (CheckException.TextException(data)){
      if (await dbProcess.GetTeacherBool(data.text)){
        const teacher = await dbProcess.GetTeacherNameAndID(data.text, true);
        await set("AP_teacher_name")(teacher[0]);
        await set("AP_teacher_id")(teacher[1]);
  
        ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
        await set('state')('ADD_RespondDateAndGetCheckThis');
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

  onTextMessage('ADD_RespondDateAndGetCheckThis', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const users = await dbProcess.ShowAllUsers();
      let keyboard = [];

      for (let i = 0; i < users.length; i++){
        if (users[i].role === 'teacher'){
          keyboard.push([{ text: users[i].name }]);
        }
      }

      ctx.reply('вчитель:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboard
        }
      });

      await set('state')('ADD_RespondTeacherAndGetDate');
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
        await set('AP_date')(date[1]);
        ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
        await set('state')('ADD_RespondTimeAndGetCount');
      }
    }
    else{
      ctx.reply('це повинна бути двухзначна цифра');
    }
  })

  onTextMessage('ADD_RespondTimeAndGetCount', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
      await set('state')('ADD_RespondDateAndGetCheckThis');
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply(`от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату ${Time()}\n\nповторіть, будь ласка, ще раз :)`)
      }
      else{
        if (isTimeNotInPast(user['AP_date'], time)){
          await set('AP_time')(time);
          ctx.reply('кількість місць:');
          await set('state')('ADD_RespondCountAndGetLink');
        }
        else ctx.reply(`час не піддається магії наших можливостей, але ми можемо зробити ваш час разом з нами неймовірним. приєднуйтесь до нас і дивіться, куди нас заведе часова стрілка! а саме на дату з форматом ${Time()}`);
      }
    }
    else{
      ctx.reply('це повинна бути чотрьохзначна цифра');
    }
  })

  onTextMessage('ADD_RespondCountAndGetLink', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const date = DateProcess((DateProcessToPresentView(user['AP_date']))[1]);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
        await set('state')('ADD_RespondTimeAndGetCount');
      }
    }
    else if (CheckException.TextException(data)){
      if (parseInt(data.text) <= 5 && parseInt(data.text) > 0){
        await set('AP_count')(data.text);
  
        ctx.reply('документація:');
        await set('state')('ADD_RespondDocumentationAndGetLink');
      }
      else{
        ctx.reply('кількість місць не може бути більше 5-ти');
      }
    }
    else{
      ctx.reply(script.errorException.textGettingError.defaultException);
    }
  })

  onDocumentationMessage('ADD_RespondDocumentationAndGetLink', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('кількість місць:');
      await set('state')('ADD_RespondCountAndGetLink');
    }
    else if (CheckException.FileException(data)){
      await set('AP_documentation')(data.file[0]);

      ctx.reply('посилання:');
      await set('state')('ADD_RespondLinkAndCheckRight');
    }
    else{
      ctx.reply('це не схоже на файл типу PDF');
    }
  })

  onTextMessage('ADD_RespondLinkAndCheckRight', async(ctx, user, set, data) => {
    const datePart = new Date(user['AP_date']);
    if (CheckException.BackRoot(data)){
      ctx.reply('документація:');
      await set('state')('ADD_RespondDocumentationAndGetLink');
    }
    else if (CheckException.TextException(data)){
      await set('AP_link')(data.text);

      await ctx.reply(script.speakingClub.report.checkClub(
        user['AP_title'],
        user['AP_teacher_name'],
        `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
        user['AP_time'],
        data.text, 
        parseInt(user['AP_count'])))
      await ctx.reply("все вірно?", {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo()
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
      ctx.reply('посилання:');
      await set('state')('ADD_RespondLinkAndCheckRight');
    }
    else if (data.text === 'так'){
      const toWrite = {
        title: user['AP_title'],
        teacher: user['AP_teacher_name'],
        teacher_id: user['AP_teacher_id'],
        date: user['AP_date'],
        time: user['AP_time'],
        count: parseInt(user['AP_count']),
        link: user['AP_link'],
        documentation: user['AP_documentation']
      },
      currentData = await dbProcess.AddData(toWrite);

      for (let i = 0; i < users.length; i++){
        const inline = inlineEventAnnouncementClub(users[i].id, currentData.insertedId.toString());
        ctx.telegram.sendMessage(users[i].id, script.speakingClub.report.announcementClub(toWrite.title,
          toWrite.teacher, dbProcess.getDateClub(new Date(toWrite.date)), toWrite.time), 
          {reply_markup: {inline_keyboard: inline}}
        )
      }

      ctx.telegram.sendMessage(user['AP_teacher_id'], `Ви були додані на клуб ${toWrite.title}`);
      await ctx.reply('Успішно додано!', {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.spekingClubAdminPanel()
        }
      })
      
      await set('state')('RespondAdminActionAndRootChoose');
    }
    else if (data.text === 'ні'){
      ctx.reply('що саме не так?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.checkCorrectCollectedDataWhileAddingClub()
        }
      })

      await set('state')('CheckCorrectCollectedDataWhileAddingClub');
    }
    else{
      ctx.reply(script.errorException.chooseButtonError, {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo()
        },
      })
    }
  })

  onTextMessage('CheckCorrectCollectedDataWhileAddingClub', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const datePart = new Date(user['AP_date']);
      await ctx.reply(script.speakingClub.report.checkClub(
        user['AP_title'],
        user['AP_teacher_name'],
        `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
        user['AP_time'],
        user['AP_link'], 
        parseInt(user['AP_count'])))
      await ctx.reply("все вірно?", {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo()
        },
      })

      await set('state')('ADD_CheckHandlerAndRoot');
    }
    else{
      switch(data.text){
        case "Тема":
          ctx.reply("тема:");
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Тема');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Викладач":
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
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Викладач');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Дата":
          ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Дата');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Час":
          ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Час');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Місця":
          ctx.reply('кількість місць:');
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Місця');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Посилання":
          ctx.reply('посилання:');
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Посилання');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Документація":
          ctx.reply('документація:');
          await set('CheckCorrectCollectedDataWhileAddingClub_Choose')('Документація');
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandlerDocumentaion');
          break;

        case "Все спочатку":
          ctx.reply("тема:");
          await set('state')('ADD_RespondTitleAndGetTeacher');
          break;
      }
    }
  })

  onTextMessage('CheckCorrectCollectedDataWhileAddingClubHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('що саме не так?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.checkCorrectCollectedDataWhileAddingClub()
        }
      })

      await set('state')('CheckCorrectCollectedDataWhileAddingClub');
    }
    else{
      const datePart = new Date(user['AP_date']);
      switch(user['CheckCorrectCollectedDataWhileAddingClub_Choose']){
        case "Тема":
          await set('AP_title')(data.text);
          await ctx.reply(script.speakingClub.report.checkClub(
            user['AP_title'],
            user['AP_teacher_name'],
            `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
            user['AP_time'],
            user['AP_link'], 
            parseInt(user['AP_count'])))
          await ctx.reply("все вірно?", {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            },
          })
    
          await set('state')('ADD_CheckHandlerAndRoot');
          break;

        case "Викладач":
          if (await dbProcess.GetTeacherBool(data.text)){
            const teacher = await dbProcess.GetTeacherNameAndID(data.text, true);
            await set("AP_teacher_name")(teacher[0]);
            await set("AP_teacher_id")(teacher[1]);
      
            await ctx.reply(script.speakingClub.report.checkClub(
              user['AP_title'],
              teacher[0],
              `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
              user['AP_time'],
              user['AP_link'], 
              parseInt(user['AP_count'])))
            await ctx.reply("все вірно?", {
              parse_mode: "HTML",
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.yesNo()
              },
            })
      
            await set('state')('ADD_CheckHandlerAndRoot');
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
          await set('state')('CheckCorrectCollectedDataWhileAddingClubHandler');
          break;

        case "Дата":
          const date = DateProcess(data.text);

          if (date[0] === 'date_uncorrect'){
            ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
          }
          else if (date[0] === 'format_of_date_uncorrect'){
            ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
          }
          else{
            await set('AP_date')(date[1]);
          }
          await ctx.reply(script.speakingClub.report.checkClub(
            user['AP_title'],
            user['AP_teacher_name'],
            `${UniversalSingleDataProcess(new Date(date[1]), 'day_of_week')}, ${UniversalSingleDataProcess(new Date(date[1]), 'day')} ${UniversalSingleDataProcess(new Date(date[1]), 'month')}, ${UniversalSingleDataProcess(new Date(date[1]), 'year')}`,
            user['AP_time'],
            user['AP_link'], 
            parseInt(user['AP_count'])))
          await ctx.reply("все вірно?", {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            },
          })
    
          await set('state')('ADD_CheckHandlerAndRoot');;
          break;

        case "Час":
          const time = TimeProcess(data.text);

          if (time === 'time_uncorrect'){
            ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
          }
          else if (time === 'format_of_time_uncorrect'){
            ctx.reply(`от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату ${Time()}\n\nповторіть, будь ласка, ще раз :)`)
          }
          else{
            isTimeNotInPast(user['AP_date'], time) ? await set('AP_time')(time) : ctx.reply('ви ввели час, який вже минув, повторіть, будь ласка, ще раз :)');
          }
          
          await ctx.reply(script.speakingClub.report.checkClub(
            user['AP_title'],
            user['AP_teacher_name'],
            `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
            time,
            user['AP_link'], 
            parseInt(user['AP_count'])))
          await ctx.reply("все вірно?", {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            },
          })
    
          await set('state')('ADD_CheckHandlerAndRoot');
          break;

        case "Місця":
          if (parseInt(data.text) <= 5 && parseInt(data.text) > 0){
            await set('AP_count')(data.text);
            await ctx.reply(script.speakingClub.report.checkClub(
              user['AP_title'],
              user['AP_teacher_name'],
              `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
              user['AP_time'],
              user['AP_link'], 
              parseInt(data.text)
            ))
            await ctx.reply("все вірно?", {
              parse_mode: "HTML",
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.yesNo()
              },
            })
      
            await set('state')('ADD_CheckHandlerAndRoot');
          }
          else{
            ctx.reply('кількість місць не може бути більше 5-ти');
          }
          break;

        case "Посилання":
          await set('AP_link')(data.text);
          await ctx.reply(script.speakingClub.report.checkClub(
            user['AP_title'],
            user['AP_teacher_name'],
            `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
            user['AP_time'],
            data.text, 
            parseInt(user['AP_count'])))
          await ctx.reply("все вірно?", {
            parse_mode: "HTML",
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.yesNo()
            },
          })
    
          await set('state')('ADD_CheckHandlerAndRoot');
          break;
      }
    }
  })

  onDocumentationMessage('CheckCorrectCollectedDataWhileAddingClubHandlerDocumentaion', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('що саме не так?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.checkCorrectCollectedDataWhileAddingClub()
        }
      })

      await set('state')('CheckCorrectCollectedDataWhileAddingClub');
    }
    else if (CheckException.FileException(data)){
      await set('AP_documentation')(data.file[0]);

      const datePart = new Date(user['AP_date']);

      await ctx.reply(script.speakingClub.report.checkClub(
        user['AP_title'],
        user['AP_teacher_name'],
        `${UniversalSingleDataProcess(datePart, 'day_of_week')}, ${UniversalSingleDataProcess(datePart, 'day')} ${UniversalSingleDataProcess(datePart, 'month')}, ${UniversalSingleDataProcess(datePart, 'year')}`,
        user['AP_time'],
        data.text, 
        parseInt(user['AP_count'])))
      await ctx.reply("все вірно?", {
        parse_mode: "HTML",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.yesNo()
        },
      })

      await set('state')('ADD_CheckHandlerAndRoot');
    }
    else{
      ctx.reply('це не схоже на файл типу PDF');
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
        let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
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
        let userHaved : string = '\n\n<b>👉Зареєстровані користувачі</b>\n';
        for (let j = 0; j < users.length; j++) {
          if (await dbProcess.HasThisClubUser(users[j].id, results[i]._id)){
            userHaved += `- ${users[j].name} (@${users[j].username}) - ${ConvertToPrice((await db.get(users[j].id)('club-typeclub'))!)} uah.\n📲${users[j].number}\n\n`;
          }
        }
          if (userHaved === '\n\n<b>👉Зареєстровані користувачі</b>\n'){
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
      ctx.reply("що цікавить? :)", {
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
          if (userNumber % 10 === 0 && i != 0){
            const messageWaiting = ctx.reply("Почекайте маленько, підгружаю ще...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await messageWaiting).message_id);
            await ctx.reply(script.speakingClub.report.showUserInClubsToAdmin(
              userNumber,
              results[i].name,
              results[i].id,
              results[i].username,
              results[i].number,
              results[i].count,
              ConvertToPrice(await db.get(results[i].id)('club-typeclub') ?? '') ?? 0
            ), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.personalStudentAdminPanel()
              }
            });
            userNumber++;
          }
          else{
            await ctx.reply(script.speakingClub.report.showUserInClubsToAdmin(
              userNumber,
              results[i].name,
              results[i].id,
              results[i].username,
              results[i].number,
              results[i].count,
              ConvertToPrice(await db.get(results[i].id)('club-typeclub') ?? '') ?? 0
            ), {
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
      await set('state')('AdminSpeakingClubPersonalFindUser');
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
      ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
      await set('state')('StudentFindHandler');
    }
    else if (CheckException.TextException(data) && !isNaN(parseInt(data.text)) && parseInt(data.text) >= 1){
      await set('AP_UserChangeCountLesson_New')(data.text);
      await ctx.reply('✅ число занять змінено!');
      await ctx.reply('оберіть, за яким пакетом будуть додані заняття:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.payPacketLessonsClub()
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
      await ctx.reply(`введіть число занять, яке має бути у користувача  (наразі є: ${User!.count} занять по ${ConvertToPrice(await db.get(User!.id)('club-typeclub') ?? '0')}uah)`);
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
        toWrite ?? 0,
        User!.miro_link ?? "відсутнє",
        data.text
      ), {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.usersOperationInTheClub()
        },
      })

      ctx.telegram.sendMessage(User!.id, script.notification.forStudent.changeCountLessonsOnClub(toWrite ?? 0));

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
          ctx.reply('на жаль, такого користувача не знайдено.');
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
          ctx.reply('на жаль, такого користувача не знайдено.');
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
          ctx.reply('на жаль, такого користувача не знайдено.');
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
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
        }
      })

      await set('state')('FunctionRoot');
    }
    else if (data.text === 'Обрати студента'){
      const teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teacherStudents = teacher!.registered_students;
      if (teacherStudents){
        let students = []
        for(let i = 0; i < teacherStudents.length; i++){
          students.push([{ text: (await dbProcess.ShowOneUser(teacherStudents[i]))!.name }]);
        }

        ctx.reply('оберіть студента, якому ви хочете надіслати завдання', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: students
          }
        })

        await set('state')('TeachersChooseStudentHandler');
      }
      else ctx.reply('на жаль... у вас немає активних студентів :(');
    }
    else if (CheckException.TextException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.text}`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.FileException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.file[0]};${data.file[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}file`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.LocationException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.location[0]};${data.location[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}location`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.PhoneException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.phone_number[0]};${data.phone_number[1]}`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.PhotoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.photo[0]};${data.photo[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}photo`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.StickerException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.stickers}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}sticker`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VideoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video[0]};${data.video[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']}` : ''}video`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.AudioException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.audio}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}audio`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VoiceException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.voice}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}voice`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VideoNoteException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video_circle}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}video_circle`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskTeacherFirstAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else ctx.reply('помилка(\n\nсхоже ви надіслали не підтримуваний тип повідомлення або ж тицьнули не туди')
  })

  onTextMessage('TeachersChooseStudentHandler', async(ctx, user, set, data) => {
    const teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
      teacherStudents = teacher!.registered_students;
    let students = [],
     studentsKeyboard = [];

    for(let i = 0; i < teacherStudents.length; i++){
      students.push((await dbProcess.ShowOneUser(teacherStudents[i]))!.name);
      studentsKeyboard.push([{ text: (await dbProcess.ShowOneUser(teacherStudents[i]))!.name }])
    }
    if (students.includes(data.text)){
      const userID = await dbProcess.GetUserIDByName(data.text);
      if (userID){
        const userObject = await dbProcess.ShowOneUser(userID),
          previousTask = userObject!.detask ? userObject!.detask : false,
          inline = inlineGoToDetaskSolution(userID);
        
        await dbProcess.WriteNewDeTask(
          ctx?.chat?.id ?? -1, 
          userID,
          user['teacher_content_detask'] ? user['teacher_content_detask'].split(',') : false,
          user['teacher_filecontent_detask'] ? user['teacher_filecontent_detask'].split(',') : false,
          user['teacher_typeofcontent_detask'] ? user['teacher_typeofcontent_detask'].split(',') : false
        )

        ctx.reply(`✅ завдання успішно надіслано ${(await dbProcess.ShowOneUser(userID))!.name}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.toMenu()
          }
        });
        ctx.telegram.sendMessage(userID, "егей! у вас нове деЗавдання!", {reply_markup: {inline_keyboard: inline}});
        await set('teacher_content_detask')('');
        await set('teacher_filecontent_detask')('');
        await set('teacher_typeofcontent_detask')('');
        if (previousTask) await dbProcess.DeleteDeTask(userObject!.detask);
        await set('state')('EndRootManager');
      }
      else{
        ctx.reply('на жаль, цього студента не знайдено в базі данних, тому операція неможлива. спробуйте обрати іншого', {
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
    const student = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      await set('student_content_detask')('');
      await set('student_filecontent_detask')('');
      await set('student_typeofcontent_detask')('');
      ctx.reply(script.indivdual.entire(student!.role), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(student!.role)
        }
      })

      await set('state')('IndividualHandler');
    }
    else if (data.text === 'Відправити'){
      const deTask = await dbProcess.GetDeTaskForStudent(student!.detask),
        inline = inlineGoToDetaskCheck(student!.id);

      await dbProcess.WriteAnswerToDeTask(
        deTask!._id, 
        user['student_content_detask'] ? user['student_content_detask'].split(',') : false, 
        user['student_filecontent_detask'] ? user['student_filecontent_detask'].split(',') : false, 
        user['student_typeofcontent_detask'] ? user['student_typeofcontent_detask'].split(',') : false
      );

      await set('student_content_detask')('');
      await set('student_filecontent_detask')('');
      await set('student_typeofcontent_detask')('');

      ctx.telegram.sendMessage(deTask!.idTeacher, `студент ${student!.name} дав відповідь на ваше деЗавдання!`, {reply_markup: {inline_keyboard: inline}});

      ctx.reply('✅ відповіді успішно надіслано!', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      })

      await set('state')('EndRootManager');
    }
    else if (CheckException.TextException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_content_detask')(`${user['student_content_detask'] ? `${user['student_content_detask']},` : ''}${data.text}`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.FileException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.file[0]};${data.file[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}file`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.LocationException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.location[0]};${data.location[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}location`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.PhoneException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_content_detask')(`${user['student_content_detask'] ? `${user['student_content_detask']},` : ''}${data.phone_number[0]};${data.phone_number[1]}`)
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.PhotoException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.photo[0]};${data.photo[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}photo`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.StickerException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.stickers}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}sticker`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VideoException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.video[0]};${data.video[1]}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']}` : ''}video`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.AudioException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.audio}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}audio`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VoiceException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.voice}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}voice`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VideoNoteException(data)){
      if (user['detask_student_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_student_temp_message_continue'])).then().catch((err) => console.log(err));
      await set('student_filecontent_detask')(`${user['student_filecontent_detask'] ? `${user['student_filecontent_detask']},` : ''}${data.video_circle}`);
      await set('student_typeofcontent_detask')(`${user['student_typeofcontent_detask'] ? `${user['student_typeofcontent_detask']},` : ''}video_circle`);
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMoreStudentEdition, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_student_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else{
      ctx.reply('помилка(\n\nсхоже ви надіслали не підтримуваний тип повідомлення або ж тицьнули не туди')
    }
  })

  onTextMessage('TeacherDeTaskHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
        }
      })

      await set('state')('FunctionRoot');
    }
    else{
      const teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teachersStudents = teacher!.registered_students,
        teacherTasks = teacher!.set_detasks;
      let keyboard = [];

      if (teachersStudents.length){
        switch(data.text){
          case "Дати деЗавдання":
            ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню');
            await set('detask_teacher_temp_message_continue')('');
            await set('state')('TeachersSetTasksHandler')
            break;
  
          case "Перевірити деЗавдання":
            for (let i = 0; i < teachersStudents.length; i++){
              const userObject = await dbProcess.ShowOneUser(teachersStudents[i]),
                task = await dbProcess.GetStudentAnswerForDeTask(teachersStudents[i]);
  
              if (task[0] !== 'no_answer_available' && task[0] !== 'no_task_available' && userObject?.detask){
                for (let j = 0; j < teacherTasks.length; j++){
                  if (teacherTasks[j].toString() === userObject!.detask.toString()){
                    keyboard.push([{ text: (await dbProcess.ShowOneUser(teachersStudents[i]))!.name }])
                  }
                }
              }
            }
  
            if (!keyboard.length){
              ctx.reply('на жаль... ви не маєте студентів, яким давали завдання або вони не надіслали відповідь', {
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
                keyboard: keyboards.deTaskMenu()
              }
            })
        }
      }
      else{
        ctx.reply('на жаль... ви не маєте студентів :(', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.toMenu()
          }
        })

        await set('state')('EndRootManager');
      }
    }
  })

  onTextMessage('GetStudentForTeacherDeTaskHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      if (userI!.set_detasks){
        ctx.reply('оберіть одну із кнопок нижче:', {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.deTaskMenu()
          }
        })
        await set('state')('TeacherDeTaskHandler');
      }
      else{
        ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню');
        await set('detask_teacher_temp_message_continue')('');
        await set('state')('TeachersSetTasksHandler')
      }
    }
    else if (CheckException.TextException(data)){
      const studentID = await dbProcess.GetUserIDByName(data.text),
        student = await dbProcess.ShowOneUser(studentID),
        teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teacherTasks = teacher ? teacher.set_detasks : false,
        teacherRegisterStudents = teacher ? teacher.registered_students : false;
      let teacherHaveThisTask = false,
        errorKeyboard = [], regularCheck = [];

      for (let i = 0; i < teacherRegisterStudents.length; i++){
        errorKeyboard.push([{ text: (await dbProcess.ShowOneUser(teacherRegisterStudents[i]))!.name }]);
        regularCheck.push((await dbProcess.ShowOneUser(teacherRegisterStudents[i]))!.name);
      }

      if (teacherTasks?.length){
        for (let i = 0; i < teacherTasks.length; i++){
          if (teacherTasks[i].toString() === student?.detask?.toString()){
            teacherHaveThisTask = true;
            break;
          }
        }
      }

      if (student && teacherTasks && regularCheck.includes(data.text)){
        const task = await dbProcess.GetDeTaskForStudent(student.detask),
          answer = await dbProcess.GetStudentAnswerForDeTask(studentID);
        await ctx.reply(`супер!\n👉 завдання, яке було дано студентові:`);
        
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

                case "sticker":
                  await ctx.telegram.sendSticker(idAddress, files[i]);
                  break;

                case "video":
                  const video = files[i].split(';');
                  await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
                  break;

                default:
                  ctx.reply('нам прикро, але надісланий вами тип файлу наразі не підтримується, вибачте за труднощі...');

              }
            }
          }
        }

        await set('tmp_userid_detask')(studentID);

        if (student.detask){
          if (teacherHaveThisTask){
            console.log(answer[0])
            if (answer[0] !== 'no_answer_available'){
              await ctx.reply('✅ виконане завдання:');
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

                      case "sticker":
                        await ctx.telegram.sendSticker(idAddress, files[i]);
                        break;

                      case "video":
                        const video = files[i].split(';');
                        await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
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
              ctx.reply('на жаль, студент ще не дав відповіді на ваше завдання :(', {
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
      ctx.reply('оберіть одну із кнопок нижче:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskMenu()
        }
      })
      await set('state')('TeacherDeTaskHandler');
    }
    else{
      switch(data.text){
        case "Дати інше деЗавдання":
          ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню')
          await set('detask_tmp_endkeyboard')('');
          await set('detask_teacher_temp_message_continue')('');
          await set('state')('AnotherTeachersSetTasksHandler');
          break;

        case "Дати деЗавдання":
          ctx.reply('надішліть сюди усі матеріали, якщо їх декілька, надішліть по одному повідомленню')
          await set('detask_tmp_endkeyboard')('');
          await set('detask_teacher_temp_message_continue')('');
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
      await set('teacher_content_detask')('');
      await set('teacher_filecontent_detask')('');
      await set('teacher_typeofcontent_detask')('');
      await set('tmp_userid_detask')('');
      await set('detask_teacher_temp_message_continue')('');
      ctx.reply('оберіть одну із кнопок нижче:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskMenu()
        }
      })
      await set('state')('TeacherDeTaskHandler');
    }
    else if (data.text === 'Відправити'){
      const userID = parseInt(user['tmp_userid_detask']),
        userObject = await dbProcess.ShowOneUser(userID);

      if (userObject){
        const previousTask = userObject!.detask ? userObject!.detask : false,
          inline = inlineGoToDetaskSolution(userID);

          await dbProcess.WriteNewDeTask(
            ctx?.chat?.id ?? -1, 
            userID, 
            user['teacher_content_detask'] ? user['teacher_content_detask'].split(',') : false, 
            user['teacher_filecontent_detask'] ? user['teacher_filecontent_detask'].split(',') : false,
            user['teacher_typeofcontent_detask'] ? user['teacher_typeofcontent_detask'].split(',') : false
          )

        ctx.reply(`✅ завдання успішно надіслано ${userObject.name}`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.toMenu()
          }
        });
        ctx.telegram.sendMessage(userID, "егей! у вас нове деЗавдання!", { reply_markup: { inline_keyboard: inline } });
        if (previousTask) await dbProcess.DeleteDeTask(userObject!.detask);
      }
      else ctx.reply('на жаль... виникла помилка, студент якого ви обрали на початку не знайдено в базі даних :(\n\nповторіть, будь ласка, знову', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      })

      await set('teacher_content_detask')('');
      await set('teacher_filecontent_detask')('');
      await set('teacher_typeofcontent_detask')('');
      await set('tmp_userid_detask')('');
      await set('detask_teacher_temp_message_continue')('');
      await set('state')('EndRootManager');
    }
    else if (CheckException.TextException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.text}`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.FileException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.file[0]};${data.file[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}file`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.LocationException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.location[0]};${data.location[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}location`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.PhoneException(data)){
      await set('teacher_content_detask')(`${user['teacher_content_detask'] ? `${user['teacher_content_detask']},` : ''}${data.phone_number[0]};${data.phone_number[1]}`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.PhotoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.photo[0]};${data.photo[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}photo`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.StickerException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.stickers}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}sticker`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VideoException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video[0]};${data.video[1]}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']}` : ''}video`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.AudioException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.audio}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}audio`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VoiceException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.voice}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}voice`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else if (CheckException.VideoNoteException(data)){
      await set('teacher_filecontent_detask')(`${user['teacher_filecontent_detask'] ? `${user['teacher_filecontent_detask']},` : ''}${data.video_circle}`);
      await set('teacher_typeofcontent_detask')(`${user['teacher_typeofcontent_detask'] ? `${user['teacher_typeofcontent_detask']},` : ''}video_circle`);
      if (user['detask_teacher_temp_message_continue']) await ctx.deleteMessage(parseInt(user['detask_teacher_temp_message_continue'])).then().catch((err) => console.log(err));
      const temp_message_continue = await ctx.reply(script.deTask.finalOrMore, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.deTaskStudentFinishAttempt()
        }
      })
      await set('detask_teacher_temp_message_continue')(`${temp_message_continue.message_id}`);
    }
    else ctx.reply('помилка(\n\nсхоже ви надіслали не підтримуваний тип повідомлення або ж тицьнули не туди')
  })

  onTextMessage('StudentFindHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.indivdual.entire(userI!.role), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(userI!.role)
        }
      })

      await set('state')('IndividualHandler');
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);
      if (User){
        if (User.role !== 'student') ctx.reply('<b>УВАГА!</b> ЦЕЙ КОРИСТУВАЧ <b>НЕ</b> Є <b>СТУДЕНТОМ</b>')
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
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualUserChangehandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
      await set('state')('StudentFindHandler');
    }
    else{
      const User = await dbProcess.ShowOneUser(parseInt(user['user_to_change_individual_id']));
      switch(data.text){
        case "Редагувати кількість занять":
          ctx.reply(`введіть кількість хвилин, яка має бути у студента (наразі є: ${User!.individual_count / 60 ?? 0} занять (${User!.individual_count ?? 0} хв))`);
          await set('admin_parametr_to_change_individual')('individual_count');
          await set('state')('IndividualChangeUserDataHandler');
          break;

        case "Редагувати лінк":
          ctx.reply('вкажіть новий лінк на дошку студента');
          await set('admin_parametr_to_change_individual')('miro_link');
          await set('state')('IndividualChangeUserDataHandler');
          break;
        
        case "Перевести до іншого викладача":
          const AllUsers = await dbProcess.ShowAllUsers();
          let keyboardTeacher = []
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].role === 'teacher' && AllUsers[i].id !== User?.teacher){
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
      const User = await dbProcess.FindUser(user['user_to_change_individual_id']);
      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);
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

            if (teacher){
              ctx.telegram.sendMessage(teacher?.id, script.notification.forTeachers.changeCountStudentIndividualLesson(
                User.name,
                User.username,
                User.number,
                User.miro_link ?? "якогось дідька відсутнє",
                User.individual_count ?? "якогось дідька 0"
              ));
            }

            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.changeCountStudentIndividualLesson(
              teacher!.name,
              teacher!.username,
              teacher!.number,
              User.miro_link ?? "якогось дідька відсутнє",
              User.individual_count ?? "якогось дідька 0"
            ))

            await ctx.reply('✅ число занять змінено!');
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
          else{
            ctx.reply('введіть будь ласка цифру рівну або більше 0-ля');
          }
          break;

        default:
          const oldTeacher = (await dbProcess.ShowOneUser(parseInt(user['user_to_change_individual_id'])))?.teacher;
          const returnable_result = await dbProcess.IndividualChangeUserData(
            parseInt(user['user_to_change_individual_id']),
            user['admin_parametr_to_change_individual'],
            data.text
          );
          const User = await dbProcess.FindUser(user['user_to_change_individual_id']),
            teacher = await dbProcess.ShowOneUser(User.teacher);
          const probably_deleted = ctx.reply(script.studentFind.generalFind(
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

            ctx.telegram.sendMessage(oldTeacher, script.notification.forTeachers.forOldTeacher(
              User!.name,
              User!.username,
              User!.number
            ))

            await ctx.reply('студента переведено!');
            ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await probably_deleted).message_id); // probably_deleted
            await ctx.reply(script.studentFind.generalFind(
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
          }
          else if (user['admin_parametr_to_change_individual'] === 'delete_student'){
            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.deleteStudent(returnable_result!.name));
            ctx.telegram.sendMessage(returnable_result!.id, script.notification.forTeachers.deleteStudent(
              User!.name,
              User!.username,
              User!.number
            ))
            ctx.reply(`✅ студента ${User.name} було успішно видалено від викладача ${returnable_result!.name}`)
          }
          else{
            ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.miroLinkChanged(
              User!.name,
              User!.username,
              User!.number,
              User!.miro_link,
              User!.individual_count
            ));
            
            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.miroLinkChanged(
              teacher!.name,
              teacher!.username,
              teacher!.number,
              User!.miro_link,
              User!.individual_count
            ));

            await ctx.reply('лінк змінено!');
            ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, (await probably_deleted).message_id); // probably_deleted
            await ctx.reply(script.studentFind.generalFind(
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
          }
          await set('state')('IndividualUserChangehandler');
          break;
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('DeleteStudentFromTeacherIndividualHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const User = await dbProcess.FindUser(user['user_to_change_individual_id']);
      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);
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
              keyboard: keyboards.toMenu()
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
            teacher?.name ?? "Відсутній",
            User!.individual_count ?? 0,
            User!.miro_link ?? "Відсутня"
            ), {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.toMenu()
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
      const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.indivdual.entire(userI!.role), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(userI!.role)
        }
      })

      await set('state')('IndividualHandler');
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
      await set('state')('AdminTeachersOperationHandler');
    }
    else{
      const teacher = await dbProcess.ShowOneUser(parseInt(user['admin_teachersoperation_idone']));
      switch(data.text){
        case "Переглянути розклад викладача":
          const trialLessons = await dbProcess.GetUserTrialLessons(teacher!.id);
          if (teacher!.set_individual_lessons?.length || trialLessons.length){
            const lessons = SortSchedule([
              ...(teacher?.set_individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(teacher?.set_individual_lessons) : []),
              ...(trialLessons?.length ? trialLessons : [])
            ].filter((lesson: any) => Object.keys(lesson).length));
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
              let message = `📋 <b>${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}</b>\n\n`;
      
              for (let j = 0; j < lessonProcess[key].length; j++) {
                const lesson = lessonProcess[key][j],
                  student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
                message += script.indivdual.rescheduleForTeacher(
                  j + 1,
                  lesson.time,
                  lesson.duration ?? 60,
                  student? student.name : "Не вдалося знайти ім'я в БД :(",
                  student? student.username : "unknown",
                  student? student.number : "не вдалося знайти номеру :(",
                  lesson.type
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
          else ctx.reply('на данний момент у викладача відсутні заняття', {
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
              teachersStudentsObjects.push(await dbProcess.ShowOneUser(teacherStudents[i]));
            }
  
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
      const teacher = await dbProcess.ShowOneUser(parseInt(user['admin_teachersoperation_idone']));
      ctx.reply(script.studentFind.showTeacher(
        teacher!.name,
        teacher!.id,
        teacher!.role,
        teacher!.username,
        teacher!.number,
        teacher?.registered_students?.length ?? 0
      ), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.ourTeachersMenu()
        }
      })

      await set('state')('AdminOurTeachersHandler');
    }
    else{
      const teacher = await dbProcess.ShowOneUser(parseInt(user['admin_teachersoperation_idone']));
      switch(data.text){
        case "Так":
          await dbProcess.DeleteTeacherFromPost(parseInt(user['admin_teachersoperation_idone']))
          ?
          ctx.reply(`✅ викладача ${teacher!.name} було успішно видалено`, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
            }
          })
          :
          ctx.reply('✅ помилка при видаленні викладача', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
            }
          })
          await set('state')('EndRootManager')
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
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
        }
      })

      await set('state')('FunctionRoot');
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
      ctx.reply('оберіть одну із кнопок нижче:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.usersMenu()
        }
      })

      await set('state')('AdminUsersOperationHandler');
    }
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);

        await set('admin_tmp_usersoperation_user_role')(User.role);
        await set('admin_tmp_usersoperation_user_id')(User.id);

        console.warn(User);

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
      ctx.reply('оберіть одну із кнопок нижче:', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.usersMenu()
        }
      })

      await set('state')('AdminUsersOperationHandler');
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
            if (users[i].role === 'teacher' && !users[i].registered_students?.includes(actualStudent) && !users[i].trial_students?.includes(actualStudent)){
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
          await set('state')('AdminAddUserToTeacher_RespondTeacher');
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
      const User = await dbProcess.FindUser(user['admin_tmp_usersoperation_user_id']);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);

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
              keyboard: keyboards.toMenu()
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
      const User = await dbProcess.FindUser(user['admin_tmp_usersoperation_user_id']);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);

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
              keyboard: keyboards.usersOperations(updatedUser!.role)
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
      const User = await dbProcess.FindUser(user['admin_tmp_usersoperation_user_id']);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);

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
    }
    else if (data.text.startsWith("https://miro")){
      const student = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id'])),
        teacher = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_teacher_id'])),
        inline = inlineScheduleTrialLessonTeacher(teacher!.id, student!.id);

      ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.addStudentForTeacherForTrialLesson(
        student!.name,
        student!.username,
        student!.number,
        data.text
      ), { ...Markup.inlineKeyboard(inline)});

      await dbProcess.UsersOperationWithGuest(student!.id, teacher!.id, data.text, 0, 'trial_teacher');
      ctx.reply(script.operationWithGuest(student!.name, teacher!.name, data.text, 0, true), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
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
      const User = await dbProcess.FindUser(user['admin_tmp_usersoperation_user_id']);

      if (User){
        const teacher = await dbProcess.ShowOneUser(User.teacher);

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
      await set('state')('AdminAddUserToTeacher_RespondTeacher');
    }
    else if (data.text.startsWith("https://miro")){
      await set('admin_tmp_usersoperation_miro_link')(data.text);
      ctx.reply('впишіть кількість хвилин на балансі студента');
      await set('state')('AdminAddUserToTeacher_RespondCount');
    }
    else ctx.reply('це не схоже на лінк для міро...');
  })

  onTextMessage('AdminAddUserToTeacher_RespondCount', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('додайте лінк на дошку студента');
        await set('state')('AdminAddUserToTeacher_RespondMiro');
    }
    else if (!isNaN(parseInt(data.text)) && parseInt(data.text) >= 0){
      const student = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_user_id'])),
        teacher = await dbProcess.ShowOneUser(parseInt(user['admin_tmp_usersoperation_teacher_id']));

      ctx.telegram.sendMessage(teacher!.id, script.notification.forTeachers.addStudentForTeacher(
        student!.name,
        student!.username,
        student!.number,
        user['admin_tmp_usersoperation_miro_link'],
        parseInt(data.text)
      ))

      ctx.telegram.sendMessage(student!.id, script.notification.forStudent.addStudentForTeacher(
        student!.name,
        teacher!.name,
        teacher!.username,
        teacher!.number,
        user['admin_tmp_usersoperation_miro_link'],
        parseInt(data.text)
      ))
      await dbProcess.UsersOperationWithGuest(student!.id, teacher!.id, user['admin_tmp_usersoperation_miro_link'], parseInt(data.text), 'just_teacher');
      ctx.reply(script.operationWithGuest(student!.name, teacher!.name, user['admin_tmp_usersoperation_miro_link'], parseInt(data.text)), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      });
      await set('state')('EndRootManager');
    }
    else ctx.reply('значення не може бути менше 0-ля');
  })

  onTextMessage('AdminSpeakingClubPersonalFindUser', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('прекрасно, над ким сьогодні будемо знущатись?)', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.personalStudentAdminPanel()
        }
      })

      await set('state')('PeronalStudentHandler');
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
          await db.get(User.id)('club-typeclub') ?? false
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
      ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
      await set('state')('AdminSpeakingClubPersonalFindUser');
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
              keyboard: keyboards.payPacketLessonsClub()
            }
          })
          await set('state')('AdminChangeUserActivePacketHandler')
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
      const User = await dbProcess.FindUser(user['admin_speakingclub_personal_find_user']);

      if (User){
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
          await db.get(User.id)('club-typeclub') ?? false
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
    else if (data.text === 'Разове заняття (300uah)' || data.text === 'Пакет занять (280uah)'){
      const User = await dbProcess.ShowOneUser(parseInt(user['admin_speakingclub_personal_find_user'])),
        teacher = await dbProcess.ShowOneUser(User!.teacher);
      await db.set(User!.id)('club-typeclub')(data.text);
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

  onTextMessage('AdminNotificationRepondText', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
      ctx.reply(script.entire.chooseFunction, {
        parse_mode: "Markdown",
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.mainMenu(ctx?.chat?.id ?? -1, userObject && userObject!.role !== undefined && userObject!.role !== null ? userObject!.role : 'guest')
        }
      })

      await set('state')('FunctionRoot');
    }
    else if (CheckException.TextException(data)){
      await set('admin_notification_type_of_files')('text');
      await set('admin_notification_text')(data.text);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.PhotoException(data)){
      await set('admin_notification_type_of_files')('photo');
      await set('admin_notification_capture_text')(data.photo[1]);
      await set('admin_notification_media')(data.photo[0]);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.FileException(data)){
      await set('admin_notification_type_of_files')('file');
      await set('admin_notification_capture_text')(data.file[1]);
      await set('admin_notification_media')(data.file[0]);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.VideoNoteException(data)){
      await set('admin_notification_type_of_files')('video_circle');
      await set('admin_notification_media')(data.video_circle);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.VoiceException(data)){
      await set('admin_notification_type_of_files')('voice');
      await set('admin_notification_media')(data.voice);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.VideoException(data)){
      await set('admin_notification_type_of_files')('video');
      await set('admin_notification_capture_text')(data.video[1]);
      await set('admin_notification_media')(data.video[0]);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.AudioException(data)){
      await set('admin_notification_type_of_files')('audio');
      await set('admin_notification_media')(data.audio);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.StickerException(data)){
      await set('admin_notification_type_of_files')('sticker');
      await set('admin_notification_media')(data.stickers);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.LocationException(data)){
      await set('admin_notification_type_of_files')('location');
      await set('admin_notification_media')(`${data.location[0]},${data.location[1]}`);
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
    }
    else if (CheckException.PhoneException(data)){
      await set('admin_notification_type_of_files')('phone');
      await set('admin_notification_media')(`${data.phone_number[0]},${data.phone_number[1]}`);
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
      ctx.reply('напишіть текст сповіщення, який ви хочете віправити');
      await set('state')('AdminNotificationRepondText');
    }
    else{
      switch(data.text){
        case "Усім користувачам":
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].id !== ctx?.chat?.id ?? -1){
              try{
                switch(user['admin_notification_type_of_files']){
                  case "text":
                    ctx.telegram.sendMessage(AllUsers[i].id, user['admin_notification_text']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "photo":
                    ctx.telegram.sendPhoto(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "file":
                    ctx.telegram.sendDocument(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "voice":
                    ctx.telegram.sendVoice(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "video":
                    ctx.telegram.sendVideo(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "location":
                    ctx.telegram.sendLocation(AllUsers[i].id, parseInt(user['admin_notification_media'].split(',')[0]), parseInt(user['admin_notification_media'].split(',')[1])).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "phone":
                    ctx.telegram.sendContact(AllUsers[i].id, user['admin_notification_media'].split(',')[0], user['admin_notification_media'].split(',')[1]).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "sticker":
                    ctx.telegram.sendSticker(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "audio":
                    ctx.telegram.sendAudio(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  default:
                    ctx.reply('невідомий тип файлу, спробуйте ще раз, будь ласка');
                    break;
  
                }
              }
              catch(error){
                console.error(error);
              }
            }
          }
          ctx.reply('віправлено ✅', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
            }
          })
          await set('state')('EndRootManager')
          break;

        case "Лише викладачам":
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].role === 'teacher'){
              try{
                switch(user['admin_notification_type_of_files']){
                  case "text":
                    ctx.telegram.sendMessage(AllUsers[i].id, user['admin_notification_text']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "photo":
                    ctx.telegram.sendPhoto(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "file":
                    ctx.telegram.sendDocument(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "voice":
                    ctx.telegram.sendVoice(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "video":
                    ctx.telegram.sendVideo(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "location":
                    ctx.telegram.sendLocation(AllUsers[i].id, parseInt(user['admin_notification_media'].split(',')[0]), parseInt(user['admin_notification_media'].split(',')[1])).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "phone":
                    ctx.telegram.sendContact(AllUsers[i].id, user['admin_notification_media'].split(',')[0], user['admin_notification_media'].split(',')[1]).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "sticker":
                    ctx.telegram.sendSticker(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "audio":
                    ctx.telegram.sendAudio(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  default:
                    ctx.reply('невідомий тип файлу, спробуйте ще раз, будь ласка');
                    break;
  
                }
              } catch (err){
                console.log("Error to send message to user " +AllUsers[i].name +":"+err);
                ctx.reply(`не вдалося надіслати сповіщення користувачу ${AllUsers[i].name} :( Скоріш за все він нас заблокував)`)
              }
            }
          }
          ctx.reply('віправлено ✅', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
            }
          })
          await set('state')('EndRootManager')
          break;

        case "Лише студентам":
          for (let i = 0; i < AllUsers.length; i++){
            if (AllUsers[i].role === 'student'){
              try{
                switch(user['admin_notification_type_of_files']){
                  case "text":
                    ctx.telegram.sendMessage(AllUsers[i].id, user['admin_notification_text']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "photo":
                    ctx.telegram.sendPhoto(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "file":
                    ctx.telegram.sendDocument(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "voice":
                    ctx.telegram.sendVoice(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "video":
                    ctx.telegram.sendVideo(AllUsers[i].id, user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "location":
                    ctx.telegram.sendLocation(AllUsers[i].id, parseInt(user['admin_notification_media'].split(',')[0]), parseInt(user['admin_notification_media'].split(',')[1])).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "phone":
                    ctx.telegram.sendContact(AllUsers[i].id, user['admin_notification_media'].split(',')[0], user['admin_notification_media'].split(',')[1]).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "sticker":
                    ctx.telegram.sendSticker(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  case "audio":
                    ctx.telegram.sendAudio(AllUsers[i].id, user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                    await set('admin_notification_type_of_files')('');
                    await set('admin_notification_capture_text')('');
                    await set('admin_notification_text')('');
                    await set('admin_notification_media')('');
                    break;
  
                  default:
                    ctx.reply('невідомий тип файлу, спробуйте ще раз, будь ласка');
                    break;
  
                }
              } catch (err){
                console.log("Error to send message to user " +AllUsers[i].name +":"+err);
                ctx.reply(`не вдалося надіслати сповіщення користувачу ${AllUsers[i].name} :( Скоріш за все він нас заблокував)`)
              }
            }
          }
          ctx.reply('віправлено ✅', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
            }
          })
          await set('state')('EndRootManager')
          break;

        case "Відправити конкретному юзеру":
          ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
          await set('state')('AdminSendNotificationSpecificUser');
          break;

        default:
          ctx.reply(script.errorException.chooseButtonError, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.notificationSenders()
            }
          })
          break;
      }
    }
  })

  onTextMessage('AdminSendNotificationSpecificUser', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('кому ви хочете віправити це сповіщення?', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.notificationSenders()
        }
      })

      await set('state')('AdminNotificationHandler');
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
          User.registered_students?.length ?? 0 
        ), {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.yesNo()
          }
        })
        await set('state')('AdminSendNotificationSpecificUserHandler');
      }
      else ctx.reply('на жаль, такого користувача не знайдено, спробуйте ще раз, будь ласка')
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('AdminSendNotificationSpecificUserHandler', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('введіть його ID / повне ім’я / номер телефону / нік в телеграмі');
      await set('state')('AdminSendNotificationSpecificUser');
    }
    else{
      switch(data.text){
        case "так":
          try{
            switch(user['admin_notification_type_of_files']){
              case "text":
                ctx.telegram.sendMessage(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_text']).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "photo":
                ctx.telegram.sendPhoto(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "file":
                ctx.telegram.sendDocument(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "voice":
                ctx.telegram.sendVoice(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "video":
                ctx.telegram.sendVideo(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media'], {caption: user['admin_notification_capture_text']}).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "location":
                ctx.telegram.sendLocation(parseInt(user['admin_specific_user_send_notification_id']), parseInt(user['admin_notification_media'].split(',')[0]), parseInt(user['admin_notification_media'].split(',')[1])).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "phone":
                ctx.telegram.sendContact(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media'].split(',')[0], user['admin_notification_media'].split(',')[1]).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "sticker":
                ctx.telegram.sendSticker(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              case "audio":
                ctx.telegram.sendAudio(parseInt(user['admin_specific_user_send_notification_id']), user['admin_notification_media']).then(() => console.log('')).catch((err) => console.log(err));
                await set('admin_notification_type_of_files')('');
                await set('admin_notification_capture_text')('');
                await set('admin_notification_text')('');
                await set('admin_notification_media')('');
                break;

              default:
                ctx.reply('невідомий тип файлу, спробуйте ще раз, будь ласка');
                break;

            }
          } catch (err){
            const User = await dbProcess.ShowOneUser(parseInt(user['admin_specific_user_send_notification_id']))
            console.log("Error to send message to user " +User?.name ?? '??' +":"+err);
            ctx.reply(`не вдалося надіслати сповіщення користувачу ${User?.name ?? '(імені нема, можливо навіть в бд його нема)'} :( Скоріш за все він нас заблокував)`)
          }
          ctx.reply('віправлено ✅', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
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
    const userI = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1);
    if (CheckException.BackRoot(data)){
      ctx.reply(script.indivdual.entire(userI!.role), {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.indiviualMenu(userI!.role)
        }
      })

      await set('state')('IndividualHandler');
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
              studentsKeyboard.push([{ text: (await dbProcess.ShowOneUser(teachersStudents[i]))!.name }]);
            }
            ctx.reply('оберіть студента, з яким плануєте заняття:', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: studentsKeyboard
              }
            })

            await set('state')('IndividualLessonScheduleCheckAvailibilityStudentAndGetDateTime')
          }
          else ctx.reply('на жаль, на данний момент ви не маєте жодного активного студента');
          break;

        case "Перенести заняття":
          ctx.reply(`вкажіть дату заняття, яке ви хочете перенести у форматі: ${DateRecord()}`);
          await set('state')('IndividualLessonRescheduleFindLesson');
          break;

        case "Видалити заняття":
          ctx.reply(`вкажіть дату заняття, яке ви хочете видалити у форматі: ${DateRecord()}`);
          await set('state')('IndividualLessonDeleteLessonFindLesson');
          break;

        case "Запланувати пробне заняття":
          let keyboardTrials = [];
          const trialStudents = (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))!.trial_students,
            allLessons = await dbProcess.ShowAllInvdividualLessons();

          if (trialStudents?.length){
            for (let i = 0; i < trialStudents.length; i++){
              let alreadyHaveLesson = false;
              for (let j = 0; j < allLessons.length; j++){
                if (allLessons[j].type === 'trial' && allLessons[j].idStudent === trialStudents[i]){
                  alreadyHaveLesson = true;
                  break;
                }
              }
              if (!alreadyHaveLesson) keyboardTrials.push([{ text: (await dbProcess.ShowOneUser(trialStudents[i]))!.name } ]);
            }

            if (keyboardTrials.length){
              ctx.reply('оберіть студента, з яким потрібно запланувати пробне заняття:', {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: keyboardTrials
                }
              })
    
              await set('state')('IndividualLessonsTrialLessonRespondStudent');
            }
            else ctx.reply('на данний момент ви не маєте студентів для запланування пробних занять', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.myScheduleTeacher()
              }
            })
          }
          else ctx.reply('на данний момент ви не маєте студентів для проведення пробних занять', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.myScheduleTeacher()
            }
          });
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
      students.push([{ text: (await dbProcess.ShowOneUser(teacherStudents[i])!)!.name }]);
    }
    if (CheckException.BackRoot(data)){
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
      if (userObject!.set_individual_lessons || trialLessons.length){
        const lessons = SortSchedule([
          ...(userObject?.set_individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(userObject?.set_individual_lessons) : []),
          ...(trialLessons?.length ? trialLessons : [])
        ].filter((lesson: any) => Object.keys(lesson).length));
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
          let message = `📋 ${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}\n\n`;
  
          for (let j = 0; j < lessonProcess[key].length; j++) {
            const lesson = lessonProcess[key][j],
              student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
            message += script.indivdual.rescheduleForTeacher(
              j + 1,
              lesson.time,
              lesson.duration,
              student? student.name : "Не вдалося знайти ім'я в БД :(",
              student? student.username : "unknown",
              student? student.number : "не вдалося знайти номеру :(",
              lesson.type
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
    else if (CheckException.TextException(data)){
      const User = await dbProcess.FindUser(data.text);
      if (teacherStudents.includes(User?.id)){
        if (User){
          await ctx.reply(script.studentFind.checkIndividualCountShowStudent(
            User.name,
            User.username,
            User.number,
            User.individual_count ?? 0
          ))
  
          if (User.individual_count > 0){
            await set('teacher_individual_lesson_schedule_student_id')(User.id);
            await ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
            await set('state')('IndividualLessonScheduleRespondDateAndCheckThis');
          }
          else await ctx.reply(`не можна запланувати заняття, у ${User.name} немає проплачених занять - повідомте в підтримку та оберіть іншого студента:`, {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: students
            }
          })
        }
        else ctx.reply(`на жаль, такого користувача як ${data.text} не знайдено в базі данних`);
      }
      else ctx.reply(`на жаль, такого користувача як ${data.text} не знайдено в базі данних`);
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
      else ctx.reply('на жаль, на данний момент ви не маєте жодного активного студента');
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
        if (isDateNoInPast(date[1])){
          await set('teacher_date_individual_lesson_set')(date[1]);
          ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
          await set('state')('IndividualLessonScheduleCheckTimeAndGetDuration');
        }
        else ctx.reply(`на жаль... ми не можемо планувати заняття в минуле :(\n\nвиберіть, будь ласка, щось більш реальне в форматі: ${DateRecord()}`);
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonScheduleCheckTimeAndGetDuration', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const teacherStudents = (await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1))?.registered_students;
      let students = [];
      
      for (let i = 0; i < teacherStudents.length; i++){
        students.push([{ text: teacherStudents[i] }]);
      }
      const User = await dbProcess.FindUser(user['teacher_individual_lesson_schedule_student_id']);
      if (User){
        await ctx.reply(script.studentFind.checkIndividualCountShowStudent(
          User.name,
          User.username,
          User.number,
          User.individual_count ?? 0
        ))

        if (User.individual_count > 0){
          await ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
          await set('state')('IndividualLessonScheduleRespondDateAndCheckThis');
        }
        else await ctx.reply(`не можна запланувати заняття, у ${User.name} немає проплачених занять - повідомте в підтримку та оберіть іншого студента:`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: students
          }
        })
      }
      else ctx.reply(`на жаль, такого користувача як ${data.text} не знайдено в базі данних`);
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply(`от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату ${Time()}\n\nповторіть, будь ласка, ще раз :)`)
      }
      else{
        if (isTimeNotInPast(user['teacher_date_individual_lesson_set'], time)){
          const allLessons = await dbProcess.ShowAllInvdividualLessons(),
            free = checkAvailabilityForLesson(time, user['teacher_date_individual_lesson_set'], allLessons, ctx?.chat?.id ?? -1, 'part_1');
  
          if (free === 'free'){
            await set('teacher_time_individual_lesson_set')(time);
            ctx.reply('вкажіть, скільки триватиме заняття:', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.durationChoose()
              }
            })
    
            await set('state')('IndividualLessonScheduleSetDurationAndCreate')
          }
          else ctx.reply('на жаль, ви не маєте змогу запланувати заннятя на цей час, бо воно заплановане заняттям з ' +(await dbProcess.ShowOneUser(parseInt(free!)))!.name);
        }
        else ctx.reply(`вибачте, час не підкорюється нашому мистецтву повернення минулого. але давайте зробимо вашу подорож у майбутнє незабутньою! для цього введіть час у форматі ${Time()}`);
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonScheduleSetDurationAndCreate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
      await set('state')('IndividualLessonScheduleCheckTimeAndGetDuration');
    }
    else if (data.text === '60хв' || data.text === '90хв' || data.text === '30хв'){
      const allLessons = await dbProcess.ShowAllInvdividualLessons(),
        free = checkAvailabilityForLesson(
          user['teacher_time_individual_lesson_set'],
          user['teacher_date_individual_lesson_set'],
          allLessons,
          ctx?.chat?.id ?? -1,
          'part_2',
          parseInt(data.text.replace(/хв/g, '').trim())
        );

      if (free === 'free'){
        const minuteCheck = await dbProcess.CreateNewIndividualLesson(
          parseInt(user['teacher_individual_lesson_schedule_student_id']),
          ctx?.chat?.id ?? -1,
          user['teacher_date_individual_lesson_set'],
          user['teacher_time_individual_lesson_set'],
          parseInt(data.text.replace(/хв/g, '').trim())
        ),
        count = (await dbProcess.ShowOneUser(parseInt(user['teacher_individual_lesson_schedule_student_id'])))!.individual_count;


        if (minuteCheck === 'success'){
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
            SendNotification(notifbot, script.notification.forAdmins.notEnoughCountOfLessons(User!.name, User!.username, User!.number, Teacher!.name));
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
        else ctx.reply(`залишок у студента всього ${count}, будь ласка, оберіть інший час із кнопок нижче`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.durationChoose()
          }
        })
      }
      else{
        await ctx.reply('на жаль, ви не маєте змогу запланувати заннятя на цей час, бо воно заплановане з ' +(await dbProcess.ShowOneUser(parseInt(free!)))!.name);
        await ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
        await set('state')('IndividualLessonScheduleCheckTimeAndGetDuration');
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
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
        if (userObject!.set_individual_lessons || trialLessons.length){
          const lessons = SortSchedule([
            ...(userObject?.set_individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(userObject?.set_individual_lessons) : []),
            ...(trialLessons?.length ? trialLessons : [])
          ].filter((lesson: any) => Object.keys(lesson).length));
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
            let message = `📋 ${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}\n\n`;
    
            for (let j = 0; j < lessonProcess[key].length; j++) {
              const lesson = lessonProcess[key][j],
                student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
              message += script.indivdual.rescheduleForTeacher(
                j + 1,
                lesson.time,
                lesson.duration,
                student? student.name : "Не вдалося знайти ім'я в БД :(",
                student? student.username : "unknown",
                student? student.number : "не вдалося знайти номеру :(",
                lesson.type
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
    else if (CheckException.TextException(data)){
      const date = DateProcess(data.text);

      if (date[0] === 'date_uncorrect'){
        ctx.reply('вибачте, але ви не правильно ввели дату :( повторіть, будь ласка, ще раз');
      }
      else if (date[0] === 'format_of_date_uncorrect'){
        ctx.reply('перепрошую, але формат введеної вами дати не є корректним :(\n\nслідуйте, будь ласка, за данним прикладом 19.03.2024');
      }
      else{
        if (isDateNoInPast(date[1])){
          const lessons = await dbProcess.ShowAllInvdividualLessons();
          let activeLessons = [];
  
          for (let i = 0; i < lessons.length; i++){
            if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === date[1]){
              activeLessons.push(lessons[i]);
            }
          }
  
          if (activeLessons){
            let messageToSend = `📋 ${getDayOfWeek(new Date(date[1]))} ${(DateProcessToPresentView(date[1]))[1]}\n\n`,
              keyboardChoose = [];

            const srtdActiveLessons = SortSchedule(activeLessons);
  
            for (let i = 0; i < srtdActiveLessons.length; i++){
              const User = await dbProcess.ShowOneUser(srtdActiveLessons[i].idStudent);
              keyboardChoose.push([{ text: (i + 1).toString() }])
              messageToSend += script.indivdual.rescheduleForTeacher(
                i + 1,
                srtdActiveLessons[i].time,
                srtdActiveLessons[i].duration,
                User!.name,
                User!.username,
                User!.number,
                srtdActiveLessons[i].type
              )
            }
  
            if (keyboardChoose?.length){
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
          else ctx.reply('на жаль або на щастя в цей день у вас немає занять - вкажіть іншу дату');
        }
        else ctx.reply(`на жаль, ми не можемо змінити минуле, але можемо покращити майбутнє\nвведіть іншу дату наприклад, ${DateRecord()}`);
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

    const srtdActiveLessons = SortSchedule(activeLessons);

    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть дату заняття, яке ви хочете перенести у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonRescheduleFindLesson');
    }
    else if (!isNaN(parseInt(data.text)) && srtdActiveLessons[parseInt(data.text) - 1]){
      await set('teacher_reschedule_lesson_id_of_lesson')(srtdActiveLessons[parseInt(data.text) - 1]._id.toString());
      ctx.reply('вкажіть причину перенесення заняття:');
      await set('state')('IndividualLessonRescheduleRespondReasonAndGetNewDate');
    }
  })
  
  onTextMessage('IndividualLessonRescheduleRespondReasonAndGetNewDate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const date = DateProcess((DateProcessToPresentView(user['teacher_reschedule_lesson_date_of_lesson']))[1]),
        lessons = await dbProcess.ShowAllInvdividualLessons();
      let activeLessons = [];

      for (let i = 0; i < lessons.length; i++){
        if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === date[1]){
          activeLessons.push(lessons[i]);
        }
      }

      if (activeLessons){
        let messageToSend = `📋 ${getDayOfWeek(new Date(date[1]))} ${(DateProcessToPresentView(date[1]))[1]}\n\n`,
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
            User!.number,
            activeLessons[i].type
          )
        }

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
    else if (CheckException.TextException(data)){
      await set('teacher_reschedule_lesson_reason')(data.text);
      ctx.reply(`вкажіть дату на коли перенести заняття у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonRescheduleRespondDateAndCheckThis');
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonRescheduleRespondDateAndCheckThis', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply('вкажіть причину перенесення заняття:');
      await set('state')('IndividualLessonRescheduleRespondReasonAndGetNewDate')
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
        if (isDateNoInPast(date[1])){
          await set('teacher_date_individual_lesson_set')(date[1]);
          ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
          await set('state')('IndividualLessonRescheduleCheckTimeAndGetDuration');
        }
        else ctx.reply(`Ой, вибачте, ми ще не винахідливі настільки, щоб змінити минуле. Давайте зосередимося на майбутньому!\nвведіть дату за форматом: ${DateRecord()}`);
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })
  
  onTextMessage('IndividualLessonRescheduleCheckTimeAndGetDuration', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть дату на коли перенести заняття у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonRescheduleRespondDateAndCheckThis');
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply(`от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату ${Time()}\n\nповторіть, будь ласка, ще раз :)`)
      }
      else{
        if (isTimeNotInPast(user['teacher_date_individual_lesson_set'], time)){
          const allLessons = await dbProcess.ShowAllInvdividualLessons(),
          lesson = (await dbProcess.GetSpecificIndividualLessons([ new ObjectId(user['teacher_reschedule_lesson_id_of_lesson']) ]))[0],
            User = await dbProcess.ShowOneUser(lesson?.idStudent),
            newDate = user['teacher_date_individual_lesson_set'];
  
          let free: string | undefined;
  
          if (lesson?.type === 'trial'){
            free = checkAvailabilityForLesson(time, allLessons[0].date, allLessons, ctx?.chat?.id ?? -1, 'part_2', 60, true, lesson);
          }
          free = checkAvailabilityForLesson(time, allLessons[0].date, allLessons, ctx?.chat?.id ?? -1, 'part_1', undefined, true, lesson);
  
          if (free === 'free'){
            if (lesson?.type === 'trial'){
              const updatedLesson = await dbProcess.EditExistIndividualLesson(
                new ObjectId(user['teacher_reschedule_lesson_id_of_lesson']),
                user['teacher_date_individual_lesson_set'],
                time
              )
        
              ctx.telegram.sendMessage(User!.id,
                script.notification.forStudent.rescheduleTrialLesson(
                  UniversalSingleDataProcess(new Date(lesson!.date), 'day_of_week'),
                  UniversalSingleDataProcess(new Date(lesson!.date), 'day'),
                  UniversalSingleDataProcess(new Date(lesson!.date), 'month'),
                  lesson!.time,
                  UniversalSingleDataProcess(new Date(newDate), 'day_of_week'),
                  UniversalSingleDataProcess(new Date(newDate), 'day'),
                  UniversalSingleDataProcess(new Date(newDate), 'month'),
                  time,
                  User!.miro_link ?? "відсутнє"
                ), {parse_mode: "HTML"}
              )
        
              SendNotification(notifbot, script.notification.forAdmins.rescheduleTrialLesson(
                User!.name,
                User!.username,
                User!.number,
                user['name'],
                UniversalSingleDataProcess(new Date(newDate), 'day'),
                UniversalSingleDataProcess(new Date(newDate), 'month'),
                time,
                user['teacher_reschedule_lesson_reason'],
                User!.miro_link ?? "відсутнє",
              ))
        
              if (updatedLesson){
                if (User){
                  const date = DateProcessToPresentView(user['teacher_date_individual_lesson_set'])
                  ctx.reply(script.indivdual.individualTrialLessonReschduled(
                    User.name,
                    date[1],
                    date[0],
                    time
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
            else{
              await set('teacher_time_individual_lesson_set')(time);
              ctx.reply('вкажіть, скільки триватиме заняття:', {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: keyboards.durationChoose()
                }
              })
      
              await set('state')('IndividualLessonRescheduleSetDurationAndCreate');
            }
          }
          else ctx.reply(`на жаль, на цей час у вас заплановане заняття з ${(await dbProcess.ShowOneUser(parseInt(free!)))!.name}(\n\nвкажіть інший час у форматі: ${Time()}`)
        }
        else ctx.reply(`час не обертається назад, але ми можемо зробити ваші дні світлішими. давайте рухатися вперед разом за форматом ${Time()}!`)
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonRescheduleSetDurationAndCreate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть години та хвилини за Києвом 🇺🇦 у форматі: ${Time()}`);
      await set('state')('IndividualLessonRescheduleCheckTimeAndGetDuration');
    }
    else if (data.text === '60хв' || data.text === '90хв' || data.text === '30хв'){
      const lesson = (await dbProcess.GetSpecificIndividualLessons([new ObjectId(user['teacher_reschedule_lesson_id_of_lesson'])]))[0],
        User = await dbProcess.ShowOneUser(parseInt(lesson!.idStudent)),
        newDate = user['teacher_date_individual_lesson_set'],
        allLessons = await dbProcess.ShowAllInvdividualLessons(),
        free = checkAvailabilityForLesson(
          user['teacher_time_individual_lesson_set'],
          user['teacher_date_individual_lesson_set'],
          allLessons, ctx?.chat?.id ?? -1,
          'part_2',
          parseInt(data.text.replace(/хв/g, '').trim()),
          true, lesson
        );

      if (free === 'free'){
        const updatedLesson = await dbProcess.EditExistIndividualLesson(
          new ObjectId(user['teacher_reschedule_lesson_id_of_lesson']),
          user['teacher_date_individual_lesson_set'],
          user['teacher_time_individual_lesson_set'],
          parseInt(data.text.replace(/хв/g, '').trim())
        )
  
        const newUserObject = await dbProcess.ShowOneUser(parseInt(lesson!.idStudent));
  
        if (updatedLesson){
          if (User){
            bot.telegram.sendMessage(User!.id,
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
              newUserObject!.individual_count
            ))
            const date = DateProcessToPresentView(user['teacher_date_individual_lesson_set'])
            ctx.reply(script.indivdual.individualLessonCreated(
              User.name,
              date[1],
              date[0],
              user['teacher_time_individual_lesson_set'],
              newUserObject!.individual_count ?? 0
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
        else ctx.reply(`у користувача ${User!.name} недостатньо хвилин для подібних змін (наразі у нього ${User!.individual_count ?? 0}хв)`, {
          reply_markup: {
            one_time_keyboard: true,
            keyboard: keyboards.durationChoose()
          }
        });
      }
      else{
        ctx.reply(`на жаль, але це заняття вже зайнято з ${(await dbProcess.ShowOneUser(parseInt(free!)))!.name}(\n\nвкажіть інший час у форматі: ${Time()}`);
        await set('state')('IndividualLessonRescheduleCheckTimeAndGetDuration');
      }
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
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
        if (userObject!.set_individual_lessons || trialLessons.length){
          const lessons = SortSchedule([
            ...(userObject?.set_individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(userObject?.set_individual_lessons) : []),
            ...(trialLessons?.length ? trialLessons : [])
          ].filter((lesson: any) => Object.keys(lesson).length));
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
            let message = `📋 ${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}\n\n`;
    
            for (let j = 0; j < lessonProcess[key].length; j++) {
              const lesson = lessonProcess[key][j],
                student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
              message += script.indivdual.rescheduleForTeacher(
                j + 1,
                lesson.time,
                lesson.duration,
                student? student.name : "Не вдалося знайти ім'я в БД :(",
                student? student.username : "unknown",
                student? student.number : "не вдалося знайти номеру :(",
                lesson.type
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
          let messageToSend = `📋 ${getDayOfWeek(new Date(date[1]))} ${(DateProcessToPresentView(date[1]))[1]}\n\n`,
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
              User!.number,
              activeLessons[i].type
            )
          }

          await set('teacher_delete_lesson_date_of_lesson')(date[1]);
          if (keyboardChoose.length){
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
        else ctx.reply('на жаль або на щастя в цей день у вас немає занять - вкажіть іншу дату');
      }
    }
  })

  onTextMessage('IndividualLessonDeleteLessonRespondLessonAndGetReason', async(ctx, user, set, data) => {
    const lessons = await dbProcess.ShowAllInvdividualLessons();
    let activeLessons = [],
      keyboardChoose = [];

    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть дату заняття, яке ви хочете видалити у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonDeleteLessonFindLesson');
    }

    for (let i = 0; i < lessons.length; i++){
      if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === user['teacher_delete_lesson_date_of_lesson']){
        activeLessons.push(lessons[i]);
      }
    }

    const srtdActiveLessons = SortSchedule(activeLessons);

    if (srtdActiveLessons){
      for (let i = 0; i < srtdActiveLessons.length; i++){
        keyboardChoose.push([{ text: (i + 1).toString() }]);
      }
    }

    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть дату заняття, яке ви хочете видалити у форматі: ${DateRecord()}`);
      await set('state')('IndividualLessonDeleteLessonFindLesson');
    }
    else if (!isNaN(parseInt(data.text)) && srtdActiveLessons[parseInt(data.text) - 1]){
      await set('teacher_delete_lesson_id_of_lesson')(srtdActiveLessons[parseInt(data.text) - 1]._id.toString());
      ctx.reply('вкажіть причину видалення заняття:');
      await set('state')('IndividualLessonDeleteRespondReasonAndVerifyDelete');
    }
    else ctx.reply(script.errorException.chooseButtonError, {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: keyboardChoose
      }
    })
  })

  onTextMessage('IndividualLessonDeleteRespondReasonAndVerifyDelete', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const date = DateProcess((DateProcessToPresentView(user['teacher_delete_lesson_date_of_lesson']))[1]),
        lessons = await dbProcess.ShowAllInvdividualLessons();
        let activeLessons = [];

        for (let i = 0; i < lessons.length; i++){
          if (lessons[i].idTeacher === ctx?.chat?.id && lessons[i].date === date[1]){
            activeLessons.push(lessons[i]);
          }
        }

        if (activeLessons){
          let messageToSend = `📋 ${getDayOfWeek(new Date(date[1]))} ${(DateProcessToPresentView(date[1]))[1]}\n\n`,
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
              User!.number,
              activeLessons[i].type
            )
          }

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
      ctx.reply('вкажіть причину видалення заняття:');
      await set('state')('IndividualLessonDeleteRespondReasonAndVerifyDelete');
    }
    else{
      switch(data.text){
        case "Так":
          const lessonToDelete = (await dbProcess.GetSpecificIndividualLessons([new ObjectId(user['teacher_delete_lesson_id_of_lesson'])]))[0],
            User = await dbProcess.ShowOneUser(lessonToDelete!.idStudent),
            Teacher = await dbProcess.ShowOneUser(lessonToDelete!.idTeacher);

          await dbProcess.DeleteIndividualLesson(new ObjectId(user['teacher_delete_lesson_id_of_lesson']));

          if (lessonToDelete?.type === 'trial'){
            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.deleteIndividualTrialLesson(
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day_of_week'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'month'),
              lessonToDelete!.time
            ))
  
            SendNotification(notifbot, script.notification.forAdmins.deleteIndividualTrialLesson(
              User!.name,
              User!.username,
              User!.number,
              Teacher!.name,
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day_of_week'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'month'),
              lessonToDelete!.time,
              user['teacher_individual_lesson_delete_reason']
            ))
            ctx.reply('✅ пробне заняття видалено', {
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
          }
          else{
            const newUserObject = await dbProcess.ShowOneUser(lessonToDelete!.idStudent);
            ctx.telegram.sendMessage(User!.id, script.notification.forStudent.deleteIndividualLesson(
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day_of_week'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'month'),
              lessonToDelete!.time,
              newUserObject!.individual_count ?? 0
            ))
  
            SendNotification(notifbot, script.notification.forAdmins.deleteIndividualLesson(
              User!.name,
              User!.username,
              User!.number,
              Teacher!.name,
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day_of_week'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'day'),
              UniversalSingleDataProcess(new Date(lessonToDelete!.date), 'month'),
              lessonToDelete!.time,
              user['teacher_individual_lesson_delete_reason'],
              newUserObject!.individual_count ?? 0
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
          }
          
          await set('state')('EndRootManager');
          break;

        case "Ні":
          ctx.reply('фуух, так і знали, що це якась помилка)', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.toMenu()
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
      const userObject = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        trialLessons = await dbProcess.GetUserTrialLessons(ctx?.chat?.id ?? -1);
      if (userObject!.set_individual_lessons || trialLessons.length){
        const lessons = SortSchedule([
          ...(userObject?.set_individual_lessons?.length ? await dbProcess.GetSpecificIndividualLessons(userObject?.set_individual_lessons) : []),
          ...(trialLessons?.length ? trialLessons : [])
        ].filter((lesson: any) => Object.keys(lesson).length));
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
          let message = `📋 ${getDayOfWeek(new Date(key))} ${(DateProcessToPresentView(key))[1]}\n\n`;
  
          for (let j = 0; j < lessonProcess[key].length; j++) {
            const lesson = lessonProcess[key][j],
              student = await dbProcess.ShowOneUser(lesson.idStudent) ? await dbProcess.ShowOneUser(lesson.idStudent) : false;
            message += script.indivdual.rescheduleForTeacher(
              j + 1,
              lesson.time,
              lesson.duration,
              student? student.name : "Не вдалося знайти ім'я в БД :(",
              student? student.username : "unknown",
              student? student.number : "не вдалося знайти номеру :(",
              lesson.type
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
        await ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
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
        if (isDateNoInPast(date[1])){
          await set('teacher_trial_date_of_lesson')(date[1]);
          ctx.reply(`вкажіть години та хвилини за Києвом у форматі: ${Time()}`);
  
          await set('state')('IndividualLessonTrialLessonRespondTime');
        }
        else ctx.reply(`На жаль, наш часовий маршрут обмежується лише до майбутнього\nвведіть дату у форматі: ${DateRecord()}`)
      }
    }
  })

  onTextMessage('IndividualLessonTrialLessonRespondTime', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      const User = await dbProcess.FindUser(user['teacher_individual_trial_lesson_user_id']);

      if (User){
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
        await ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
        await set('state')('IndividualLessonsTrialLessonRespondDate');
      }
      else ctx.reply('такого користувача не знайдено в базі даних');
    }
    else if (CheckException.TextException(data)){
      const time = TimeProcess(data.text);

      if (time === 'time_uncorrect'){
        ctx.reply('боженьки.. ви ввели не правильний час...\n\nповторіть, будь ласка, ще раз :)')
      }
      else if (time === 'format_of_time_uncorrect'){
        ctx.reply(`от халепа.. ви ввели час в неправильному форматі, якщо то взагалі час\nслідуйте цьому формату ${Time()}\n\nповторіть, будь ласка, ще раз :)`)
      }
      else{
        if (isTimeNotInPast(user['teacher_trial_date_of_lesson'], time)){
          const allLessons = await dbProcess.ShowAllInvdividualLessons(),
            free = checkAvailabilityForLesson(time, user['teacher_trial_date_of_lesson'], allLessons, ctx?.chat?.id ?? -1, 'part_2', 60);
  
          if (free === 'free'){
            await set('teacher_time_individual_lesson_set')(time);
            ctx.reply('додайте посилання на конференцію зі студентом:');
    
            await set('state')('IndividualLessonTrialRespondLinkAndCreate');
          }
          else ctx.reply(`на жаль, на цей час у вас заплановане заняття з ${(await dbProcess.ShowOneUser(parseInt(free!)))!.name}(\n\nвкажіть інший час у форматі: ${Time()}`)
        }
        else ctx.reply(`ой, якби ми могли повернутися в часі, але навіть ми не можемо переписати минуле. Але ми можемо розпочати майбутнє разом! Тому введіть, будь ласка, дату у форматі: ${Time()}`)
      }
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  onTextMessage('IndividualLessonTrialRespondLinkAndCreate', async(ctx, user, set, data) => {
    if (CheckException.BackRoot(data)){
      ctx.reply(`вкажіть години та хвилини за Києвом у форматі: ${Time()}`);

      await set('state')('IndividualLessonTrialLessonRespondTime');
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
          keyboard: keyboards.toMenu()
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

      ctx.reply('дякуємо за звернення, сподіваємося, ваше питання було вирішено❤️', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      });

      ctx.telegram.sendMessage(user['activeHelperLiveSupport'], "користувач закрив канал, тепер можете випити філіжанку кави", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
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

      ctx.reply('прекрасно, тепер можете відпочивати', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      })

      ctx.telegram.sendMessage(user['activeUserLiveSupport'], "дякуємо за звернення, сподіваємося, ваше питання було вирішено❤️", {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
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
      ctx.reply('окей, гадаємо це була помилка, гарного дня❤️', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.toMenu()
        }
      })

      for(let n = 0; n < serviceCare!.messageIDs.length; n++){
        await ctx.telegram.editMessageReplyMarkup(serviceCare!.chatIDs[n], serviceCare!.messageIDs[n], undefined, Markup.inlineKeyboard(liveKeyboard(ctx?.chat?.id ?? -1, 'declined', user['userObjectCloseLiveSupport'])).reply_markup)
      }

      await dbProcess.DeleteServiceCare(serviceCare!._id);
      await set('temp_thanks_care_message')('');
      await set('state')('EndRootManager');
    }
    else if (CheckException.TextException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, data.text);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.PhotoException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'photo', `${data.photo[0]};${data.photo[1]}`);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.VideoException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'video', `${data.video[0]};${data.video[1]}`);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.AudioException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'audio', data.audio);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.StickerException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'sticker', data.stickers);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.LocationException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'location', `${data.location[0]};${data.location[1]}`);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.VideoNoteException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'video_note', data.video_circle);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.VoiceException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'voice', data.voice);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.PhoneException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'phone', `${data.phone_number[0]};${data.phone_number[1]}`);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else if (CheckException.FileException(data)){
      await dbProcess.WriteAdditionalQuestionToServiceCare(serviceCare!._id, undefined, 'file', `${data.file[0]};${data.file[1]}`);
      if (user['temp_thanks_care_message']) ctx.telegram.deleteMessage(ctx?.chat?.id ?? -1, parseInt(user['temp_thanks_care_message']));
      const temp_thanks_care_message = ctx.reply('супер, уточнюємо це', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: [[{ text: "ВІДМІНИТИ" }]]
        }
      })
      await set('temp_thanks_care_message')((await temp_thanks_care_message).message_id.toString());
    }
    else ctx.reply(script.errorException.textGettingError.defaultException);
  })

  bot.action(/^goToDetaskCheck:(\d+)$/, async (ctx) => {
    const student = await dbProcess.ShowOneUser(parseInt(ctx.match[1])),
        teacher = await dbProcess.ShowOneUser(ctx?.chat?.id ?? -1),
        teacherTasks = teacher ? teacher.set_detasks : false,
        teacherRegisterStudents = teacher ? teacher.registered_students : false;
      let teacherHaveThisTask = false;

      for (let i = 0; i < teacherTasks.length; i++){
        if (teacherTasks[i].toString() === student?.detask?.toString()){
          teacherHaveThisTask = true;
          break;
        }
      }

      if (student && teacherTasks && teacherRegisterStudents.includes(student.id)){
        const answer = await dbProcess.GetStudentAnswerForDeTask(student.id),
          task = await dbProcess.GetDeTaskForStudent(student.detask);
        await ctx.reply(`супер!\n👉 завдання, яке було дано студентові:`);
        
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

                case "sticker":
                  await ctx.telegram.sendSticker(idAddress, files[i]);
                  break;

                case "video":
                  const video = files[i].split(';');
                  await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
                  break;

                default:
                  ctx.reply('нам прикро, але надісланий вами тип файлу наразі не підтримується, вибачте за труднощі...');

              }
            }
          }
        }

        await db.set(ctx?.chat?.id ?? -1)('tmp_userid_detask')(student.id);

        if (student.detask){
          if (teacherHaveThisTask){
            console.log(answer[0])
            if (answer[0] !== 'no_answer_available'){
              await ctx.reply('✅ виконане завдання:');
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

                      case "sticker":
                        await ctx.telegram.sendSticker(idAddress, files[i]);
                        break;

                      case "video":
                        const video = files[i].split(';');
                        await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
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

                await db.set(ctx?.chat?.id ?? -1)('state')('EndTeacherDeTaskHandler');
              }
            }
            else{
              await db.set(ctx?.chat?.id ?? -1)('detask_tmp_endkeyboard')('have_task');
              ctx.reply('на жаль, студент ще не дав відповіді на ваше завдання :(', {
                reply_markup: {
                  one_time_keyboard: true,
                  keyboard: keyboards.deTaskMenu('have_task')
                }
              });
              await db.set(ctx?.chat?.id ?? -1)('state')('EndTeacherDeTaskHandler');
            }
            return ctx.answerCbQuery(`Завантажено всі доступні відповіді`);
          }
          else{
            ctx.reply('вибачте, але схоже виникла помилка, ви не давали цьому студенту деЗавдання...', {
              reply_markup: {
                one_time_keyboard: true,
                keyboard: keyboards.toMenu()
              }
            });
            ctx.telegram.sendMessage(devChat, `ERROR:\n\nTeacher ${await db.get(ctx?.chat?.id ?? -1)('name')} (id: ${ctx?.chat?.id ?? -1}, tg: @${await db.get(ctx?.chat?.id ?? -1)('username')}) has a student who did not give the assignment\n\nвибачте, але ви не давали цьому студенту деЗавдання...`);
            await db.set(ctx?.chat?.id ?? -1)('state')('EndRootManager');
            return ctx.answerCbQuery(`Помилка, доповідаю в підтримку`);
          }
        }
        else{
          await db.set(ctx?.chat?.id ?? -1)('detask_tmp_endkeyboard')('not_have_task');
          ctx.reply('перепрошуємо, але схоже виникла помилка, студент не має деЗавдання, але ви можете виправити це ;)', {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.deTaskMenu('not_have_task')
            }
          })

          await db.set(ctx?.chat?.id ?? -1)('state')('EndTeacherDeTaskHandler');
          return ctx.answerCbQuery(`Помилка, студент не має деЗавдання`);
        }
      }
      else{
        ctx.reply('вибачте, але схоже виникла помилка, у вас немає цього студента або ви просто не давали йому завдання.\n\nякщо ви давали йому деЗавдання, то наразі воно не є активним');
        return ctx.answerCbQuery(`Єрор :()`);
      }
  })

  bot.action(/^goToDetaskSolution:(\d+)$/, async (ctx) => {
    const userData = await dbProcess.ShowOneUser(parseInt(ctx.match[1])),
        actualTask = userData ? userData.detask : false;

      if (actualTask){
        const task = await dbProcess.GetDeTaskForStudent(actualTask);
        await ctx.reply(`😏 ${await db.get(userData!.id)('name')}, ваше актуальне завдання:`);
        
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

                case "sticker":
                  await ctx.telegram.sendSticker(idAddress, files[i]);
                  break;

                case "video":
                  const video = files[i].split(';');
                  await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
                  break;

                default:
                  ctx.reply('нам прикро, але надісланий викладачем тип файлу наразі не підтримується, вибачте за труднощі...');

              }
            }
          }
          await ctx.reply('*можна надсилати текстові повідомлення та усі види файлів (фото, відео, кружечки, войси і тд)');
          await db.set(userData!.id)('state')('RespondStudentDeTaskHandler');
          return ctx.answerCbQuery(`Завдання успішно завантажені`);
        }
      }
      else{
        ctx.reply('вибачте, але у вас немає активних деЗавдань :(');
        return ctx.answerCbQuery(`Помилка, завдань не знайдено.`);
      }
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
      await ctx.reply(`вкажіть день, місяць та рік у форматі:\n${DateRecord()}`);
      await db.set(parseInt(ctx.match[1]))('state')('IndividualLessonsTrialLessonRespondDate');
      return ctx.answerCbQuery(`Ви прийняли цього користувача.`);
    }
    else{
      ctx.reply('помилка :( користувача не знайдено');
      return ctx.answerCbQuery(`Помилка :(`);
    }
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
          await db.set(chats[n])('temp_thanks_care_message')('');
        }
        else await ctx.telegram.editMessageReplyMarkup(chats[n], messages[n], undefined, Markup.inlineKeyboard(liveKeyboard(id, 'busy', ctx.match[2])).reply_markup)
      }
      const userObject = await dbProcess.ShowOneUser(id);
      ctx.telegram.sendMessage(id, `вітаємо, ${userObject!.name}! я - ${operator}, служба турботи dehto 💪`, {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.liveSupportProbablyCancel()
        }
      });
      await ctx.reply('ви успішно прийняли запит користувача, можете працювати', {
        reply_markup: {
          one_time_keyboard: true,
          keyboard: keyboards.liveSupportProbablyCancel()
        }
      })

      if (serviceCare?.question?.length){
        for (let u = 0; u < serviceCare?.question?.length; u++){
          await ctx.reply(serviceCare?.question[u], {
            reply_markup: {
              one_time_keyboard: true,
              keyboard: keyboards.liveSupportProbablyCancel()
            }
          })
        }
      }
      if (serviceCare?.questionsType?.length){
        const files = serviceCare.questionsFiles,
          idAddress = ctx?.chat?.id ?? -1;
        for (let u = 0; u < serviceCare.questionsType.length; u++){
          switch (serviceCare.questionsType[u]) {
            case "file":
              const file = files[u].split(';');
              await ctx.telegram.sendDocument(idAddress, file[0], {caption: file[1] ? file[1] : ''});
              break;

            case "photo":
              const photo = files[u].split(';');
              await ctx.telegram.sendPhoto(idAddress, photo[0], {caption: photo[1] ? photo[1] : ''});
              break;

            case "audio":
              await ctx.telegram.sendAudio(idAddress, files[u]);
              break;

            case "location":
              const loc = files[u].split(';');
              await ctx.telegram.sendLocation(idAddress, loc[0], loc[1]);
              break;

            case "video_circle":
              await ctx.telegram.sendVideoNote(idAddress, files[u]);
              break;

            case "voice":
              await ctx.telegram.sendVoice(idAddress, files[u]);
              break;

            case "contact":
              const phone = files[u].split(';');
              await ctx.telegram.sendContact(idAddress, phone[0], phone[1]);
              break;

            case "sticker":
              await ctx.telegram.sendSticker(idAddress, files[u]);
              break;

            case "video":
              const video = files[u].split(';');
              await ctx.telegram.sendVideo(idAddress, video[0], {caption: video[1] ? video[1] : ''});
              break;

            default:
              ctx.reply('нам прикро, але надісланий викладачем тип файлу наразі не підтримується, вибачте за труднощі...');

          }
        }
      }
      return ctx.answerCbQuery(`Ви успішно взяли замовлення`);
    } catch (e) {
      console.log(e);
      return ctx.answerCbQuery(`Помилка :(`);
    }
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
  bot.action(/^acceptPayment:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]),
      idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2])),
      users = await dbProcess.ShowAllUsers();

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

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але на жаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

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

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але на жаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

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

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але на жаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

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

  bot.action(/^declinePaymentCP:(\d+),(.+),(.+)$/, async (ctx) => {
    const idUser = Number.parseInt(ctx.match[1]);
    const idClub = await dbProcess.ShowData(new ObjectId(ctx.match[2]));
    const packetName = ctx.match[3] === 's' ? 'Шпрах-Клуб' : 'Шпрах-Клуб+PLUS';

    await ctx.telegram.sendMessage(idUser, `вибачте, ${await db.get(idUser)('name')}, але на жаль ваша оплата не успішна.\nповторіть будь ласка змовлення`);

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