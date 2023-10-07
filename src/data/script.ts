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
      pollsException: `опа... а це що...\n\nвибачте, але голосувати тут не тре, просто напишіть, те що ми запитували`
    }
  },

  entire: {
    greeting : 'привіт! я - бот мовної школи dehto. підкажіть, як до Вас можна звертатися?☺️',
    niceNameAndGetPhone: (name: string) => `${name}! яке прекрасне ім’я🥹\n
будь-ласка, залиште номер телефону, щоб підтримці було легше з Вами звʼязатися🫶🏽`,
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
    whatsTheProblem:
    "окей, дякуємо! підкажіть, будь ласка, з чим у Вас виникли труднощі?",
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
    mail: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    level: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    time: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    day: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    date_report: string | string[] | ParsedQs | ParsedQs[] | undefined, 
    time_report: string | string[] | ParsedQs | ParsedQs[] | undefined) => `📩 Заявка на сайті 📩

<b>Імʼя:</b> ${name}
<b>Телефон:</b> ${phone_number}
<b>Нік в Telegram:</b> ${tg_nickname}
<b>Email:</b> ${mail}

👉🏽 Рівень: ${level}
👉🏽 Час: ${time}
👉🏽 День: ${day}

<b>Дата заявки:</b> ${date_report}
<b>Час заявки:</b> ${time_report}`
}

export default script;