import { devChat, confirmationChat, supportChat, eugeneChat} from "../../data/datapoint/point/chats";

const devChatInt = parseInt(devChat),
  confirmationChatInt = parseInt(confirmationChat),
  supportChatInt = parseInt(supportChat),
  eugeneChatInt = parseInt(eugeneChat);

function checkChats(currentChatId: number){
  if (currentChatId === devChatInt || currentChatId === confirmationChatInt || currentChatId === supportChatInt || currentChatId === eugeneChatInt){
    return true;
  } 
  else return false;
}

class Keyboard{
  mainMenu(currentChatId: number, role: string){
      if (checkChats(currentChatId)){
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
      else if (role === 'teacher'){
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
              text: "Для Викладача"
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
                text: "Шпрах-Клуби"
              }
            ],[
              {
                text: "Вчитель на годину",
              },
            ],
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

  async speakingClubMenu(line: string){
    if (line === undefined || line === ''){
      return [
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
    else{
      return [
        [
          {
            text: "Реєстрація на клуб"
          },
          {
            text: "Залишок моїх занять"
          },
        ],[
          {
            text: "Оплатити пакет занять"
          },
          {
            text: "Про шпрах-клаб"
          }
        ]
      ]
    }
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
          text: "Показати студентів"
        },
        {
          text: "Оновити дані студенту"
        }
      ],[
        {
          text: "Видалити студента"
        },
        {
          text: "Додати заняття студенту"
        }
      ],[
        {
          text: "Показати викладачів"
        },
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

  indiviualMenu(){
    return [
      [
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
          text: "В МЕНЮ"
        }
      ]
    ]
  }
}

const keyboards : Keyboard = new Keyboard();
export default keyboards;