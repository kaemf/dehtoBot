import { devChat, confirmationChat, supportChat, eugeneChat } from "../general/chats";
import script from "../general/script";

const devChatInt = parseInt(devChat),
  confirmationChatInt = parseInt(confirmationChat),
  supportChatInt = parseInt(supportChat),
  eugeneChatInt = parseInt(eugeneChat);

export function checkChats(currentChatId: number){
  if (currentChatId === devChatInt || currentChatId === confirmationChatInt || currentChatId === supportChatInt || currentChatId === eugeneChatInt){
    return true;
  } 
  else return false;
}

export function CheckDeveloper(currentChatId: number){
  return currentChatId === devChatInt;
}

class Keyboard{
  mainMenu(currentChatId: number, role: string){
    if (role === 'teacher'){
      return [
        [
          {
            text: "Мої індивідуальні заняття"
          }
        ],[
          {
            text: "деЗавдання"
          }
        ],[
          {
            text: "Мої розмовні клуби"
          }
        ]
      ]
    }
    else if (role === 'student'){
        return [
          [
            {
              text: "Мої індивідуальні заняття"
            }
          ],[
            {
              text: "Розмовні клуби"
            }
          ],[
            {
              text: "Моя служба турботи"
            }
          ],
          // [
          //   {
          //     text: "Літній кемп"
          //   }
          // ]
        ]
    }
    else if (checkChats(currentChatId)){
      return [
        [
          {
            text: "Користувачі"
          }
        ],[
          {
            text: "Індивідуальні заняття"
          }
        ],[
          {
            text: "Розмовні клуби"
          },
        ],[
          {
            text: "Відправити сповіщення"
          }
        ]
      ]
    }
    else{
      return [
        [
          {
            text: "Індивідуальні заняття"
          }
        ],[
          {
            text: "Розмовні клуби"
          }
        ],
        // [
        //   {
        //     text: "Літній кемп"
        //   }
        // ],
        [
          {
            text: "Вчитель на годину",
          }
        ],
        [
          {
            text: "Служба турботи"
          }
        ]
      ]
    }
  }

  toMenu(){
    return [
      [
        {
          text: "В МЕНЮ"
        }
      ]
    ]
  }

  coursesTeacherOnHour(){
      return [
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
      ]
  } 

  chooseLevelCourses(){
      return [
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
      ]
  }

  async speakingClubMenu(role: string){
    return role === 'admin' || role === 'developer'
    ?
    [
      [
        {
          text: "Клуби"
        },
        {
          text: "Особові справи"
        }
      ]
    ]
    :
    [
      [
        {
          text: "Реєстрація на клуб"
        },
        {
          text: "Баланс моїх занять"
        }
      ],[
        {
          text: "Мої реєстрації"
        },
        {
          text: "Про розмовні клуби"
        }
      ]
    ]
  }

  speakingClubStartAdminMenu(){
    return [
      [
        {
          text: "Клуби"
        },
        {
          text: "Особові справи"
        }
      ]
    ]
  }

  spekingClubAdminPanel(){
    return [
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
    ]
  }

  personalStudentAdminPanel(){
    return [
      [
        {
          text: "Знайти користувача за даними"
        },
        {
          text: "Показати усіх користувачів"
        },
      ]
    ]
  }

  usersOperationInTheClub(){
    return [
      [
        {
          text: "Редагувати заняття"
        }
      ],[
        {
          text: "Змінити активний пакет"
        }
      ]
    ]
  }

