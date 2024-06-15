import Context from "telegraf/typings/context";
import { Update } from "telegraf/typings/core/types/typegram";
import { Telegraf } from "telegraf/typings/telegraf";
import { confirmationChat, devChat, eugeneChat, supportChat } from "../general/chats";

export default async function NotificationReg(ctx: Context<Update>, token: string, file: string){
    return { url: `https://api.telegram.org/file/bot${token}/${(await ctx.telegram.getFile(file)).file_path}` };
}

export function SendNotification(notifbot: Telegraf<Context<Update>>, message: string, debug?: boolean){
    if (debug){
        notifbot.telegram.sendMessage(devChat, message, {parse_mode: "HTML"});    
    }
    else{
        notifbot.telegram.sendMessage(devChat, message, {parse_mode: "HTML"});
    
        notifbot.telegram.sendMessage(confirmationChat, message, {parse_mode: "HTML"});
    
        notifbot.telegram.sendMessage(supportChat, message, {parse_mode: "HTML"});
    
        notifbot.telegram.sendMessage(eugeneChat, message, {parse_mode: "HTML"});
    }
}

export function SendNotificationWithMedia(notifbot: Telegraf<Context<Update>>, message: string, url: string, type: string){
    switch(type){
        case "photo":
            notifbot.telegram.sendPhoto(devChat, { url: url }, {caption: message, parse_mode: "HTML"});
    
            notifbot.telegram.sendPhoto(confirmationChat, { url: url }, {caption: message, parse_mode: "HTML"});
        
            notifbot.telegram.sendPhoto(supportChat, { url: url }, {caption: message, parse_mode: "HTML"});
        
            notifbot.telegram.sendPhoto(eugeneChat, { url: url }, {caption: message, parse_mode: "HTML"});
            break;

        case "document":
            notifbot.telegram.sendDocument(devChat, { url: url }, {caption: message, parse_mode: "HTML"});
    
            notifbot.telegram.sendDocument(confirmationChat, { url: url }, {caption: message, parse_mode: "HTML"});
        
            notifbot.telegram.sendDocument(supportChat, { url: url }, {caption: message, parse_mode: "HTML"});
        
            notifbot.telegram.sendDocument(eugeneChat, { url: url }, {caption: message, parse_mode: "HTML"});
            break;

        default:
            throw new Error('Uncorrect parametr in SendNotificationWithMedia(). Parametr type: ' + type);
    }
}