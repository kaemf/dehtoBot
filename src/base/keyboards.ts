import { devChat, confirmationChat, supportChat } from "../data/chats";
import arch from "./architecture";
// type DBProcess = () => Promise<any>;

const devChatInt = parseInt(devChat),
    confirmationChatInt = parseInt(confirmationChat),
    supportChatInt = parseInt(supportChat);

function checkChats(currentChatId: number){
    if (currentChatId === devChatInt || currentChatId === confirmationChatInt || currentChatId === supportChatInt){
        return true;
    } 
    else return false;
}

export class keyboards{
    private dbProcess: any;
  
    async initialize() {
      [, , , , , , , this.dbProcess] = await arch();
    }

    mainMenu(currentChatId: number){
        if (checkChats(currentChatId)){
            return [
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
        else{
            return [
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

    async speakingClubMenu(currentChatId: number){
        const user = await this.dbProcess.ShowOneUser(currentChatId),
            line = user!.haveTrialLessonClub;

        if (line === undefined || line === ''){
            
        }
    } 
}