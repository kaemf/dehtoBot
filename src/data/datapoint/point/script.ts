import { ParsedQs } from 'qs';

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

    chooseFunction: `чудно!)\n
а тепер оберіть функцію, якою хотіли б скористатися🤗`
  },

  payInvidualLesson: {
    chooseLevelCourse: `дякуємо, що обрали dehto🌱
оберіть свій рівень`,

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
    `💰 Оплата занять 💰

👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Пакет</b>: ${choosedPacket}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },
  
  teacherOnHour: {
    greeting:
    "вітаю! я - ваш особистий вчитель на годину з dehto. підкажи, як до Вас звертатися?☺️",

    whatALovelyName: (name: string) => 
    `${name}! яке прекрасне ім’я🥹 залиште номер телефону, щоб вчитель dehto зв\'язався із Вами`,

    whatsTheProblem: "окей, дякуємо! підкажіть, будь ласка, з чим у Вас виникли труднощі?",

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
    `✅ Вчитель на годину ✅ 
        
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Курс</b>: ${course}
👉🏽<b>Лекція</b>: ${lecture}
👉🏽<b>Додаткові питання</b>: ${question}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },

  trialLesson: {
    niceWhatATime: `супер!\n
який у Вас графік та коли було б зручно провести пробне заняття?🤩`,

    levelLanguageRequest: `напишіть, будь ласка, яким, приблизно, рівнем мови Ви володієте?`,

    thanksAndGetQuestion: (name: string) => `дякуємо, ${name}!🌱\n
чи є у Вас ще щось, що нам варто було б знати?`,

    thanksPartTwo: (graphic: string) => `чудно!)\n
👉🏽 отож, пробне заняття краще провести: ${graphic}\n
скоро з Вами звʼяжеться підтримка для узгодження деталей та сам викладач😎

гарного дня!🌱`,

    question: 'напишіть, будь ласка🤝🏽',

    report: (name: string, username: string, phone_number: string, graphic: string, languagelevel: string, addquestion: string, date: string) => 
    `🍓 Пробний урок 🍓 
    
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Зручний час проведення</b>: ${graphic}
👉🏽<b>Рівень володіння мовою</b>: ${languagelevel}
👉🏽<b>Додаткові питання</b>: ${addquestion}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },

  registrationLesson: {
    niceWhatATime: `супер!\n
який у Вас графік? в які дні та години Вам зручно займатися?🤩`,

    levelLanguageRequest: `напишіть, будь ласка, яким, приблизно, рівнем мови Ви володієте?`,

    thanks: (name: string, graphic: string) => `дякуємо, ${name}!🌱 \n
👉🏽 отже, стосовно графіка:  ${graphic}

якщо у Вас є додаткові побажання - напишіть їх, якщо немає - напишіть «немає»🤗`,

    end: `супер!

скоро з Вами звʼяжеться підтримка для узгодження деталей та сам викладач😎

гарного дня!🌱`,

    report: (name: string, username: string, phone_number: string, graphic: string, languagelevel: string, addquestion: string, date: string) =>
    `📆 Запис на заняття 📆 
  
👉🏽${name} (@${username})
👉🏽${phone_number}
👉🏽<b>Зручний час проведення</b>: ${graphic}
👉🏽<b>Рівень володіння мовою</b>: ${languagelevel}
👉🏽<b>Додаткові питання</b>: ${addquestion}
👉🏽<b>Дата створення заявки</b>: ${date}`
  },

  about: (version: string) => `
Бот школи німецької <b>dehto</b>

Версія: <b>${version}</b>

Розробник: <b>TheLaidSon</b>

Telegram: <b>@XCoooREOCTa</b>
Instagram: <b><a href="https://www.instagram.com/watthatt/">@watthatt</a></b>
  `,
  apiReport: (name: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    phone_number: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    tg_nickname: string | string[] | ParsedQs | ParsedQs[] | undefined,
    level: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    time: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    day: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    date_report: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    time_report: string | string[] | ParsedQs | ParsedQs[] | undefined) => `📩 Заявка на сайті 📩

<b>Імʼя:</b> ${name}
<b>Телефон:</b> ${phone_number}
<b>Telegram:</b> ${tg_nickname}

👉🏽 Рівень: ${level}
👉🏽 Час: ${time}
👉🏽 День: ${day}

<b>Дата заявки:</b> ${date_report}
<b>Час заявки:</b> ${time_report}`,

    speakingClub: {
      entire: `Виберіть кнопку:`,

      about: `дякуємо, що цікавишся нашими шпрах-клубами🥹\n\nза ось цим посиланням ти можеш переглянути коротеньке відео про те, як вони у нас влаштовані та про правила поводження на клубі: (скоро тут буде відео про те, як влаштований наш клаб - а поки можете глянути свої улюблені відосики на YouTube;)) https://www.youtube.com/\n\nчекатимемо тебе на шпрах-клубах dehto!\nцьом♥️`,

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
Разова оплата додаткового заняття.

👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.\n
скрін про оплату надішліть сюди😌`,

        ifNo: `тоді гарного дня!🌱`,

        ifYes: `супер)\n\nобери тему, яка найбільше цікавить тебе із доступного списку нижче!`

      },

      defaultDecline: `тоді гарного дня!🌱`,

      lessLessons: (count: number) => {
        if (count > 0){
          return `Ваш залишок занять: ${count} заняття☺️`
        }
        else{
          return `У Вас немає проплачених занять😳\nбажаєте придбати?)`
        }
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

      standartClub: `чудно!

