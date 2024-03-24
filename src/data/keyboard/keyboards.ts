import { devChat, confirmationChat, supportChat, eugeneChat } from "../general/chats";

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

function CheckDeveloper(currentChatId: number){
  return currentChatId === devChatInt ? true : false;
}

class Keyboard{
  mainMenu(currentChatId: number, role: string){
    // if (CheckDeveloper(currentChatId)){
    //   return [
    //     [
    //       {
    //         text: "Індивідуальні заняття"
    //       }
    //     ],[
    //       {
    //         text: "Шпрах-Клуби"
    //       }
    //     ],[
    //       {
    //         text: "Вчитель на годину",
    //       },
    //     ],[
    //       {
    //         text: "Мої Шпрах-клуби"
    //       }  
    //     ],[
    //       {
    //         text: "Адмін Панель"
    //       }
    //     ]
    // ]
    // }
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
          ]
        ]
      }
      else if (checkChats(currentChatId)){
        return [
            [
              {
                text: "Індивідуальні заняття"
              }
            ],[
              {
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Вчитель на годину",
              },
            ],[
              {
                text: "Адмін Панель"
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
            ],[
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

  async speakingClubMenu(){
    return [
      [
        {
          text: "Оплатити заняття"
        },
        {
          text: "Реєстрація на клуб"
        }
      ],[
        {
          text: "Залишок моїх занять"
        },
        {
          text: "Мої Шпрах-клуби"
        }
      ],[
        {
          text: "Про шпрах-клуб"
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
      ],[
        {
          text: "В МЕНЮ"
        }
      ]
    ]
  }

  personalStudentAdminPanel(){
    return [
      [
        {
          text: "Показати всіх користувачів"
        },
        {
          text: "Змінити роль користувача"
        },
      ],[
        {
          text: "Змінити імʼя користувачу"
        },
        {
          text: "Кількість занять студента"
        },
      ],[
        {
          text: "Показати студентів"
        },
        {
          text: "Видалити студента"
        }
      ],[
        {
          text: "Додати заняття студенту"
        },
        {
          text: "Прибрати заняття студенту"
        }
      ],[
        {
          text: "Змінити активний пакет"
        },
        {
          text: "Показати викладачів"
        }
      ],[
        {
          text: "Показати Адмінів та Розробника"
        }
      ],[
        {
          text: "В МЕНЮ"
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
        {
          text: "Студент"
        },
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
              text: "деЗавдання"
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
          text: "Шпрах-Клуб"
        },
        {
          text: "Шпрах-Клуб+PLUS"
        }
      ]
    ]
  }
}

const keyboards : Keyboard = new Keyboard();
export default keyboards;