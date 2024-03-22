import init from './init'
import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { UserScriptState } from "../../data/general/UserScriptState";
import { ObjectId } from 'mongodb';
type ActionType<T> = (ctx: Context<Update>, user: {[x: string]: string}, set: (key: string) => (value: string) => Promise<number>, additionalData: T) => void;

export default async function arch() {
  const [ bot, db, botdb ] = await init();

  const onContactMessage = (startState: UserScriptState, action: ActionType<{ phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string, voice: string, audio: string, video_circle: string }>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      set = db.set(id),
      message = ctx.message;
      
    if (user.state === startState) {
      console.log(user['state']);
      if ('contact' in message) {
        action(ctx, user, set, { phone_number: message.contact.phone_number, text: '', photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONCONTACTMESSAGE, TEXT&PHOTO = UNDEFINED, NUMBER: ${message.contact.phone_number}, CODE: 0\n`);
      } 
      else if ('text' in message) {
        action(ctx, user, set, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET, CODE: 3\n`);
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 9\n`);
      }
    }
    else return next();
  });
  
  const onTextMessage = (startState: UserScriptState, action: ActionType<{ phone_number: string; text: string, photo: string, file: string, stickers: string, video: string, location: number, polls: string, voice: string, audio: string, video_circle: string }>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      set = db.set(id),
      message = ctx.message;
  
    if (user.state === startState) {
      if ('text' in message) {
        action(ctx, user, set, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\nTYPE: ONTEXTMESSAGE, OTHERDATA = UNDEFINED, TEXT = ${message.text}, CODE: 2\nstate: ${startState}, message: ${message.text}`);
      } 
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET, CODE: 3\n`);
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
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
      set = db.set(id),
      supportedFormats : string[] = ['.pdf', '.jpeg', '.jpg', '.png', '.heic'];

    if (user.state === startState) {
      console.log(user['state']);
      if ('text' in message) {
        action(ctx, user, set, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        const fileExtension = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toLowerCase() || '';

        if (supportedFormats.includes(fileExtension)){
          action(ctx, user, set, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET (${fileExtension}), CODE: 3\n`);
        }
        else{
          action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, UNSUPPORTED FILE GET (${fileExtension}), CODE: 3\n`);
        }
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: ''});
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
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
      set = db.set(id),
      supportedFormats : string[] = ['.pdf', '.PDF'];
  
    if (user.state === startState) {
      console.log(user['state']);
      if ('text' in message) {
        action(ctx, user, set, { phone_number: '', text: message.text, photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: message.photo[0].file_id, file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        const fileExtension0 = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toLowerCase() || '';
        const fileExtension1 = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toUpperCase() || '';
        const fileExtension = fileExtension0 + fileExtension1;

        if (supportedFormats.includes(fileExtension0) || supportedFormats.includes(fileExtension1)){
          action(ctx, user, set, { phone_number: '', text: '', photo: '', file: message.document.file_id, stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET (${fileExtension}), CODE: 3\n`);
        }
        else{
          action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, UNSUPPORTED FILE GET (${fileExtension}), CODE: 3\n`);
        }
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: message.sticker.file_id, video: '', location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video: message.video.file_id, location: -1, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: message.location.longitude, polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: message.poll.question, voice: '', audio: '', video_circle: ''});
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: '', text: '', photo: '', file: '', stickers: '', video:'', location: -1, polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 9\n`);
      }
    }
    else return next();
  });

  class DBProcess {
    private clubdbLessons = botdb.db('dehtoBDB').collection('clubLessons');
    private botdbUsers = botdb.db('dehtoBDB').collection('dataUsers');
    private deTaskDB = botdb.db('dehtoBDB').collection('deTask');

    async ShowAll() {
      return await this.clubdbLessons.find({}).toArray();
    }

    async AddData(data: {title: string, teacher: string, date: string, time: string, count: number, link: string}) {
      return await this.clubdbLessons.insertOne(data);
    }

    async DeleteData(id: ObjectId) {
      await this.clubdbLessons.deleteOne({ _id: new ObjectId(id) });
    }

    async ChangeKeyData(id: Object, key: string, value: string | number){
      const updateObject = { $set: {} } as { $set: { [key: string]: string | number } };
      updateObject.$set[key] = value;

      await this.clubdbLessons.updateOne(id, updateObject);
    }

    async ShowData(id: ObjectId) {
      return await this.clubdbLessons.findOne({ _id: new ObjectId(id) });
    }

    async GetObject(id: ObjectId) {
      return this.clubdbLessons.find({ _id: new ObjectId(id) });
    }

    async ShowAllUsers() {
      return await this.botdbUsers.find({}).toArray();
    }

    async AddUser(data : {id: number, name: string, number: string, username: string, role: string, count: number}) {
      await this.botdbUsers.insertOne(data);
    }

    async DeleteUser(id: string) {
      await this.botdbUsers.deleteOne({ id: id });
    }

    async ShowOneUser(id: number) {
      return await this.botdbUsers.findOne({ id: id });
    }

    async ChangeCountUser(id: ObjectId, newValue: number){
      const updateObject = {$set: {count: newValue}};

      await this.botdbUsers.updateOne({_id: id}, updateObject);
    }

    async ChangeUserName(id: ObjectId, name: string){
      const updateObject = {$set : {
        name : name
      }}

      await this.botdbUsers.updateOne({_id: id}, updateObject);
    }

    async UpdateUserData(id: ObjectId, number: string, username: string){
      const updateObject = {$set : {
        number: number,
        username: username
      }}

      await this.botdbUsers.updateOne({_id: id}, updateObject);
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
  
          await this.botdbUsers.updateOne({_id: user!._id}, updateObject);
        }
        else return false;
      }
      else{
        const updateObject = {$set : {
          recordClubs: idClub
        }}

        await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
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

          await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
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

        await this.botdbUsers.updateOne({_id: user?._id}, updateObject); 
        return true;
      }
      else return false;
    }

    async SwitchToCompletTrialLesson(idUser: number, haveTrialLessonClub: string){
      const user = await this.ShowOneUser(idUser);
      
      const updateObject = {$set : {
        haveTrialLessonClub: haveTrialLessonClub
      }}
      
      await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
    }

    async ChangeUserRole(idUser: number, newRole: string){
      const user = await this.ShowOneUser(idUser);

      if (newRole === 'student' || newRole === 'teacher' || newRole === 'admin'){
        const updateObject = {$set : {
          role: newRole
        }}

        await this.botdbUsers.updateOne({_id: user?._id}, updateObject);

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

      await this.botdbUsers.updateOne({_id: user?._id}, updateObject);
    }

    async GetTeacherBool(name: string){
      const haveTeacher = await this.botdbUsers.findOne({ name: name });

      if (haveTeacher){
        return true;
      }
      else return false;
    }

    async GetTeacherNameAndID(name: string, choose: boolean){
      const teacher = await this.botdbUsers.findOne({ name: name });

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

    async getUserActiveClubs(idUser: number){
      const user = await this.ShowOneUser(idUser),
        data = user!.recordClubs !== undefined ? user!.recordClubs.toString() : false;

      return data ? data.split(',') : false;
    }

    async GetTeacherStudents(id: number){
      const teacher = await this.ShowOneUser(id);

      return teacher!.my_students;
    }

    async WriteNewDeTask(idTeacher: number, idStudent: number, content: string, files: string[], typeOfFiles: string[]){
      let tasksIDsForStudent: ObjectId[],
        tasksIDsForTeacher: ObjectId[];
      const student = await this.ShowOneUser(idStudent),
        teacher = await this.ShowOneUser(idTeacher),
        document = await this.deTaskDB.insertOne({
        idTeacher: idTeacher,
        idStudent: idStudent,
        content: content,
        files: files,
        typeOfFiles: typeOfFiles,
        answer: false,
        answerFiles: false,
        answerTypeOfFiles: false
      })

      if (student && student.detasks){
        tasksIDsForStudent = student.detasks;
        tasksIDsForStudent.push(document.insertedId);
      }
      else tasksIDsForStudent = [ document.insertedId ];

      if (teacher && teacher.set_detasks){
        tasksIDsForTeacher = teacher.set_detasks;
        tasksIDsForTeacher.push(document.insertedId);
      }
      else tasksIDsForTeacher = [ document.insertedId ];

      await this.botdbUsers.updateOne({id: idStudent}, {$set : {detasks: tasksIDsForStudent}})
      await this.botdbUsers.updateOne({id: idTeacher}, {$set : {set_detasks: tasksIDsForTeacher}})
    }
  }

  const dbProcess : DBProcess = new DBProcess();

  return [onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, db, dbProcess] as const;
}