😉 Ви обрали пакет “Шпрах-Клуб”
👉🏽 до сплати 1500 uah\n

👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.

👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.\n
    
скрін про оплату надішліть сюди😌`,

      plusClub: `чудно!

😉 Ви обрали пакет “Шпрах-Клуб+PLUS”
👉🏽 до сплати 2800 uah\n

👉🏽🧾 Одержувач
ФОП Молоков Євгеній Альбертович
IBAN 
UA773220010000026004330103247
ЄДРПОУ 3706201794
Призначення платежу:
Разова оплата додаткового заняття.

👉🏽💳 або ж на реквізити банківської карти:
    4035200042356078 Молоков Є.А.\n
    
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
найближчим часом із Вами звʼяжеться служба турботи - повідомить про стан оплати та дасть доступ до курсу ${course})

якщо є питання - звертайтеся сюди:
+380 97 577 20 93
@dehto_school

гарного дня!🍓`,

    report: {
      showClub: (position: number, title: string, teacher: string, date: string, time: string, addString: string) => `✅${position}
🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦\n
${addString}`,

      showClubTypeAdmin: (position: number, title: string, teacher: string, date: string, time: string, addString: string, recordedUsers: string) => `✅${position}
🗣 ШПРАХ-КЛУБ
👉🏼 <b>Тема</b>: ${title}
👉🏼 <b>Викладач</b>: ${teacher}\n
👉🏼 <b>Коли</b>: ${date}
👉🏼 <b>На котру</b>: ${time} 🇺🇦
${recordedUsers}
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

      showUser: (position: number, name: string, id: number, username: string, phone_number: string, count: number, role: string) => `✅${position}
ID: ${id}
Ім'я: ${name}
Telegram: @${username}
Номер телефону: ${phone_number}
Користувач є: ${role}
Кількість доступних занять: ${count > 0 ? count : '❌'}`,

      checkClub: (title: string, teacher: string, date: string, time: string, link: string, count: number) => `🗣 ШПРАХ-КЛУБ
👉🏼 Тема: ${title}
👉🏼 Викладач: ${teacher}\n
👉🏼 Коли: ${date}
👉🏼 На котру: ${time} 🇺🇦\n
${count > 0 ? `кількість доступних місць: ${count}` : `❌ немає вільних місць ❌`}\n
Посилання:
${link}`,

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
👉🏽Пакет: <b>Шпрах-Клуб</b> (5 занять) - 1500uah\n
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
      }
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
      
  },

}

export default script;