  adminPanelChangeClub(){
    return [
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
      ],[
        {
          text: "Документація"
        }
      ]
    ]
  }

  roleChange(){
    return [
      [
        // {
        //   text: "Студент"
        // },
        {
          text: "Викладач"
        }
      ],[
        {
          text: "Адмін"
        }
      ]
    ]
  }

  indiviualMenu(role: string){
    switch (role){
      case "admin":
        return [
          [
            {
              text: "Знайти студента"
            }
          ],[
            {
              text: "Наші викладачі"
            }
          ],[
            {
              text: "Показати усіх наших студентів"
            }
          ]
        ]

      case "developer":
        return [
          [
            {
              text: "Знайти студента"
            }
          ],[
            {
              text: "Наші викладачі"
            }
          ],[
            {
              text: "Показати усіх наших студентів"
            }
          ]
        ]

      case "teacher":
        return [
          [
            {
              text: "Мій розклад"
            }
          ],[
            {
              text: "Мої студенти"
            }
          ]
        ]

      case "student":
        return [
          [
            {
              text: "Баланс моїх занять"
            }
          ],[
            {
              text: "Мої деЗавдання"
            }
          ],[
            {
              text: "Мій розклад"
            }
          ],[
            {
              text: "Оплата занять"
            }
          ]
        ]

      default:
        return [
          [
            {
              text: "Пробне заняття"
            }
          ]
        ]
    }
  }

  yesNo(upper?: boolean){
    return upper
    ?
    [
      [
        {
          text: "Так"
        },
        {
          text: "Ні"
        }
      ]
    ]
    :
    [
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

  payPacketLessons(){
    return [
      [
        {
          text: "Разове заняття"
        }
      ],
      [
        {
          text: "Шпрах клуб"
        }
      ],
      [
        {
          text: "Шпрах клуб плюс"
        }
      ]
    ]
  }

  payPacketLessonsClub(){
    return [
      [
        { text: "Разове заняття (300uah)" }
      ],[
        { text: "Пакет занять (280uah)" }
      ]
    ]
  }

  deTaskMenu(end?: string){
    return end === 'have_task'
    ?
    [
      [
        {
          text: "Дати інше деЗавдання"
        }
      ],
      [
        {
          text: "В МЕНЮ"
        }
      ]
    ]
    :
    (end === 'not_have_task'
    ?
    [
      [
        {
          text: "Дати деЗавдання"
        }
      ],
      [
        {
          text: "В МЕНЮ"
        }
      ]
    ]
    :
    [
      [
        {
          text: "Дати деЗавдання"
        }
      ],
      [
        {
          text: "Перевірити деЗавдання"
        }
      ]
    ]
    )
  }
  
  individualFindUser(){
    return [
      [
        {
          text: "Редагувати кількість занять"
        }
      ],[
        {
          text: "Редагувати лінк"
        }
      ],[
        {
          text: "Перевести до іншого викладача"
        }
      ],[
        {
          text: "Видалити студента"
        }
      ]
    ]
  }

  ourTeachersMenu(){
    return [
      [
        {
          text: "Переглянути розклад викладача"
        }
      ],[
        {
          text: "Показати усіх студентів викладача"
        }
      ],[
        {
          text: "Видалити викладача"
        }
      ]
    ]
  }

  usersMenu(){
    return [
      [
        {
          text: "Знайти користувача за даними"
        }
      ],[
        {
          text: "Показати усіх користувачів"
        }
      ]
    ]
  }

  usersOperations(role: string){
    return role === 'guest'
    ?
    [
      [
        {
          text: "Змінити роль користувачу"
        }
      ],[
        {
          text: "Змінити ім’я користувачу"
        }
      ],[
        {
          text: "Додати на пробне"
        }
      ],[
        {
          text: "Додати викладачеві"
        }
      ]
    ]
    :
    [
      [
        {
          text: "Змінити ім’я користувачу"
        }
      ]
    ]
  }

  notificationSenders(){
    return [
      [
        {
          text: "Усім користувачам"
        }
      ],[
        {
          text: "Лише викладачам"
        }
      ],[
        {
          text: "Лише студентам"
        }
      ],[
        {
          text: "Відправити конкретному юзеру"
        }
      ]
    ]
  }

  myScheduleTeacher(){
    return [
      [
        {
          text: "Запланувати заняття"
        }
      ],[
        {
          text: "Перенести заняття"
        }
      ],[
        {
          text: "Видалити заняття"
        }
      ],[
        {
          text: "Запланувати пробне заняття"
        }
      ]
    ]
  }

  durationChoose(){
    return [
      [
        {
          text: "60хв"
        },
        {
          text: "90хв"
        }
      ],[
        {
          text: "30хв"
        }
      ]
    ]
  }

  liveSupportProbablyCancel(){
    return [
      [
        {
          text: "ВІДМІНА"
        }
      ]
    ]
  }

  choosePacket(){
    return [
      [
        {
          text: "🔵 Мінімальний: 6 занять",
        }
      ],[
        {
          text: "🟢 Популярний: 12 занять",
        }
      ],[
        {
          text: "🟡 Вигідний: 24 занять",
        }
      ]
    ]
  }

  checkCorrectCollectedDataWhileAddingClub(){
    return [
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
      ],[
        {
          text: "Документація"
        }
      ],[
        { text: "Все спочатку" }
      ]
    ]
  }

  deTaskTeacherFirstAttempt(){
    return [
      [
        { text: "Обрати студента" }
      ]
    ]
  }

  deTaskStudentFinishAttempt(){
    return [
      [
        {text: "Відправити"}
      ]
    ]
  }

  campLevelChoose(){
    return [
      [
        { text: "A1.1" }
      ],
      [
        { text: "A1.2" }
      ],
      [
        { text: "A2.1" }
      ],
      [
        { text: "A2.2" }
      ],
      [
        { text: "B1.1" }
      ],
      [
        { text: "B1.2" }
      ],
      [
        { text: "B2.1" }
      ],
      [
        { text: "B2.2" }
      ],
    ]
  }

  teacherOnHourAdditionalQuestionsYesNo(){
    return [
      [
        {
          text: script.teacherOnHour.additionalQuestions.yes,
        },
        {
          text: script.teacherOnHour.additionalQuestions.no,
        }
      ],
    ]
  }

  sharePhoneKeyboard(){
    return [
      [
        {
          text: script.entire.shareYourPhone,
          request_contact: true,
        }
      ]
    ]
  }
}

const keyboards : Keyboard = new Keyboard();
export default keyboards;