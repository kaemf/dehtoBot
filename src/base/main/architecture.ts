import init from './init'
import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";
import { UserScriptState } from "../../data/general/UserScriptState";
import Operation from '../../data/general/operation';
import dbProcess from './dbProcess';
type ActionType<T> = (ctx: Context<Update>, user: {[x: string]: string}, set: (key: string) => (value: string) => Promise<number>, additionalData: T) => void;

export default async function arch() {
  const [ bot, bot_notif, token_notif, db, botdb ] = await init(),
    DBProcess = await dbProcess(botdb);

  const onContactMessage = (startState: UserScriptState, action: ActionType<Operation>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      set = db.set(id),
      message = ctx.message;
      
    if (user.state === startState) {
      console.log(user['state']);
      if ('contact' in message) {
        action(ctx, user, set, { phone_number: [ message.contact.phone_number, message.contact.first_name ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONCONTACTMESSAGE, TEXT&PHOTO = UNDEFINED, NUMBER: ${message.contact.phone_number}, CODE: 0\n`);
      } 
      else if ('text' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: message.text, photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      } 
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ message.photo[0].file_id, message?.caption ?? '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ message.document.file_id, message?.caption ?? '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET, CODE: 3\n`);
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: message.sticker.file_id, video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ message.video.file_id, message?.caption ?? '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ message.location.latitude, message.location.longitude ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: message.poll.question, voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, AUDIO GET, CODE: 9\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 10\n`);
      }
      console.log(message);
    }
    else return next();
  });
  
  const onTextMessage = (startState: UserScriptState, action: ActionType<Operation>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      set = db.set(id),
      message = ctx.message;
  
    if (user.state === startState) {
      if ('text' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: message.text, photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\nTYPE: ONTEXTMESSAGE, OTHERDATA = UNDEFINED, TEXT = ${message.text}, CODE: 1\nstate: ${startState}, message: ${message.text}`);
      }
      else if ('contact' in message){
        action(ctx, user, set, { phone_number: [ message.contact.phone_number, message.contact.first_name ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\nTYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, NUMBER GET = ${message.contact.phone_number} by ${message.contact.first_name}, CODE: 0\nstate: ${startState}, message: ${message.contact.phone_number}`);
      }
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ message.photo[0].file_id, message?.caption ?? '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ message.document.file_id, message?.caption ?? ''], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET, CODE: 3\n`);
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: message.sticker.file_id, video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ message.video.file_id, message?.caption ?? '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONTEXTMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ message.location.latitude, message.location.longitude ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: message.poll.question, voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, AUDIO GET, CODE: 9\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 10\n`);
      }
    }
    else return next();
    console.log(user['name'], '( @', user['username'], ')', '( id:', id, ')', user);
  });
  
  const onPhotoMessage = (startState: UserScriptState, action: ActionType<Operation>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      message = ctx.message,
      set = db.set(id),
      supportedFormats : string[] = ['.pdf', '.jpeg', '.jpg', '.png', '.heic'];

    if (user.state === startState) {
      console.log(user['state']);
      if ('text' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: message.text, photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      }
      else if ('contact' in message){
        action(ctx, user, set, { phone_number: [ message.contact.phone_number, message.contact.first_name ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\nTYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, NUMBER GET = ${message.contact.phone_number} by ${message.contact.first_name}, CODE: 2\nstate: ${startState}, message: ${message.contact.phone_number}`);
      }
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ message.photo[message.photo.length - 1].file_id, message?.caption ?? '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        const fileExtension = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toLowerCase() || '';

        if (supportedFormats.includes(fileExtension)){
          action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ message.document.file_id, message?.caption ?? '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET (${fileExtension}), CODE: 3\n`);
        }
        else{
          action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, UNSUPPORTED FILE GET (${fileExtension}), CODE: 3\n`);
        }
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: message.sticker.file_id, video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ message.video.file_id, message?.caption ?? '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ message.location.latitude, message.location.longitude ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: message.poll.question, voice: '', audio: '', video_circle: ''});
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, AUDIO GET, CODE: 9\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 10\n`);
      }
    }
    else return next();
  });

  const onDocumentationMessage = (startState: UserScriptState, action: ActionType<Operation>) => 
  bot.on('message', async (ctx, next) => {
    const id = ctx.chat.id,
      user = (await db.getAll(id)()),
      message = ctx.message,
      set = db.set(id),
      supportedFormats : string[] = ['.pdf', '.PDF'];
  
    if (user.state === startState) {
      console.log(user['state']);
      if ('text' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: message.text, photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&PHOTO = UNDEFINED, TEXT: ${message.text}, CODE: 1\n`);
      }
      else if ('contact' in message){
        action(ctx, user, set, { phone_number: [ message.contact.phone_number, message.contact.first_name ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\nTYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, NUMBER GET = ${message.contact.phone_number} by ${message.contact.first_name}, CODE: 0\nstate: ${startState}, message: ${message.contact.phone_number}`);
      }
      else if ('photo' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ message.photo[0].file_id, message?.caption ?? '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, PHOTO GET, CODE: 2\n`);
      }
      else if ('document' in message) {
        const fileExtension0 = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toLowerCase() || '';
        const fileExtension1 = message.document.file_name!.substr(message.document.file_name!.lastIndexOf('.')).toUpperCase() || '';
        const fileExtension = fileExtension0 + fileExtension1;

        if (supportedFormats.includes(fileExtension0) || supportedFormats.includes(fileExtension1)){
          action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ message.document.file_id, message?.caption ?? '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, FILE GET (${fileExtension}), CODE: 3\n`);
        }
        else{
          action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
          console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, UNSUPPORTED FILE GET (${fileExtension}), CODE: 3_1\n`);
        }
      }
      else if ('sticker' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: message.sticker.file_id, video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, STICKER GET, CODE: 4\n`);
      }
      else if ('video' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ message.video.file_id, message?.caption ?? '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`(!)TYPE: ONPHOTOMESSAGE, NUMBER&TEXT = UNDEFINED, VIDEO GET, CODE: 5\n`);
      }
      else if ('location' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ message.location.latitude, message.location.longitude ], polls: '', voice: '', audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, LOCATION GET, CODE: 6\n`);
      }
      else if ('poll' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: message.poll.question, voice: '', audio: '', video_circle: ''});
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, POLL GET, CODE: 7\n`);
      }
      else if ('voice' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: message.voice.file_id, audio: '', video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, VOICE GET, CODE: 8\n`);
      }
      else if ('audio' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: message.audio.file_id, video_circle: '' });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, AUDIO GET, CODE: 9\n`);
      }
      else if ('video_note' in message) {
        action(ctx, user, set, { phone_number: [ '' ], text: '', photo: [ '' ], file: [ '' ], stickers: '', video: [ '' ], location: [ -1 ], polls: '', voice: '', audio: '', video_circle: message.video_note.file_id });
        console.log(`\n(!)TYPE: ONCONTACTMESSAGE, NUMBER&TEXT = UNDEFINED, CIRCLE VIDEO GET, CODE: 10\n`);
      }
    }
    else return next();
  });

  return [onTextMessage, onContactMessage, onPhotoMessage, onDocumentationMessage, bot, bot_notif, token_notif, db, DBProcess] as const;
}