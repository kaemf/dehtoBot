import init from './init'
import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { UserScriptState } from "../../data/datapoint/point/UserScriptState";
import { ObjectId } from 'mongodb';
type ActionType<T> = (ctx: Context<Update>, user: {[x: string]: string}, additionalData: T) => void;

export default async function arch() {
  const [ bot, db, app, token, clubdb, sheets ] = await init();

  const onContactMessage = (startState: UserScriptState, action: ActionType<{ phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string, voice: string, audio: string, video_circle: string }>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      message = ctx.message;

    console.log(user['state'] + ' show in contactMessage, one repeat');
  
    if (user.state === startState) {
      if ('contact' in message) {
        action(ctx, user, { phone_number: message.contact.phone_number, text: '', photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONCONTACTMESSAGE, TEXT&PHOTO = UNDEFINED, NUMBER: ${message.contact.phone_number}, CODE: 0\n`);
      } 
      else if ('text' in message) {
        action(ctx, user, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET, CODE: 3\n`);
      }
      else if ('sticker' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 9\n`);
      }
    }
    else return next();
  });
  
  const onTextMessage = (startState: UserScriptState, action: ActionType<{ phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string, voice: string, audio: string, video_circle: string }>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      message = ctx.message;
  
    if (user.state === startState) {
      if ('text' in message) {
        action(ctx, user, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\nTYPE: ONTEXTMESSAGE, OTHERDATA = UNDEFINED, TEXT = ${message.text}, CODE: 2\nstate: ${startState}, message: ${message.text}`);
      } 
      else if ('photo' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET, CODE: 3\n`);
      }
      else if ('sticker' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 9\n`);
      }
    }
    else return next();
    console.log(user['name'], '( @', user['username'], ')', '( id:', id, ')', user);
  });
  
  const onPhotoMessage = (startState: UserScriptState, action: ActionType<{ phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string, voice: string, audio: string, video_circle: string }>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      message = ctx.message,
      supportedFormats : string[] = ['.pdf', '.jpeg', '.jpg', '.png', '.heic'];
    
    console.log(user['state'] + ' show in photoMessage, one repeat');
  
    if (user.state === startState) {
      if ('text' in message) {
        action(ctx, user, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        const fileExtension = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toLowerCase() || '';

        if (supportedFormats.includes(fileExtension)){
          action(ctx, user, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET (${fileExtension}), CODE: 3\n`);
        }
        else{
          action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, UNSUPPORTED FILE GET (${fileExtension}), CODE: 3\n`);
        }
      }
      else if ('sticker' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: ''});
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 9\n`);
      }
    }
    else return next();
  });

  const onDocumentationMessage = (startState: UserScriptState, action: ActionType<{ phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string, voice: string, audio: string, video_circle: string }>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      message = ctx.message,
      supportedFormats : string[] = ['.pdf', '.PDF'];
    
    console.log(user['state'] + ' show in docMessage, one repeat');
  
    if (user.state === startState) {
      if ('text' in message) {
        action(ctx, user, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        const fileExtension0 = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toLowerCase() || '';
        const fileExtension1 = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toUpperCase() || '';
        const fileExtension = fileExtension0 + fileExtension1;

        if (supportedFormats.includes(fileExtension0) || supportedFormats.includes(fileExtension1)){
          action(ctx, user, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET (${fileExtension}), CODE: 3\n`);
        }
        else{
          action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, UNSUPPORTED FILE GET (${fileExtension}), CODE: 3\n`);
        }
      }
      else if ('sticker' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: ''});
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 9\n`);
      }
    }
    else return next();
  });

  class DBProcess {
    private clubdb = clubdb.db('SpeakingClub').collection('avaibleLessons');
    private clubdbUsers = clubdb.db('SpeakingClub').collection('dataUsers');

    async ShowAll() {
      return await this.clubdb.find({}).toArray();
    }

    async AddData(data: {title: string, teacher: string, date: string, time: string, count: number, link: string}) {
      await this.clubdb.insertOne(data);
    }

    async DeleteData(id: ObjectId) {
      await this.clubdb.deleteOne({ _id: new ObjectId(id) });
    }

    async ChangeKeyData(id: Object, key: string, value: string | number){
      const updateObject = { $set: {} } as { $set: { [key: string]: string | number } };
      updateObject.$set[key] = value;

      await this.clubdb.updateOne(id, updateObject);
    }

    async ShowData(id: ObjectId) {
      return await this.clubdb.findOne({ _id: new ObjectId(id) });
    }

    async GetObject(id: ObjectId) {
      return this.clubdb.find({ _id: new ObjectId(id) });
    }

    async ShowAllUsers() {
      return await this.clubdbUsers.find({}).toArray();
    }

    async AddUser(data : {id: number, name: string, number: string, username: string, role: string, count: number}) {
      await this.clubdbUsers.insertOne(data);
    }

    async DeleteUser(id: string) {
      await this.clubdbUsers.deleteOne({ id: id });
    }

    async ShowOneUser(id: number) {
      return await this.clubdbUsers.findOne({ id: id });
    }

    async ChangeCountUser(id: ObjectId, newValue: number){
      const updateObject = {$set: {count: newValue}};

      await this.clubdbUsers.updateOne({_id: id}, updateObject);
    }

    async ChangeUserName(id: ObjectId, name: string){
      const updateObject = {$set : {
        name : name
      }}

      await this.clubdbUsers.updateOne({_id: id}, updateObject);
    }

    async UpdateUserData(id: ObjectId, number: string, username: string){
      const updateObject = {$set : {
        number: number,
        username: username
      }}

      await this.clubdbUsers.updateOne({_id: id}, updateObject);
    }

    async WriteNewClubToUser(idUser: number, idClub: ObjectId){
      const user = await this.ShowOneUser(idUser),
        data = user!.recordClubs !== undefined ? user!.recordClubs.toString() : false;

      if (data){
        const dataContain = data.split(',');

        if (data.indexOf(idClub.toString()) === -1){
          dataContain.push(idClub);
  
          const updateObject = {$set : {
            recordClubs: dataContain.join(',')
          }}
  
          await this.clubdbUsers.updateOne({_id: user!._id}, updateObject);
        }
        else return false;
      }
      else{
        const updateObject = {$set : {
          recordClubs: idClub
        }}

        await this.clubdbUsers.updateOne({_id: user?._id}, updateObject);
      }
    }

    async HasThisClubUser(idUser: number, idClub: ObjectId){
      const user = await this.ShowOneUser(idUser),
        data = user && user!.recordClubs !== undefined &&  user!.recordClubs !== null ? user!.recordClubs.toString() : false;

        if (data){
          if (data.indexOf(idClub.toString()) === -1){
            return false;
          }
          else{
            return true;
          }
        }
        else return false;
    }

    async DeleteClubFromUser(idUser: number, idClub: ObjectId){
      const user = await this.ShowOneUser(idUser),
        data = user!.recordClubs !== undefined ? user!.recordClubs.toString().split(',') : false;
      
      if (data){
        const indexInMassive = data.indexOf(idClub.toString());

        if (indexInMassive !== -1){
          data.splice(indexInMassive, 1);

          const updateObject = {$set : {
            recordClubs: data.join(',')
          }}

          await this.clubdbUsers.updateOne({_id: user?._id}, updateObject);
        }
      }
    }

    async SetMailForUser(idUser: number, mail: string){
      const user = await this.ShowOneUser(idUser),
        emailCheck = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      if (emailCheck.test(mail)){
        const updateObject = {$set : {
          email: mail
        }}

        await this.clubdbUsers.updateOne({_id: user?._id}, updateObject); 
        return true;
      }
      else return false;
    }

    async SwitchToCompletTrialLesson(idUser: number, haveTrialLessonClub: string){
      const user = await this.ShowOneUser(idUser);
      
      const updateObject = {$set : {
        haveTrialLessonClub: haveTrialLessonClub
      }}
      
      await this.clubdbUsers.updateOne({_id: user?._id}, updateObject);
    }

    async ChangeUserRole(idUser: number, newRole: string){
      const user = await this.ShowOneUser(idUser);

      if (newRole === 'student' || newRole === 'teacher' || newRole === 'admin'){
        const updateObject = {$set : {
          role: newRole
        }}

        await this.clubdbUsers.updateOne({_id: user?._id}, updateObject);

        return true;
      }
      else return false;
    }

    async CheckActiveOnClub(idUser: number){
      const user = await this.ShowOneUser(idUser);

      if (user!.activeOnClub){
        return true;
      }
      else return false;
    }

    async SetActiveOnClub(idUser: number){
      const user = await this.ShowOneUser(idUser);

      const updateObject = {$set : {
        activeOnClub: 'true'
      }}

      await this.clubdbUsers.updateOne({_id: user?._id}, updateObject);
    }

    async GetTeacherBool(name: string){
      const haveTeacher = await this.clubdbUsers.findOne({ name: name });

      if (haveTeacher){
        return true;
      }
      else return false;
    }

    async GetTeacherNameAndID(name: string, choose: boolean){
      const teacher = await this.clubdbUsers.findOne({ name: name });

      if (choose){
        return [teacher!.name, teacher!.id]
      }
      else return teacher!.id;
    }

    private isTimeExpired(deleteAt: Date): boolean {
      return deleteAt < new Date();
    }

    getDateClub(date: Date): string {
      const daysOfWeek = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
       months = [
        "січня", "лютого", "березня", "квітня", "травня", "червня",
        "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"
      ];
    
      const dayOfWeek = daysOfWeek[date.getUTCDay()];
      const month = months[date.getUTCMonth()];
      const day = date.getUTCDate();
    
      return `${day} ${month} (${dayOfWeek})`;
    }
  
    async DeleteExpiredClubs() {
      const clubs = await this.ShowAll(),
        users = await this.ShowAllUsers();

      for(let i = 0; i < clubs.length; i++){
        if (this.isTimeExpired(new Date(`${clubs[i].date}T${clubs[i].time}`))){
          console.log('\nFounded Expired Club And Deleted\n')
          this.DeleteData(clubs[i]._id);
          for (let j = 0; j < users.length; j++){
            this.DeleteClubFromUser(users[j].id, clubs[i]._id);
          }
        }
      }
    }

    isValidInput(inputStr: string, year: boolean): boolean {
      if (year){
        const regex = /^\d{4}$/;
        return regex.test(inputStr);
      }
      else{
        const regex = /^\d{2}$/;
        return regex.test(inputStr);
      }
    }
  }

  class GoogleSheets{
    private students = '💁🏽‍♀️ Студенти';
    private trials = '✅ Пробні';

    async appendTrial(date: string, name: string, phone: string, nickname: string, title_club: string, teacher: string){
      let data = await sheets.getCell(`${this.trials}!A2`),
        number = 2;
      while (data !== ''){
        number++;
        data = await sheets.getCell(`${this.trials}!A${number}`);
      }

      const numberOfTrial = await sheets.getCell(`${this.trials}!A${number - 1}`) === '№' ? '1' : parseInt(await sheets.getCell(`${this.trials}!A${number - 1}`)) + 1;
      await sheets.updateRow(`${this.trials}!A${number}:I${number}`, [numberOfTrial, date, name, phone, nickname, title_club, teacher]);

      await sheets.setCellStyle(this.trials, `A${number}:A${number}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
      await sheets.setCellStyle(this.trials, `B${number}:B${number}`, 10, false, 'RIGHT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
      await sheets.setCellStyle(this.trials, `C${number}:I${number}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
    }

    async appendLessonToUser(idUser: number, name: string, phone: string, nickname: string, mail: string, date: string, title: string, teacher: string){
      const index = await sheets.findDataInCell(idUser.toString(), this.students),
        row = index?.row === undefined ? '' : index!.row;

      if (row !== ''){
        let currentData = await sheets.getCell(`${this.students}!A${parseInt(row!.toString()) + 3}`),
          position = parseInt(row!.toString()) + 3;

        while (currentData !== ''){
          position++;
          currentData = await sheets.getCell(`${this.students}!A${position}`);
        }

        const toProcessPosition = await sheets.getCell(`${this.students}!A${position - 1}`),
          newIndexPosition = toProcessPosition;

        await sheets.addRowAndShiftDown(0, `A${position}`);
        console.log(currentData.charAt(0));
        await sheets.updateRow(`${this.students}!A${position}:D${position}`, [`${parseInt(newIndexPosition) + 1}`, date, title, teacher]);

        await sheets.setCellStyle(this.students, `A${position}:A${position}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
        await sheets.setCellStyle(this.students, `B${position}:B${position}`, 10, false, 'RIGHT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
        await sheets.setCellStyle(this.students, `C${position}:E${position}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
      }
      else{
        const newIndex = await sheets.getLastValueInColumn();
        let newRow = newIndex?.row === null ? 1 : newIndex!.row;

        await sheets.updateRow(`${this.students}!A${newRow + 2}:E${newRow + 2}`, [idUser, name, phone, nickname, mail]);
        await sheets.updateRow(`${this.students}!A${newRow + 3}:E${newRow + 3}`, ['№:',	'Дата:', 'Тема:', 'Викладач:', 'Оплата:']);
        await sheets.updateRow(`${this.students}!A${newRow + 4}:D${newRow + 4}`, [1, date, title, teacher]);

        await sheets.setCellStyle(this.students, `A${newRow + 2}:A${newRow + 2}`, 13, true, 'RIGHT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
        await sheets.setCellStyle(this.students, `B${newRow + 2}:B${newRow + 2}`, 13, true, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
        await sheets.setCellStyle(this.students, `C${newRow + 2}:D${newRow + 2}`, 10, false, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');
        await sheets.setCellStyle(this.students, `E${newRow + 2}:E${newRow + 2}`, 9, false, 'LEFT', 'MIDDLE', 'SOLID', 'SOLID', 'SOLID', 'SOLID', 'green');

        await sheets.setCellStyle(this.students, `A${newRow + 3}:E${newRow + 3}`, 10, true, 'LEFT', 'MIDDLE', null, 'SOLID', 'SOLID', 'SOLID', 'white');

        await sheets.setCellStyle(this.students, `A${newRow + 4}:A${newRow + 4}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
        await sheets.setCellStyle(this.students, `B${newRow + 4}:B${newRow + 4}`, 10, false, 'RIGHT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
        await sheets.setCellStyle(this.students, `C${newRow + 4}:E${newRow + 4}`, 10, false, 'LEFT', 'MIDDLE', null, 'SOLID', null, 'SOLID', 'white');
      }
    }

    async changeAvaibleLessonStatus(idUser: number, payment: boolean){
      const index = await sheets.findDataInCell(idUser.toString(), this.students),
        rowIndex = index?.row === undefined ? '' : index!.row;

      if (rowIndex !== ''){
        const row = parseInt(rowIndex.toString()) + 1;
        
        if (payment){
          await sheets.setCellStyle(this.students, `A${row}:A${row}`, 13, true, 'RIGHT', 'MIDDLE', null, null, null, null, 'green');
          await sheets.setCellStyle(this.students, `B${row}:B${row}`, 13, true, 'LEFT', 'MIDDLE', null, null, null, null, 'green');
          await sheets.setCellStyle(this.students, `C${row}:D${row}`, 10, false, 'LEFT', 'MIDDLE', null, null, null, null, 'green');
          await sheets.setCellStyle(this.students, `E${row}:E${row}`, 9, false, 'LEFT', 'MIDDLE', null, null, null, null, 'green');
        }
        else{
          await sheets.setCellStyle(this.students, `A${row}:A${row}`, 13, true, 'RIGHT', 'MIDDLE', null, null, null, null, 'red');
          await sheets.setCellStyle(this.students, `B${row}:B${row}`, 13, true, 'LEFT', 'MIDDLE', null, null, null, null, 'red');
          await sheets.setCellStyle(this.students, `C${row}:D${row}`, 10, false, 'LEFT', 'MIDDLE', null, null, null, null, 'red');
          await sheets.setCellStyle(this.students, `E${row}:E${row}`, 9, false, 'LEFT', 'MIDDLE', null, null, null, null, 'red');
        }
      }
    }

    async CheckHaveUser(idUser: number){
      const index = await sheets.findDataInCell(idUser.toString(), this.students),
        rowIndex = index?.row === undefined ? '' : index!.row;

      if (rowIndex !== ''){
        return rowIndex;
      }
      else return false;
    }

    async ChangeUserNameInSheet(idUser: number, name: string){
      const rowAroundChange = await this.CheckHaveUser(idUser);

      if (rowAroundChange){
        await sheets.updateRow(`${this.students}!B${parseInt(rowAroundChange.toString()) + 1}`, [name]);
      }
    }
  }

  const dbProcess : DBProcess = new DBProcess();
  const googleSheets : GoogleSheets = new GoogleSheets()

  return [onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, db, app, token, dbProcess, googleSheets] as const;
}