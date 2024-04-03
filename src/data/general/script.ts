import { ConvertRole } from "../../base/handlersdb/changeRoleValue";
import { ConvertToPrice } from "../process/convertPaymentPerLesson";

const script = {
  errorException: {
    chooseFunctionError: `трясця..

тут просто потрібно натиснути одну із кнопочок знизу. оберіть функцію, будь ласка🥹`,

    chooseMenuButtonError: `упс... щоб повернутись в меню вам потрібно натиснути на кнопку знизу!`,

    chooseButtonError: `хай йому грець..

Вам потрібно обрати одну із кнопочок знизу. повторіть, будь ласка, ще раз😉`,

    nameGettingError: `що ж..

тут потрібно написати своє імʼя власноруч, тож напишіть, будь ласка👇🏽`,

    phoneGettingError: {
      defaultException: `та щоб його.. 

тут Вам необхідно поділитися номером телефону просто натиснувши на кнопочку знизу🫶🏽`,

      textException: `хай йому грець!

тут потрібно обрати кнопочку, а не писати, тож оберіть функцію🫶🏽`,

      photoException: `от халепа… 

потрібно натиснути кнопочку «поділитися номером», а не надсилати картинки)`,

      fileException: `ого... вибачте, але файли нам не потрібні\n\nпотрібно натиснути кнопочку «поділитися номером»`,

      stickerException: `о так несподіванка...\n\nНам потрібен ваш телефон, будь ласка, натисніть на кнопку знизу`,

      videoException: `о... дякуємо, але відео нам не потрібне\nнастисніть, будь ласка, на кнопку знизу «поділитися номером»`,

      locationException: `ого... вибачте, але нам Ваше місцезнаходження не потрібне\n\nнастисніть, будь ласка, на кнопку знизу «поділитися номером»`,
      
      pollsException: `опа... а це що...\n\nвибачте, але голосувати тут не тре, настисніть, будь ласка, на кнопку знизу «поділитися номером»`

    },

    paymentGettingError: `а щоб йому повилазило..

тут потрібно надіслати фотографію або файл(pdf, jpeg, jpg, png, heic), просто вибравши їх з галереї🫂`,

    textGettingError: {
      defaultException: `от халепа..

тут потрібно дати відповідь на питання і писати власноруч, тож напишіть, будь ласка👇🏽`,

      photoException: `от халепа..

тут не потрібно надсилати картинки. напишіть, будь ласка, власноруч🫂`,

      fileException: `а щоб його.. 

тут не потрібно надсилати файл. напишіть текст, будь ласка, власноруч😉`,

      stickerException: `оу... щиро дякуємо, але Вам потрібно власноруч написати, а не надсилати стікери😎`,

      videoException: `о... дякуємо, але відео нам не потрібне\nбудь ласка, просто напишіть`,

      locationException: `ого... вибачте, але нам Ваше місцезнаходження не потрібне\n\nбудь ласка, просто напишіть, те що ми запитували`,

      pollsException: `опа... а це що...\n\nвибачте, але голосувати тут не тре, просто напишіть, те що ми запитували`,

      mailException: `от халепа...\n\nте що Ви ввели не схоже на електронну пошту\nповторіть, будь ласка, ще раз!`
    }
  },

  entire: {
    greeting : 'привіт! я - бот мовної школи dehto. підкажіть, як до Вас можна звертатися?☺️',

    niceNameAndGetPhone: (name: string) => `${name}! яке прекрасне ім’я🥹\n
будь ласка, залиште номер телефону, щоб підтримці було легше з Вами звʼязатися🫶🏽`,

    shareYourPhone: "Поділитись своїм номером телефону",

    chooseFunction: `чудно!)\n\nа тепер оберіть, який формат Вас цікавить:`
  },

  payInvidualLesson: {
    chooseLevelCourse: `dehto дякує за довіру❤\nоберіть свій рівень`,

    choosePacket: (minimal: number, econom: number, popular: number, large: number) => `оберіть, будь ласка, пакет занять, який Вас цікавить:\n\n
🔵 Мінімальний: 5 занять (${minimal}uah - 1 заняття) 
🔴 Економний: 10 занять (${econom}uah - 1 заняття) 
🟢 Популярний: 20 занять (${popular}uah - 1 заняття) 
🟡 Вигідний: 50 занять (${large}uah - 1 заняття)`,

    statsAboutChoosedPacket: (packetName: string, priceSingle: number, countOfLessons: number) => `🤭 індивідуальне заняття пакету «${packetName}» вартує
${priceSingle} uah / 60 хв. цей пакет включає ${countOfLessons} занять\n
👉🏽 до сплати ${priceSingle * countOfLessons} uah`,

    payment: {
      require: `👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.\n
👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.`,

      proofRequest: `скрін про оплату надішліть сюди😌`
    },

    endWork: (name: string) => `дякуємо, ${name}🫶🏽
найближчим часом із Вами звʼяжеться служба турботи та повідомить про стан оплати)\n
а також, за потреби, відкриє Вам доступ до усіх відео-лекцій на сайті dehto☺️\n
гарного дня!🍓`, 

    report: (name: string, username: string, phone_number: string, choosedPacket: string, date: string) => 
    `💰 Оплата занять 💰\n
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Пакет</b>: ${choosedPacket}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },
  
  teacherOnHour: {
    greeting: "вітаю! я - ваш особистий вчитель на годину з dehto. підкажи, як до Вас звертатися?☺️",

    whatALovelyName: (name: string) => `${name}! яке прекрасне ім’я🥹 залиште номер телефону, щоб вчитель dehto зв\'язався із Вами`,

    whatsTheProblem: "окей, дякуємо! підкажіть, будь ласка, з яким рівнем у Вас виникли труднощі?",

    whatLecture: "з якою лекцією?",

    additionalQuestions: {
      question: "чи є у Вас питання, які dehto допоможе вирішити?🤔",
      no: "немає",
      yes: "маю питання",
      ifYes: "яке саме?",
    },

    payment: {
      thanks: `дякуємо за Вашу відповідь🥰\n
поки вчитель dehto готує матеріали для заняття - можете внести оплату за заняття (350uah) на реквізити за рахунком ФОП:\n\n
👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.\n
👉🏽💳 або ж на реквізити банківської карти:
  4035200042356078 Молоков Є.А.`,

      sendPics: "скрін про оплату надішліть сюди😌",
      
      paymentSent: (name: string) => `дякуємо, ${name}🫶🏽`,

      waitForContact: "скоро із Вами зв’яжеться вчитель і ви узгодите час проведення заняття😉",
    },

    report: (name: string, username: string, phone_number: string, course: string, lecture: string, question: string, date: string) =>
    `✅ Вчитель на годину ✅\n  
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Курс</b>: ${course}
👉🏽<b>Лекція</b>: ${lecture}
👉🏽<b>Додаткові питання</b>: ${question}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },

  indivdual: {
    entire: (role: string) => role === 'admin' || role === 'developer' || role === 'teacher' ? 'що цікавить' : 'оберіть, що вас цікавить :)',

    studentDeleteFromTeacher: (teacher: string, student: string) => `✅ студента ${student} було успішно видалено від викладача ${teacher}`,

    individualLessonCreated: (name: string, date: string, dayOfWeek: string, time: string, count: number) => `чудово!\n\nзаняття з ${name} заплановано на:
👉 ${date} (${dayOfWeek}) о ${time} за Києвом🇺🇦\n\n${count > 0 ? '✅' : '❌'} Залишок: ${count / 60} занять (${count}хв)`,

    rescheduleForTeacher: (position: number, time: string, duration: number, studentName: string, username: string, number: number) =>
    `👉 ${position}\n${time} за Києвом 🇺🇦 (${duration}хв)\n${studentName}\n(@${username}); ${number}\n\n`,

    scheduleShowStudent: (time: string, duration: number, teacherName: string, teacherUsername: string, teacherNumber: number, miro_link: string) =>
    `👉 ${time} за Києвом 🇺🇦 (${duration}хв)\n\nВикладач: ${teacherName}\n(@${teacherUsername});${teacherNumber}\n
посилання на дошку Miro студента: ${miro_link}\n\n`,

    trialFinal: (name: string, date: string, dayOfWeek: string, time: string, miro_link: string, zoom_link: string) => `чудово!\n
заняття з ${name} заплановано на:
👉 ${date} (${dayOfWeek}) о ${time} за Києвом🇺🇦\n
❗️не забудьте повідомити підтримку після заняття, який рівень у студента та як пройшло заняття\n
Вдалого пробного🍓\n
лінк на Miro: 
${miro_link}\n
лінк на зустріч:
${zoom_link}`
  },

  trialLesson: {
    niceWhatATime: `супер!\nякий би графік занять ви хотіли мати? 🤩\n\n(вкажіть дні та години)`,

    countOfLessonsRequest: `скільки занять на тиждень хочете мати?`,

    levelLanguageRequest: `напишіть, будь ласка, яким, приблизно, рівнем мови Ви володієте?`,

    goalLearnRequest: `яка вашіа ціль вивчення мови? для чого її вчите?`,

    thanksPartTwo: (graphic: string) => `чудно!)\n
👉🏽 отож, пробне заняття краще провести: ${graphic}\n
скоро з Вами звʼяжеться підтримка для узгодження деталей та сам викладач😎\n
гарного дня!🌱`,

    question: 'напишіть, будь ласка🤝🏽',

    report: (name: string, username: string, phone_number: string, graphic: string, languagelevel: string, goal: string, date: string) => 
    `🍓 Пробний урок 🍓\n
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Графік</b>: ${graphic}
👉🏽<b>Рівень володіння мовою</b>: ${languagelevel}
👉🏽<b>Ціль</b>: ${goal}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },

  registrationLesson: {
    niceWhatATime: `супер!\n
який у Вас графік? в які дні та години Вам зручно займатися?🤩`,

    levelLanguageRequest: `напишіть, будь ласка, яким, приблизно, рівнем мови Ви володієте?`,

    thanks: (name: string, graphic: string) => `дякуємо, ${name}!🌱\n
👉🏽 отже, стосовно графіка:  ${graphic}\n
якщо у Вас є додаткові побажання - напишіть їх, якщо немає - напишіть «немає»🤗`,

    end: `супер!\n
скоро з Вами звʼяжеться підтримка для узгодження деталей та сам викладач😎\n
гарного дня!🌱`,

    report: (name: string, username: string, phone_number: string, graphic: string, languagelevel: string, addquestion: string, date: string) =>
    `📆 Запис на заняття 📆\n
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Зручний час проведення</b>: ${graphic}
👉🏽<b>Рівень володіння мовою</b>: ${languagelevel}
👉🏽<b>Додаткові питання</b>: ${addquestion}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },

  about: (version: string) => `
Бот школи німецької <b>dehto</b>\n
Версія: <b>${version}</b>\n
Розробник: <b>TheLaidSon</b>\n
Telegram: <b>@XCoooREOCTa</b>
Instagram: <b><a href="https://www.instagram.com/watthatt/">@watthatt</a></b>
  `,

    speakingClub: {
      entire: `Виберіть кнопку:`,

      about: `дякуємо, що цікавишся нашими шпрах-клубами🥹\n\nза ось цим посиланням ти можеш переглянути коротеньке відео про те, як вони у нас влаштовані та про правила поводження на клубі: https://youtu.be/OaUqpIgKV4s\n\nчекатимемо тебе на шпрах-клубах dehto!\nцьом♥️`,

      trialLesson: {
        entire: `раді, що ти облав_ла пробне заняття!\n\nрадше разове заняття на звичайному шпрах-клубі, щоб зрозуміти, чи пасує тобі такий формат☺️\n\nзаняття вартує як і звичайне - 300uah\n\nготовий_а продовжувати?)`,
        
        getPayment: `тепер перейдімо до оплати😁
👉🏽 до сплати 240 uah\n
👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.\n
👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.\n
скрін про оплату надішліть сюди😌`,

        ifNo: `тоді гарного дня!🌱`,

        ifYes: `супер)\n\nобери тему, яка найбільше цікавить тебе із доступного списку нижче!`

      },

      defaultDecline: `тоді гарного дня!🌱`,

      lessLessons: (count: number) => {
        return count > 0 ? `Ваш залишок занять: ${count} заняття☺️` : `У Вас немає проплачених занять😳\nбажаєте придбати?)`;
      },

      payPacketLesson: `у нас для тебе чудова новина!
ти можеш взяти разове заняття або ж оплатити цілий пакет😁\n
✅ 1
Разове заняття
ціна: 300 uah\n
✅ 2
Пакет “Шпрах-Клуб”
👉🏽 5 занять (280uah за одне)
ціна: 1400 uah\n
✅ 3
пакет “Шпрах-Клуб+PLUS” 
👉🏽 5 занять (280uah за одне)
👉🏽 доступ до одного відео-курсу на сайті
ціна: 2800 uah\n
*повна ціна одного відео-курсу на сайті дехто 2300uah`,

      onceClub: `чудно!\n
😉 Ви обрали разове заняття
👉🏽 до сплати 300 uah\n\n
👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.\n
👉🏽💳 або ж на реквізити банківської карти:
  4035200042356078 Молоков Є.А.\n
скрін про оплату надішліть сюди😌`,

      standartClub: `чудно!\n
😉 Ви обрали пакет “Шпрах-Клуб”
👉🏽 до сплати 1400 uah\n\n
👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.\n
👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.\n\n
скрін про оплату надішліть сюди😌`,

      plusClub: `чудно!\n
😉 Ви обрали пакет “Шпрах-Клуб+PLUS”
👉🏽 до сплати 2800 uah\n\n
👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.\n
👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.\n\n
скрін про оплату надішліть сюди😌`,

    thanksType: {
      typeOnce: (name: string) => `дякуємо, ${name}🫶🏽
Ви успішно оплатили разове заняття!\n
якщо є питання - звертайтеся сюди:
+380 97 577 20 93
@dehto_school\n
гарного дня!🍓`,

      typeStandart: (name: string) => `дякуємо, ${name}🫶🏽
Ви успішно оплатили пакет “Шпрах-Клуб”!\n
гарного дня!🍓`,

    typePlus: `супер!\n😉 тепер оберіть курс, який Ви хочете отримати`
    },

    getMail: `введіть адресу своєї електронної пошти, будь ласка`,

    thanksAfterMail: (name: string, course: string) => `дякуємо, ${name}🫶🏽
найближчим часом із Вами звʼяжеться служба турботи - повідомить про стан оплати та дасть доступ до курсу ${course})\n
якщо є питання - звертайтеся сюди:
+380 97 577 20 93
@dehto_school\n
гарного дня!🍓`,

    report: {
      showClub: (position: number, title: string, teacher: string, date: string, time: string, addString: string) => `✅${position}
🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦\n
${addString}`,

      showClubTypeAdmin: (position: number, title: string, teacher: string, date: string, time: string, addString: string, recordedUsers: string, link: string) => `✅${position}
🗣 ШПРАХ-КЛУБ
👉🏼 <b>Тема</b>: ${title}
👉🏼 <b>Викладач</b>: ${teacher}\n
👉🏼 <b>Коли</b>: ${date}
👉🏼 <b>На котру</b>: ${time} 🇺🇦
${recordedUsers}\n
👉🏼 <b>Посилання</b>: ${link}\n
${addString}`,

      showClubTypeTeacher: (position: number, title: string, teacher: string, date: string, time: string, addString: string, recordedUsers: string, link: string) => `✅${position}
🗣 ШПРАХ-КЛУБ
👉🏼 <b>Тема</b>: ${title}
👉🏼 <b>Викладач</b>: ${teacher}\n
👉🏼 <b>Коли</b>: ${date}
👉🏼 <b>На котру</b>: ${time} 🇺🇦
${recordedUsers}
${addString}\n
👉🏼 <b>Посилання</b>: ${link}`,

      showClubToUser: (title: string, teacher: string, date: string, time: string) => `🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦`,

      showOwnClubToUser: (count: number, title: string, teacher: string, date: string, time: string, link: string) => `✅${count}
🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦\n
Посилання: ${link}`,

      showUser: (position: number, name: string, id: number, username: string, phone_number: string, count: number, role: string) => `✅${position}
ID: ${id}
Ім'я: ${name}
Telegram: @${username}
Номер телефону: ${phone_number}
Користувач є: ${role}
Кількість доступних занять: ${count > 0 ? count : '❌'}`,

      showUserToAdmin: (position: number, name: string, id: number, username: string, phone_number: string, count: number, role: string, packet: string, pricePerLesson: number) => `✅${position}
ID: ${id}
Ім'я: ${name}
Telegram: @${username}
Номер телефону: ${phone_number}
Користувач є: ${role}
Активний пакет: ${packet}
Ціна заняття пакету: ${pricePerLesson} uah.
Кількість доступних занять: ${count > 0 ? count : '❌'}`,

      checkClub: (title: string, teacher: string, date: string, time: string, link: string, count: number) => `🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦\n
${count > 0 ? `кількість доступних місць: ${count}` : `❌ немає вільних місць ❌`}\n
Посилання: ${link}`,

      acceptedTrialLesson: (name: string, date: string, time: string, link: string) => `✅ ${name}, Вашу реєстрацію підтвержено!\n
😁 Чекатимемо Вас
${date} о ${time} 🇺🇦 за ось цим посиланням:\n\n${link}\n\n❗️обов’язково підпишіться своїм іменем\n
до зустрічі!
дехто з турботою🍓`,

      acceptedPacketAndClubPayment: (name: string, date: string, time: string, link: string, packet: string) => `✅ ${name}, Вашу реєстрацію підтвержено!
👉🏽 Ваш активний пакет "${packet}"\n
😁 Чекатимемо Вас
${date} о ${time} 🇺🇦 за ось цим посиланням:\n\n${link}\n\n❗️обов’язково підпишіться своїм іменем\n
до зустрічі!
дехто з турботою🍓`,

      acceptedPacketPayment: (name: string, packet: string) => `дякуємо, ${name}🫶🏽\n
✅ оплата пакету “${packet}” пройшла успішно!\n
🥰 за будь-яких питань звертайтеся у підтримку: 
@dehto_school 
+380 97 577 20 93\n
гарного дня!🍓`,

      notEnoughLessons: (name: string, username: string, phone: string, mail: string, club_packet: string) => `❌ Немає проплачених ❌\n
👉🏽 ${name} (@${username})
${phone}\n
📩 ${mail}
Останній пакет: ${club_packet}`,

      reportToTeacherNewOrder: (title: string, teacher: string, date: string, time: string, count: number, recordedUsers: string) => 
      `${count === 0 ? '✅❌ Вільних місць немає' : '✅ Нова реєстрація'}
🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦\n
Список учасників:
${recordedUsers === '' ? 'поки ще немає(\n' : recordedUsers}
${count === 0 ? '' : `кількість доступних місць: ${count}`}`,

      forAcceptPayment: {
        nonPlus: (name: string, username: string, number: string, date: string) => `💰 Оплата Шпрах-Клуб 💰\n
👉🏽${name} (@${username})
👉🏽${number}
👉🏽Пакет: <b>Шпрах-Клуб</b> (5 занять) - 1400uah\n
Дата створення заявки: ${date}`,

        Plus: (name: string, username: string, number: string, email: string, course: string, date: string) => `💰 Оплата Шпрах-Клуб 💰\n
👉🏽${name} (@${username})
👉🏽${number}
👉🏽Пакет: <b>Шпрах-Клуб+PLUS</b> (5 занять+курс) - 2800uah
👉🏽<b>Пошта</b>: ${email}
👉🏽<b>Дати доступ до курсу</b>: ${course}\n\n
Дата створення заявки: ${date}`,

        Once: (name: string, username: string, number: string, date: string) =>
        `💰 Оплата Шпрах-Клуб 💰\n
👉🏽${name} (@${username})
👉🏽${number}
👉🏽Разове заняття - 300uah\n
Дата створення заявки: ${date}`
      },

      mySpeackingClub: {
        ifTrue: (name: string) => `✅ ${name}}, ви зареєстровані на такі клуби: `,
        ifFalse: (name: string) => `${name}, у вас немає реєстрацій на розмовні клуби😳\n\nхочете зареєструватися?)`
      },

      announcementClub: (title: string, teacher: string, date: string, time: string) => `🔥dehto має новий Шпрах-Клуб🔥 \n
🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
🕒 Чекаємо тебе <b>${date} о ${time}</b> 🇺🇦`
    },


    registrationLesson: {
      paymentRequest: (name: string) => `а хай йому грець..\n${name}, у Вас закінчилися оплачені заняття((
      \n👉🏼 для того, щоб зареєстуватися Ви маєте оплатити пакет занять`,

      acceptedRegistration: (name: string, date: string, time: string, link: string) => `✅ ${name}, Вашу реєстрацію підтвержено!\n
😁 Чекатимемо Вас
${date} о ${time} 🇺🇦 за ось цим посиланням:\n\n${link}\n\n❗️обов’язково підпишіться своїм іменем\n
до зустрічі!
дехто з турботою🍓`
    },
    activePacketCheck: {
      ifAvaibleActivePacket: (name: string, packet: string, pricePerLesson: number) => `У користувача ${name} є активний пакет "${packet}" (${pricePerLesson} uah), додаємо заняття по цьому пакету?`,
      ifChooseActivePacket: `Ну тоді добренько, який пакет оберемо?`,
      noAvaibleActivePacket: (name: string) => `У користувача ${name} немає активного пакету, який оберемо?`
    },  
  },

  studentFind: {
    generalFind: (name: string, id: number, role: string, username: string, phone: string, typeOfLessons: string, teacher: string, count: number, miro: string) => 
    `👉 ${ConvertRole(role)} (ID: ${id})
${name}
(@${username}); ${phone}\n
Тип занять: ${typeOfLessons}
Викладач: ${teacher}
✅ Залишок: ${count / 60} занять (${count}хв)\n
посилання на дошку Miro студента: ${miro}`,

    showTeacher: (name: string, id: number, role: string, username: string, phone: string, countOfStudents: number) =>
    `👉 ${ConvertRole(role)} (ID: ${id})
${name}
(@${username}); ${phone}\n
✅ К-ть студентів: ${countOfStudents}`,

    individualFind: (name: string, id: number, role: string, username: string, phone: string, count: number, miro: string) =>
    `👉 ${ConvertRole(role)} (ID: ${id})
${name}
(@${username}); ${phone}\n
✅ Залишок: ${count / 60} занять (${count}хв)\n
посилання на дошку Miro студента: ${miro}`,

    userFind: (position: number, id: number, name: string, username: string, number: number, role: string, teacher: string, individual_count: number, count: number, miro_link: string, clubPacket: string | boolean) => 
    `${position? `✅${position}\n`: ''}ID: ${id}
Ім'я: ${name}
(@${username})
${number}
Роль: ${ConvertRole(role)}\n
${role !== 'guest'? `👉 Кількість індивід. занять: ${individual_count} (${individual_count * 60}хв)
Викладач: ${teacher}
Лінк на дошку: ${miro_link? `${miro_link}\n` : 'Відсутня\n'}` : ''}
👉 Кількість розм. клубів: ${count} (${clubPacket ? `${ConvertToPrice(clubPacket.toString())}uah` : 'Користувач не брав участі в клубах'})`,

    diffUserFind: (role: string, id: number, name: string, username: string, number: number, teacher: string, individual_count: number, count: number, miro_link: string, clubPacket: string | boolean, countOfStudents?: number) => {
      switch(role){
        case "guest":
          return `👉 Користувач (ID: ${id})\n${name}\n(@${username}); ${number}\n\nТип занять: -`

        case "student":
          return `Ім'я: ${name}
(@${username})
${number}
Роль: Студент\n
👉 Кількість індивід. занять: ${individual_count} (${individual_count * 60}хв)
Викладач: ${teacher}
Лінк на дошку: ${miro_link? `${miro_link}\n` : 'Відсутня\n'}
👉 Кількість розм. клубів: ${count} (${clubPacket ? `${ConvertToPrice(clubPacket.toString())}uah` : 'Користувач не брав участі в клубах'})`

        case "teacher":
          return `👉 Викладач (ID: ${id})\n${name}\n(@${username}); ${number}\n\n${countOfStudents ? "✅" : "❌"} К-ть студентів: ${countOfStudents}`

        case "admin":
          return `👉 Адмін (ID: ${id})\n${name}\n(@${username}); ${number}`

        case "developer":
          return `👉 Розробник\n${name}\n(@${username}); ${number}`

        default:
          throw new Error('\n\nUser role undefined. Can`t continue work while this issue not fixed.')
      }
    },

    checkIndividualCountShowStudent: (name: string, nickname: string, number: number, count: number) =>
    `👉 ${name}\n(@${nickname}); ${number}\n\n${count > 0 ? '✅' : '❌'} Залишок: ${count / 60} занять (${count}хв)`
  },

  operationWithGuest: (name: string, teacher: string, miro_link: string, addToTrial?: boolean) => 
  `✅ користувача ${name} успішно додано ${addToTrial? 'на пробне': ''} до викладача ${teacher}\n\nпосилання на дошку Miro студента: ${miro_link}`,

  liveSupport: {
    userRequest: (name: string, telegram: string, phone: string, dateRequest: string) => `Новий запит на підтримку!\n\nІм'я - ${name} (@${telegram})\nТелефон - ${phone}\n\nДата заявки - ${dateRequest}`,
    userRespond: `Ваш запит прийнято, очікуйте на оператора, а наразі можете задати запитання (одним повідомленням)`
  },

  notification: {
    forStudent: {
      scheduleLesson: (dayOfWeek: string, day: string, month: string, time: string, teacherName: string, miro_link: string, countOfLessons: number) => `📌 Заплановане заняття 📌\n
Коли: ${dayOfWeek}, ${day} ${month} о ${time} за Києвом🇺🇦
Викладач: ${teacherName}\n
посилання на дошку Miro: ${miro_link}\n
${countOfLessons > 0 ? '✅' : '❌'} Залишок: ${countOfLessons / 60} занять (${countOfLessons}хв)`,

      notEnoughCountOfLessons: (name: string) => `🤷‍♂️ Немає оплачених занять 🤷‍♂️\n\n😢 ${name} у вас немає проплачених занять, будемо продовжувати?`,

      rescheduleLesson: (oldDayOfWeek: string, oldDay: string, oldMonth: string, oldTime: string, newDayOfWeek: string, newDay: string, newMonth: string, newTime: string, miro_link: string, count: number) => 
      `♻️️️ Перенесення заняття ♻️\n
👉 заняття з ${oldDayOfWeek} ${oldDay} ${oldMonth} о ${oldTime} перенесено на ${newDayOfWeek}, ${newDay} ${newMonth} о ${newTime} за Києвом 🇺🇦\n\nпосилання на дошку Miro: ${miro_link}\n
✅ Залишок: ${count / 60} занять (${count}хв)`,
      deleteIndividualLesson: (dayOfWeek: string, day: string, month: string, time: string, count: number) =>
      `❌️️ Видалення заняття ❌\n\n👉 заняття в ${dayOfWeek}, ${day} ${month} о ${time} за Києвом 🇺🇦 видалено\n\n✅ Залишок: ${count / 60} занять (${count}хв)`,

      trialLessonByTeacher: (dayOfWeek: string, day: string, month: string, time: string, teacherName: string, miro_link: string) => `📌 Пробне заняття заплановане 📌\n
Коли: ${dayOfWeek}, ${day} ${month} о ${time} за Києвом🇺🇦
Викладач: ${teacherName}\n
👉 посилання на дошку Miro: ${miro_link}`,

      addStudentForTeacher: (nameStudent: string, nameTeacher: string, usernameTeacher: string, numberTeacher: string, miro_link: string, count: number) => 
      `🥳 ${nameStudent}, вітаємо у числі студентів dehto\n
👉 ваш викладач:\n${nameTeacher}
(@${usernameTeacher}); ${numberTeacher}\n
👉 ваше посилання на дошку Miro: ${miro_link}\n
${count > 0 ? '✅' : '❌'} Залишок: ${count / 60} занять (${count}хв)
бот - це ваш особистий кабінет. тут можна переглянути залишок занять, свій розклад, оплатити пакет занять, зареєструватися на розмовні клуби, а також поспілкуватися з підтримкою ;)\n\nпобачимося🍓 `,

      changeCountStudentIndividualLesson: (teacherName: string, teacherUserName: string, teacherNumber: string, miro_link: string, count: number) =>
`📈 Баланс занять змінено 📈\n\n👉 ваш викладач:\n${teacherName}
(@${teacherUserName}); ${teacherNumber}\n
👉 ваше посилання на дошку Miro: ${miro_link}\n
✅ Залишок: ${count / 60} занять (${count}хв)\n
гарного дня 🙌`,

      studentTransfer: (studentName: string, teacherName: string, teacherUserName: string, teacherNumber: string, miro_link: string, count: number) =>
      `🔁 ${studentName}, вас було переведено до іншого викладача\n
👉 ваш викладач:\n${teacherName}
(@${teacherUserName}); ${teacherNumber}\n
👉 ваше посилання на дошку Miro: ${miro_link}\n
✅ Залишок: ${count / 60} занять (${count}хв)\n\nпобачимося🍓 `,

      deleteStudent: (nameTeacher: string) =>
      `🙂 вас було прибрано від викладача ${nameTeacher}\n\nбажаємо вам натхнення та успіхів у вивченні мови!\n\nз любовʼю, команда dehto🍓 `

    },

    forTeachers: {
      addStudentForTeacherForTrialLesson: (name: string, username: string, number: string, miro_link: string) =>
`✅ вам було додано студента для пробного заняття:\n👉 ${name}\n(@${username}); ${number}\n
знайти та назначити пробне заняття можна в розділі “Запланувати пробне заняття” \n
посилання на дошку Miro: ${miro_link}`,

      addStudentForTeacher: (name: string, username: string, number: string, miro_link: string, count: number) => 
      `🥳 вам було додано студента для індивідуальних занять:\n
👉 ${name}\n(@${username}); ${number}\n\nможете писати та планувати подальші індивідуальні заняття ;)\n
посилання на дошку Miro: ${miro_link}\n\n✅ Залишок: ${count / 60} занять (${count}хв)`,

      changeCountStudentIndividualLesson: (studentName: string, studentUserName: string, studentNumber: string, miro_link: string, count: number) =>
      `📈 Баланс занять у студента змінено 📈\n\n👉 ${studentName}\n
(@${studentUserName}); ${studentNumber}\n
посилання на дошку Miro: ${miro_link}\n
${count > 0 ? '✅' : '❌'} Залишок: ${count / 60} занять (${count}хв)`,

      studentTransfer: (studentName: string, studentUserName: string, studentNumber: string, miro_link: string, count: number) =>
      `🔁 до вас було переведено студента для індивідуальних занять:\n
👉 ${studentName}\n(@${studentUserName}); ${studentNumber}\n
можете писати та планувати подальші індивідуальні заняття ;)\n
посилання на дошку Miro: ${miro_link}\n
${count > 0 ? '✅' : '❌'} Залишок: ${count / 60} занять (${count}хв)`,

      deleteStudent: (studentName: string, studentUserName: string, studentNumber: string) =>
      `🙂 у вас було прибрано з індивідуальних занять студента:\n
👉 ${studentName}\n(@${studentUserName}); ${studentNumber}\n
не забудьте написати йому_їй щось приємне;)\n
можете скопіювати: ${studentName}, підтримка повідомила, що Ви не будете продовжувати навчання, проте мені було приємно з Вами працювати!🥹\n\n
Бажаю Вам натхнення та успіхів у вивченні мови!
Вдалого дня🍓`
    },
    
    forAdmins: {
      notEnoughCountOfLessons: (name: string, username: string, number: string, teacherName: string) => `🤷‍♂️ Немає оплачених занять 🤷‍♂️\n\nСтудент: ${name} \n(@${username}); ${number}\nВикладач: ${teacherName}`,

      rescheduleLesson: (studentName: string, username: string, number: string, teacherName: string, day: string, month: string, time: string, reason: string, miro_link: string, count: number) => 
      `♻️️️ Перенесення заняття ♻️\n
Студент: ${studentName}
(@${username}); ${number}
Викладач: ${teacherName}\n
👉 заняття перенесено на субота, ${day} ${month} о ${time} за Києвом 🇺🇦
Причина: ${reason}
посилання на дошку Miro: ${miro_link}\n
✅ Залишок: ${count / 60} занять (${count}хв)`,

      deleteIndividualLesson: (studentName: string, username: string, number: string, teacherName:string, dayOfWeek: string, day: string, month: string, time: string, reason: string, count: number) =>
      `❌️️ Видалення заняття ❌\n
Студент: ${studentName} 
(@${username}); ${number}
Викладач: ${teacherName}\n
👉 заняття в ${dayOfWeek}, ${day} ${month} о ${time} за Києвом 🇺🇦 видалено
Причина: ${reason}\n
✅ Залишок: ${count / 60} занять (${count}хв)`,

      trialLessonByTeacher: (dayOfWeek: string, day: string, month: string, time: string, studentName: string, teacherName: string, miro_link: string) => `📌 Пробне заняття заплановане 📌\n
Коли: ${dayOfWeek}, ${day} ${month} о ${time} за Києвом🇺🇦
Студент: ${studentName}
Викладач: ${teacherName}\n
👉 посилання на дошку Miro: ${miro_link}`
    }
  },

}

export default script;